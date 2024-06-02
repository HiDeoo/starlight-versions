import type { StarlightConfig } from '@astrojs/starlight/types'
import { z } from 'astro/zod'

import type { StarlightVersionsConfig } from '..'
import type { DocsVersionsConfig } from '../schema'

import { copyDirectory, copyFile, ensureDirectory, listDirectory, readJSONFile, writeJSONFile } from './fs'
import { transformMarkdown } from './markdown'
import { ensureTrailingSlash, getExtension, stripExtension, stripLeadingSlash, stripTrailingSlash } from './path'
import { throwPluginError } from './plugin'
import {
  getDocSlug,
  type StarlightSidebarUserConfig,
  type StarlightUserConfig,
  addPrefixToSidebarConfig,
  type StarlightSidebar,
  getDocLocale,
} from './starlight'

const currentVersionSidebarGroupLabel = Symbol('StarlightVersionsCurrentVersionSidebarGroupLabel')

export const VersionBaseSchema = z.object({
  // TODO(HiDeoo) comment
  redirect: z.union([z.literal('root'), z.literal('same-page')]).default('same-page'),
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
  const locales = Object.keys(starlightConfig.locales ?? {})

  if (!newVersion) return

  const assets: VersionAsset[] = []

  await copyDirectory(docsDir, new URL(ensureTrailingSlash(newVersion.slug), docsDir), async (entry) => {
    if (entry.type === 'directory') {
      if (!entry.isRoot) {
        const segments = entry.source.pathname.split('/')
        const lastSegment = segments.at(-2)
        const secondLastSegment = segments.at(-3)

        if (secondLastSegment && lastSegment === newVersion.slug && locales.includes(secondLastSegment)) {
          // Skip version directories in a locale directory.
          return true
        }

        // Do not skip other non-root directories.
        return false
      }

      // Skip root version directories.
      if (entry.name in config.versionsBySlug) return true

      const localeDir = locales.find((locale) => locale === entry.name)

      // Copy root directories not matching any locale.
      if (!localeDir) return false

      // Otherwise, swap the locale and version directories.
      return new URL(`../../${localeDir}/${newVersion.slug}/`, entry.dest)
    }

    const slug = getDocSlug(docsDir, entry.url)

    const md = await transformMarkdown(entry.content, {
      assets: [],
      locale: getDocLocale(slug, starlightConfig),
      slug,
      url: entry.url,
      version: newVersion,
    })

    assets.push(...(md.assets ?? []))

    return md.content
  })

  for (const asset of assets) {
    await copyFile(asset.source, asset.dest)
  }

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
export function getVersionURL(
  config: StarlightVersionsConfig,
  starlightConfig: StarlightConfig,
  url: URL,
  version: Version | undefined,
): URL {
  const versionURL = new URL(url)
  const versionSlug = version?.slug ?? ''
  const versionRedirect = version?.redirect ?? config.current.redirect

  const base = stripTrailingSlash(import.meta.env.BASE_URL)
  const hasBase = versionURL.pathname.startsWith(base)

  if (hasBase) {
    versionURL.pathname = versionURL.pathname.replace(base, '')
  }

  let baseSegment: string | undefined
  let localeSegment: string | undefined

  const isHTML = getExtension(versionURL.pathname) === '.html'
  const [, firstSegment, secondSegment] = versionURL.pathname.split('/')

  if (starlightConfig.isMultilingual || starlightConfig.locales) {
    const versionOrLocale = firstSegment?.replace('.html', '')
    const isRootLocale = versionOrLocale && !Object.keys(starlightConfig.locales).includes(versionOrLocale)
    baseSegment = isRootLocale ? firstSegment : secondSegment

    if (!isRootLocale) {
      localeSegment = versionOrLocale
      versionURL.pathname = versionURL.pathname.replace(`/${firstSegment}`, '')
    }
  } else {
    baseSegment = firstSegment
  }

  const isRootHTML = baseSegment && getExtension(baseSegment) === '.html'
  const baseSlug = baseSegment && isRootHTML ? stripExtension(baseSegment) : baseSegment

  if (baseSlug && baseSlug in config.versionsBySlug) {
    if (versionSlug) {
      versionURL.pathname =
        versionRedirect === 'same-page'
          ? versionURL.pathname.replace(baseSlug, versionSlug)
          : `${versionSlug}${isHTML ? '.html' : '/'}`
    } else if (isRootHTML) {
      versionURL.pathname = '/index.html'
    } else {
      versionURL.pathname =
        versionRedirect === 'same-page' ? versionURL.pathname.replace(`/${baseSlug}`, '') : isHTML ? '/index.html' : '/'
    }
  } else if (versionSlug) {
    versionURL.pathname =
      baseSegment === 'index.html'
        ? `/${versionSlug}.html`
        : versionRedirect === 'same-page'
          ? `/${versionSlug}${versionURL.pathname}`
          : isHTML
            ? `${versionSlug}.html`
            : `/${versionSlug}/`
  } else if (versionRedirect === 'root' && !isRootHTML) {
    versionURL.pathname = isHTML ? '/index.html' : versionSlug
  }

  if (localeSegment) {
    versionURL.pathname = isHTML
      ? versionURL.pathname === '/index.html'
        ? `/${localeSegment}.html`
        : `/${localeSegment}${versionURL.pathname.replace(/\/$/, '.html')}`
      : `/${localeSegment}${versionURL.pathname}`
  }

  if (hasBase) {
    versionURL.pathname = base + versionURL.pathname
  }

  return versionURL
}

// An undefined version is valid and represents the current version.
export function getVersionFromSlug(
  config: StarlightVersionsConfig,
  starlightConfig: StarlightConfig,
  slug: string,
): Version | undefined {
  const segments = slug.split('/')

  const versionOrLocaleSegment = segments[0]

  if (!versionOrLocaleSegment) return undefined

  const version = config.versions.find((version) => version.slug === versionOrLocaleSegment)

  if (version) return version

  const locales = Object.keys(starlightConfig.locales ?? {})

  if (!locales.includes(versionOrLocaleSegment)) return undefined

  const versionSegment = segments[1]

  return config.versions.find((version) => version.slug === versionSegment)
}

// An undefined version is valid and represents the current version.
export function getVersionFromPaginationLink(
  config: StarlightVersionsConfig,
  link: string,
  locale: string | undefined,
): Version | undefined {
  const [, ...segments] = link.split('/')

  if (import.meta.env.BASE_URL !== '/') {
    // Remove the base segment if configured.
    segments.splice(0, 1)
  }

  if (locale) {
    // Remove the locale segment if the current locale is not a root locale.
    segments.splice(0, 1)
  }

  const versionSegment = segments[0]

  if (!versionSegment) return undefined

  return config.versions.find((version) => version.slug === versionSegment)
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

export interface VersionAsset {
  source: URL
  dest: URL
}
