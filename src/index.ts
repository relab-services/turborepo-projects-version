import * as core from '@actions/core'
import { getPackageInfo, ProjectInfo } from './package.js'
import { getTurboPackages } from './turbo.js'

const run = async (): Promise<void> => {
  try {
    const result = await getProjects()
    core.setOutput('projects', JSON.stringify(result))
  } catch (error) {
    core.setFailed(
      `❌ Action failed: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

const getProjects = async (): Promise<TurboProjects> => {
  try {
    const packages = await getTurboPackages()
    core.info(
      `🚀 Found ${packages.length} turbo package(s): ${packages.map((item) => item.name).join(', ')}`
    )

    const result: TurboProjects = {}
    for (const pkg of packages) {
      const packageInfo = getPackageInfo(pkg.path)
      if (!packageInfo) continue

      if (packageInfo.build) {
        if (Array.isArray(packageInfo.build)) {
          // Add project to multiple build groups
          for (const build of packageInfo.build) {
            if (!result[build]) {
              result[build] = []
            }
            result[build].push(packageInfo)
          }
        } else {
          // Add project to single build group
          if (!result[packageInfo.build]) {
            result[packageInfo.build] = []
          }
          result[packageInfo.build].push(packageInfo)
        }
      }
    }

    if (Object.keys(result).length === 0) {
      core.info('⚠️ Nothing to build')
      return result
    }

    core.info(' ')

    for (const [buildType, projects] of Object.entries(result)) {
      core.info(`🟢 ${buildType}`)

      for (const project of projects) {
        const name = project.name || 'N/A'
        const version = project.version || 'N/A'
        const identifier = project.identifier || 'N/A'

        core.info(`🟡 ${name}@${version}: ${project.path} (${identifier})`)
      }

      core.info(' ')
    }

    core.info(
      `🚀 Done: ${Object.keys(result).length} build target(s), ${Object.values(result).reduce((acc, projects) => acc + projects.length, 0)} project(s)`
    )

    return result
  } catch (error) {
    throw new Error(
      `Analysis failed: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

export type TurboProjects = {
  [buildType: string]: ProjectInfo[]
}

run()
