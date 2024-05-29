import { z } from 'astro/zod'

import type { StarlightVersionsConfig } from '..'

import { copyDirEntry, ensureDirectory, listDirectory, type DirEntries } from './fs'
import { throwUserError } from './plugin'

export const VersionSchema = z.object({
  // TODO(HiDeoo) comment
  label: z.string().optional(),
  // TODO(HiDeoo) comment
  slug: z.string(),
})

export async function ensureNewVersion(config: StarlightVersionsConfig, docsDir: URL) {
  const docsDirEntries = await listDirectory(docsDir)
  const newVersion = checkForNewVersion(config, docsDirEntries)

  if (!newVersion) return

  // TODO(HiDeoo)
  const allVersions = new Set(config.versions.map(({ slug }) => slug))
  const newVersionDir = new URL(newVersion.slug, docsDir)
  const newVersionDirEntries = docsDirEntries.filter((content) => !allVersions.has(content.name))

  await ensureDirectory(newVersionDir)

  for (const entry of newVersionDirEntries) {
    // TODO(HiDeoo) Add/update slug in frontmatter
    // TODO(HiDeoo) Refactor to transform links, images, etc. (check obsidian?)
    await copyDirEntry(entry, docsDir, newVersionDir)
  }
}

function checkForNewVersion(config: StarlightVersionsConfig, docsDirEntries: DirEntries): Version | undefined {
  let newVersion: Version | undefined

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
