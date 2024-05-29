import type { StarlightPlugin } from '@astrojs/starlight/types'
import { z } from 'astro/zod'

import type { StarlightVersionsConfig } from '..'
import type { DocsVersionsConfig } from '../schema'

import { copyDirectory, ensureDirectory, listDirectory, writeJSONFile } from './fs'
import { transformMarkdown } from './markdown'
import { ensureTrailingSlash, stripLeadingSlash, stripTrailingSlash } from './path'
import { getDocSlug } from './starlight'

export const VersionSchema = z.object({
  // TODO(HiDeoo) comment
  label: z.string().optional(),
  // TODO(HiDeoo) comment
  slug: z.string(),
})

export async function ensureNewVersion(
  config: StarlightVersionsConfig,
  starlightConfig: StarlightUserConfig,
  srcDir: URL,
) {
  const docsDir = new URL('content/docs/', srcDir)
  const newVersion = await checkForNewVersion(config, docsDir)

  if (!newVersion) return

  const allVersions = new Set(config.versions.map(({ slug }) => slug))

  await copyDirectory(docsDir, new URL(ensureTrailingSlash(newVersion.slug), docsDir), async (entry) => {
    if (entry.type === 'directory') {
      return entry.isRoot && allVersions.has(entry.name)
    }

    const md = await transformMarkdown(entry.content, {
      slug: getDocSlug(docsDir, entry.url),
      version: newVersion,
    })

    return md.content
  })

  await makeVersionConfig(newVersion, starlightConfig, srcDir)
}

async function checkForNewVersion(config: StarlightVersionsConfig, docsDir: URL): Promise<Version | undefined> {
  let newVersion: Version | undefined

  const docsDirEntries = await listDirectory(docsDir)
  const docsDirDirectories = new Set(docsDirEntries.filter((entry) => entry.isDirectory()).map((dirent) => dirent.name))

  for (const version of config.versions) {
    if (!docsDirDirectories.has(version.slug)) {
      if (newVersion) {
        throw new Error(
          // TODO(HiDeoo)
          'Only one version can be created at a time.\nPlease make sure to create the version before creating another one.',
        )
      }
      newVersion = { ...version, slug: stripLeadingSlash(stripTrailingSlash(version.slug)) }
    }
  }

  return newVersion
}

async function makeVersionConfig(version: Version, starlightConfig: StarlightUserConfig, srcDir: URL) {
  const versionsDir = getVersionContentCollectionURL(srcDir)

  await ensureDirectory(versionsDir)
  await writeJSONFile(new URL(`${version.slug}.json`, getVersionContentCollectionURL(srcDir)), {
    sidebar: starlightConfig.sidebar,
  } satisfies DocsVersionsConfig)
}

function getVersionContentCollectionURL(srcDir: URL) {
  return new URL('content/versions/', srcDir)
}

export type Version = z.output<typeof VersionSchema>

type StarlightUserConfig = Parameters<StarlightPlugin['hooks']['setup']>['0']['config']
