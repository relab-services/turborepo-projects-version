import { getExecOutput } from '@actions/exec'
import { readFileSync, existsSync } from 'fs'
import * as core from '@actions/core'
import * as cache from '@actions/cache'
import { join } from 'path'
import { homedir } from 'os'

type TurboQueryResult = {
  packageManager: string
  packages: {
    count: number
    items: Array<{
      name: string
      path: string
    }>
  }
}

/** * Retrieves the version of Turborepo specified in the root package.json.
 *
 * @returns {string | undefined} The version of Turborepo if found in devDependencies or dependencies, otherwise undefined.
 * @throws {Error} If the package.json cannot be read or parsed.
 */
export const getTurboVersion = (): string | undefined => {
  try {
    if (!existsSync('package.json')) return undefined
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8'))
    return (packageJson.devDependencies?.turbo ||
      packageJson.dependencies?.turbo) as string | undefined
  } catch {
    throw new Error('Failed to fetch package.json in repo root folder')
  }
}

/**
 * Ensures turbo binary is available by caching the npx cache directory.
 * This avoids repeated downloads of the turbo package across workflow runs.
 *
 * @param {string} turboVersion - The version of Turborepo to use (e.g., "2.5.8").
 * @returns {Promise<void>}
 */
const ensureTurboCache = async (turboVersion: string): Promise<void> => {
  const cacheKey = `npx-turbo-${turboVersion}-${process.platform}-${process.arch}`
  const npxCachePath = join(homedir(), '.npm', '_npx')

  core.info(`🔍 Looking for cached turbo@${turboVersion} in npx cache...`)

  try {
    // Try to restore the npx cache
    const cacheHit = await cache.restoreCache([npxCachePath], cacheKey)

    if (cacheHit) {
      core.info(`✅ Restored npx cache for turbo@${turboVersion}`)
      return
    }
  } catch (error) {
    core.warning(`Cache restore failed: ${error}`)
  }

  core.info(
    `📥 No cache found, turbo@${turboVersion} will be downloaded on first use`
  )

  // Pre-download turbo to populate the npx cache
  try {
    core.info(`⬇️ Pre-downloading turbo@${turboVersion} to populate cache...`)
    const downloadOutput = await getExecOutput(
      'npx',
      [`turbo@${turboVersion}`, '--version'],
      { silent: true }
    )

    if (downloadOutput.exitCode === 0) {
      core.info(`✅ turbo@${turboVersion} downloaded successfully`)

      // Save the npx cache for future runs
      try {
        await cache.saveCache([npxCachePath], cacheKey)
        core.info(`💾 Cached npx turbo@${turboVersion} for future runs`)
      } catch (error) {
        core.warning(`Failed to save cache: ${error}`)
      }
    }
  } catch (error) {
    core.warning(`Failed to pre-download turbo: ${error}`)
  }
}

/**
 * Executes the Turborepo CLI to list all packages in the monorepo.
 * Uses caching to speed up subsequent runs by avoiding repeated turbo downloads.
 *
 * @returns {Promise<Array<{ name: string; path: string }>>} A promise that resolves to an array of package objects, each containing the package name and path.
 * @throws {Error} If the command fails to execute or the output is not valid JSON.
 */
export const getTurboPackages = async () => {
  const turboVersion = getTurboVersion()
  if (!turboVersion) throw new Error('Repo does not have Turborepo installed')

  core.info(`🚀 Resolved Turborepo: ${turboVersion}`)

  // Ensure turbo is cached to speed up execution
  await ensureTurboCache(turboVersion)

  try {
    const output = await getExecOutput(
      'npx',
      [`turbo@${turboVersion}`, 'ls', '--output=json'],
      {
        silent: true
      }
    )

    if (output.exitCode !== 0)
      throw new Error(`Failed to get turbo packages: ${output.stderr}`)

    const json = output.stdout.match(/\{[\s\S]*\}/)
    if (!json) throw new Error('Turbo output is not valid JSON')

    const result: TurboQueryResult = JSON.parse(json[0])
    core.info(
      `🚀 Found ${result.packages.items.length} turbo package(s): ${result.packages.items.map((item) => item.name).join(', ')}`
    )
    return result.packages.items
  } catch {
    throw new Error('Failed to retrieve turbo packages')
  }
}
