import { z } from 'astro/zod'

import type { StarlightVersionsConfig } from '..'
import type { DocsVersionsConfig } from '../schema'

import { copyDirectory, ensureDirectory, listDirectory, readJSONFile, writeJSONFile } from './fs'
import { transformMarkdown } from './markdown'
import { ensureTrailingSlash, getExtension, stripExtension, stripLeadingSlash, stripTrailingSlash } from './path'
import { throwPluginError } from './plugin'
import {
  getDocSlug,
  type StarlightSidebarUserConfig,
  type StarlightUserConfig,
  addPrefixToSidebarConfig,
  type StarlightSidebar,
} from './starlight'

const currentVersionSidebarGroupLabel = Symbol('StarlightVersionsCurrentVersionSidebarGroupLabel')

export const VersionBaseSchema = z.object({
  // TODO(HiDeoo) comment
  redirect: z.union([z.literal('home'), z.literal('same-page')]).default('same-page'),
})

export const VersionSchema = z
  .object({
    // TODO(HiDeoo) comment
    label: z.string().optional(),
    // TODO(HiDeoo) comment
    slug: z.string().refine((value) => stripLeadingSlash(stripTrailingSlash(value))),
  })
  .merge(VersionBaseSchema)

export async function ensureNewVersion(
  config: StarlightVersionsConfig,
  starlightConfig: StarlightUserConfig,
  srcDir: URL,
) {
  const docsDir = new URL('content/docs/', srcDir)
  const newVersion = await checkForNewVersion(config, docsDir)

  if (!newVersion) return

  await copyDirectory(docsDir, new URL(ensureTrailingSlash(newVersion.slug), docsDir), async (entry) => {
    if (entry.type === 'directory') {
      return entry.isRoot && entry.name in config.versionsBySlug
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
  currentSidebar: StarlightSidebarUserConfig,
  srcDir: URL,
): Promise<NonNullable<StarlightSidebarUserConfig>> {
  const sidebar = [
    {
      label: currentVersionSidebarGroupLabel.toString(),
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

// A version is considered as the current version if it's undefined.
export function getVersionSidebar(version: Version | undefined, sidebar: StarlightSidebar): StarlightSidebar {
  const sidebarVersionGroup = sidebar.find(
    (item) => item.label === (version?.slug ?? currentVersionSidebarGroupLabel.toString()),
  )

  if (!sidebarVersionGroup || !('entries' in sidebarVersionGroup)) {
    throwPluginError(
      `Failed to find a sidebar group for the ${version ? `version '${version.slug}'` : 'current version'}.`,
    )
  }

  return sidebarVersionGroup.entries
}

// An undefined version is valid and represents the current version.
// https://github.com/withastro/starlight/blob/64288fb0051310f7148afd13f65c578664f04eb2/packages/starlight/utils/localizedUrl.ts
export function getVersionURL(config: StarlightVersionsConfig, url: URL, version: Version | undefined): URL {
  const versionURL = new URL(url)
  const versionSlug = version?.slug ?? ''

  // TODO(HiDeoo)
  const base = stripTrailingSlash(import.meta.env.BASE_URL)
  const hasBase = versionURL.pathname.startsWith(base)

  if (hasBase) {
    versionURL.pathname = versionURL.pathname.replace(base, '')
  }

  const [, baseSegment] = versionURL.pathname.split('/')

  const isRootHTML = baseSegment && getExtension(baseSegment) === '.html'
  const baseSlug = isRootHTML ? stripExtension(baseSegment) : baseSegment

  if (baseSlug && baseSlug in config.versionsBySlug) {
    if (versionSlug) {
      versionURL.pathname = versionURL.pathname.replace(baseSlug, versionSlug)
    } else if (isRootHTML) {
      versionURL.pathname = '/index.html'
    } else {
      versionURL.pathname = versionURL.pathname.replace(`/${baseSlug}`, '')
    }
  } else if (versionSlug) {
    versionURL.pathname =
      baseSegment === 'index.html' ? `/${versionSlug}.html` : `/${versionSlug}${versionURL.pathname}`
  }

  if (hasBase) {
    versionURL.pathname = base + versionURL.pathname
  }

  return versionURL
}

// An undefined version is valid and represents the current version.
export function getVersionFromSlug(config: StarlightVersionsConfig, slug: string): Version | undefined {
  return config.versions.find((version) => slug === version.slug || slug.startsWith(`${version.slug}/`))
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

async function makeVersionConfig(version: Version, starlightConfig: StarlightUserConfig, srcDir: URL) {
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
