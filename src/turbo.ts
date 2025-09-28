import { getExecOutput } from '@actions/exec'
import { readFileSync, existsSync } from 'fs'
import * as core from '@actions/core'

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
 * Executes the Turborepo CLI to list all packages in the monorepo.
 *
 * @param {string} turboVersion - The version of Turborepo to use (e.g., "2.5.8").
 * @returns {Promise<Array<{ name: string; path: string }>>} A promise that resolves to an array of package objects, each containing the package name and path.
 * @throws {Error} If the command fails to execute or the output is not valid JSON.
 */
export const getTurboPackages = async () => {
  const turboVersion = getTurboVersion()
  if (!turboVersion) throw new Error('Repo does not have Turborepo installed')

  core.info(`🚀 Resolved Turborepo: ${turboVersion}`)

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
