import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import * as core from '@actions/core'

/**
 * Represents information about a project/package in the monorepo.
 *
 * @property {string} path - The file system path to the project/package.
 * @property {string} [version] - The version of the project/package, if specified in package.json.
 * @property {string} [name] - The name of the project/package, if specified in package.json.
 * @property {string} [identifier] - A normalized identifier derived from the package name.
 * @property {string | string[]} [build] - The build type(s) associated with the project/package, as specified in package.json.
 */
export type ProjectInfo = {
  path: string
  version?: string
  name?: string
  identifier?: string
  build?: string | string[]
}

/**
 * Retrieves package information from a given package path.
 *
 * @param {string} packagePath - The absolute or relative path to the package directory.
 * @returns {ProjectInfo | undefined} An object containing project information such as path, name, version, identifier, and build property,
 *                                    or undefined if package.json does not exist at the specified path.
 * @throws {Error} If the package.json exists but cannot be read or parsed.
 */
export const getPackageInfo = (
  packagePath: string
): ProjectInfo | undefined => {
  const packageJsonPath = resolve(packagePath, 'package.json')
  if (!existsSync(packageJsonPath)) {
    core.warning(`  ❌ No package.json found in ${packagePath}`)
    return undefined
  }

  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))

    const version: string | undefined = packageJson.version
    const packageName: string | undefined = packageJson.name
    const identifier = packageName
      ?.replace(/\W+/g, '-')
      .toLowerCase()
      .replace(/^-+|-+$/g, '')
    const build: string | string[] | undefined = packageJson.build

    return {
      path: packagePath,
      name: packageName,
      version,
      identifier,
      build
    }
  } catch {
    throw new Error(`Failed to retrieve package info: ${packageJsonPath}`)
  }
}
