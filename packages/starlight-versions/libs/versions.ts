import { z } from 'astro/zod'

import type { StarlightVersionsConfig } from '..'

import { copyDirectory, listDirectory } from './fs'
import { ensureTrailingSlash } from './path'
import { throwUserError } from './plugin'

export const VersionSchema = z.object({
  // TODO(HiDeoo) comment
  label: z.string().optional(),
  // TODO(HiDeoo) comment
  slug: z.string(),
})

export async function ensureNewVersion(config: StarlightVersionsConfig, docsDir: URL) {
  const newVersion = await checkForNewVersion(config, docsDir)

  if (!newVersion) return

  const allVersions = new Set(config.versions.map(({ slug }) => slug))

  await copyDirectory(docsDir, new URL(ensureTrailingSlash(newVersion.slug), docsDir), (entry) => {
    if (entry.type === 'directory') {
      return entry.isRoot && allVersions.has(entry.name)
    }

    return ''
  })
}

async function checkForNewVersion(config: StarlightVersionsConfig, docsDir: URL): Promise<Version | undefined> {
  let newVersion: Version | undefined

  const docsDirEntries = await listDirectory(docsDir)
  const docsDirDirectories = new Set(docsDirEntries.filter((entry) => entry.isDirectory()).map((dirent) => dirent.name))

  for (const version of config.versions) {
    if (!docsDirDirectories.has(version.slug)) {
      if (newVersion) {
        throwUserError(
          // TODO(HiDeoo)
          'Only one version can be created at a time.\nPlease make sure to create the version before creating another one.',
        )
      }
      newVersion = version
    }
  }

  return newVersion
}

export type Version = z.output<typeof VersionSchema>
