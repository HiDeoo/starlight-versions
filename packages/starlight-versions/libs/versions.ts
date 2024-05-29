import { z } from 'astro/zod'

import type { StarlightVersionsConfig } from '..'
import type { DocsVersionsConfig } from '../schema'

import { copyDirectory, ensureDirectory, listDirectory, readJSONFile, writeJSONFile } from './fs'
import { transformMarkdown } from './markdown'
import { ensureTrailingSlash, stripLeadingSlash, stripTrailingSlash } from './path'
import { getDocSlug, type StarlightSidebarConfig, type StarlighConfig, addPrefixToSidebarConfig } from './starlight'

export const VersionSchema = z.object({
  // TODO(HiDeoo) comment
  label: z.string().optional(),
  // TODO(HiDeoo) comment
  slug: z.string().refine((value) => stripLeadingSlash(stripTrailingSlash(value))),
})

export async function ensureNewVersion(config: StarlightVersionsConfig, starlightConfig: StarlighConfig, srcDir: URL) {
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

export async function getVersionedSidebar(
  config: StarlightVersionsConfig,
  currentSidebar: StarlightSidebarConfig,
  srcDir: URL,
): Promise<NonNullable<StarlightSidebarConfig>> {
  const sidebar = [
    {
      // TODO(HiDeoo) use a symbol
      label: 'latest',
      // TODO(HiDeoo) undefined (we may need to autogen everything and filter in the override component)
      items: currentSidebar ?? [],
    },
  ]

  for (const version of config.versions) {
    const versionSidebar = await getSidebarVersionGroup(version, srcDir)
    sidebar.push(versionSidebar)
  }

  return sidebar
}

async function getSidebarVersionGroup(version: Version, srcDir: URL) {
  const versionConfig = await getVersionConfig(version, srcDir)

  return {
    label: version.slug,
    // TODO(HiDeoo) handle undefined
    items: versionConfig.sidebar ? addPrefixToSidebarConfig(version.slug, versionConfig.sidebar) : [],
  }
}

async function getVersionConfig(version: Version, srcDir: URL) {
  try {
    return await readJSONFile<DocsVersionsConfig>(getVersionConfigURL(version, srcDir))
  } catch (error) {
    throw new Error(`Failed to read the version '${version.slug}' configuration file.`, { cause: error })
  }
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
      newVersion = version
    }
  }

  return newVersion
}

async function makeVersionConfig(version: Version, starlightConfig: StarlighConfig, srcDir: URL) {
  const versionsDir = getVersionContentCollectionURL(srcDir)

  await ensureDirectory(versionsDir)
  await writeJSONFile(getVersionConfigURL(version, srcDir), {
    sidebar: starlightConfig.sidebar,
  } satisfies DocsVersionsConfig)
}

function getVersionContentCollectionURL(srcDir: URL) {
  return new URL('content/versions/', srcDir)
}

function getVersionConfigURL(version: Version, srcDir: URL) {
  return new URL(`${version.slug}.json`, getVersionContentCollectionURL(srcDir))
}

export type Version = z.output<typeof VersionSchema>
