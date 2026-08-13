import fs from 'node:fs/promises'
import path from 'node:path'

import type { StarlightConfig } from '@astrojs/starlight/types'
import type { AstroConfig, AstroIntegrationLogger } from 'astro'
import { z } from 'astro/zod'

import type { StarlightVersionsConfig } from '..'
import { docsVersionsSchema, type DocsVersionsConfig } from '../schema'

import {
  copyDirectory,
  copyFile,
  ensureDirectory,
  isDirectoryEntry,
  listDirectory,
  readJSONFile,
  writeJSONFile,
} from './fs'
import { transformMarkdown } from './markdown'
import {
  ensureTrailingSlash,
  getExtension,
  stripExtension,
  stripLeadingAndTrailingSlashes,
  stripTrailingSlash,
} from './path'
import { throwPluginError } from './plugin'
import {
  getDocSlug,
  getDocPath,
  getURLSlug,
  resolveDocSlug,
  type StarlightSidebarUserConfig,
  type StarlightUserConfig,
  addPrefixToSidebarConfig,
  type StarlightSidebar,
  getDocLocale,
} from './starlight'

const currentVersionSidebarGroupLabel = Symbol('StarlightVersionsCurrentVersionSidebarGroupLabel')

export const VersionBaseSchema = z.object({
  /**
   * The version redirect strategy used when navigating to this version:
   *
   * - `same-page`: Redirect to the same page when navigating to this version.
   * - `root`: Redirect to the root page of the documentation when to this version.
   *
   * @default 'same-page'
   */
  redirect: z.union([z.literal('root'), z.literal('same-page')]).default('same-page'),
})

export const VersionSchema = z.object({
  ...VersionBaseSchema.shape,
  /**
   * An optional label used in the UI when displaying the version.
   * If not provided, the version slug is used.
   *
   * @example 'v2.0'
   * @example 'v3.1.2'
   */
  label: z.string().optional(),
  /**
   * The version slug used in URLs to identify the version and its content.
   *
   * @example '2.0'
   * @example '3-1-2'
   */
  slug: z.string().refine((value) => stripLeadingAndTrailingSlashes(value)),
})

export async function ensureNewVersion(
  config: StarlightVersionsConfig,
  starlightConfig: StarlightUserConfig,
  astroConfig: AstroConfig,
  logger: AstroIntegrationLogger,
) {
  const docsDir = new URL('content/docs/', astroConfig.srcDir)
  const newVersion = await checkForNewVersion(config, docsDir)
  const locales = Object.keys(starlightConfig.locales ?? {})

  if (!newVersion) return

  const excludedDocs = await getExcludedDocs(
    config,
    locales.filter((locale) => locale !== 'root'),
    docsDir,
  )
  const excludedSlugs = [...excludedDocs.values()].toSorted()

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

    if (excludedDocs.has(getDocPath(docsDir, entry.url))) return false

    const slug = getDocSlug(docsDir, entry.url)

    const md = await transformMarkdown(entry.content, {
      assets: [],
      base: stripTrailingSlash(astroConfig.base),
      excludedSlugs,
      locale: getDocLocale(slug, starlightConfig),
      publicDir: astroConfig.publicDir,
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

  await makeVersionConfig(newVersion, starlightConfig, astroConfig.srcDir, excludedSlugs)

  logger.info(`Created new version '${newVersion.slug}'.`)
}

export async function getVersionedSidebar(
  config: StarlightVersionsConfig,
  currentSidebar: StarlightSidebarUserConfig,
  srcDir: URL,
): Promise<NonNullable<StarlightSidebarUserConfig>> {
  const sidebar: StarlightSidebarUserConfig = [
    {
      label: currentVersionSidebarGroupLabel.toString(),
      items: currentSidebar ?? [],
    },
  ]

  const excludedSlugsByVersion: Record<string, string[]> = {}

  for (const version of config.versions) {
    const versionConfig = await getVersionConfig(version, srcDir)
    const excludedSlugs = versionConfig.excluded

    excludedSlugsByVersion[version.slug] = excludedSlugs

    sidebar.push({
      label: version.slug,
      items: versionConfig.sidebar
        ? addPrefixToSidebarConfig(version.slug, versionConfig.sidebar, excludedSlugs)
        : [{ autogenerate: { directory: version.slug } }],
    })
  }

  config.excludedSlugsByVersion = excludedSlugsByVersion

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
  const canonicalSlug = getCanonicalSlug(config, starlightConfig, url)

  if (version && isSlugExcludedFromVersion(config, version, canonicalSlug)) {
    return getVersionURL(
      { ...config, current: { ...config.current, redirect: 'same-page' } },
      starlightConfig,
      url,
      undefined,
    )
  }

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

export function getCanonicalSlug(config: StarlightVersionsConfig, starlightConfig: StarlightConfig, url: URL) {
  const slug = getURLSlug(url)
  const version = getVersionFromSlug(config, starlightConfig, slug)
  return version ? stripVersionSegment(slug, version.slug) : slug
}

export function isSlugExcludedFromVersion(config: StarlightVersionsConfig, version: Version | undefined, slug: string) {
  return version ? (config.excludedSlugsByVersion[version.slug]?.includes(slug) ?? false) : false
}

export function isExcludedDocPath(config: StarlightVersionsConfig, filePath: string) {
  const normalizedPath = filePath.replaceAll('\\', '/')
  const docsRoot = 'content/docs/'
  const docsRootIndex = normalizedPath.indexOf(docsRoot)
  if (docsRootIndex === -1) return false

  const docsPath = normalizedPath.slice(docsRootIndex + docsRoot.length)

  return config.exclude.some((excludeGlob) => path.posix.matchesGlob(docsPath, excludeGlob))
}

export function getPagefindVersionIdentifiers(
  config: StarlightVersionsConfig,
  version: Version | undefined,
  slug: string,
): [string, ...string[]] {
  if (version) return [version.slug]

  return [
    'current',
    ...config.versions
      .filter((archivedVersion) => isSlugExcludedFromVersion(config, archivedVersion, slug))
      .map((archivedVersion) => archivedVersion.slug),
  ]
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

export function addExcludedLinksToVersionSidebar(
  currentSidebar: StarlightSidebar,
  archivedSidebar: StarlightSidebar,
  version: Version,
  excludedSlugs: string[],
  baseURL: URL,
) {
  addExcludedLinksToVersionSidebarEntries(currentSidebar, archivedSidebar, version.slug, excludedSlugs, baseURL)

  return archivedSidebar
}

function addExcludedLinksToVersionSidebarEntries(
  currentSidebar: StarlightSidebar,
  archivedSidebar: StarlightSidebar,
  version: string,
  excludedSlugs: string[],
  baseURL: URL,
) {
  let cursor = 0

  for (const entry of currentSidebar) {
    const archivedIndex = archivedSidebar.findIndex(
      (candidate, index) => index >= cursor && isMatchingSidebarEntry(entry, candidate, version, baseURL),
    )

    if (archivedIndex !== -1) {
      const archivedEntry = archivedSidebar[archivedIndex]

      if (entry.type === 'group' && archivedEntry?.type === 'group') {
        addExcludedLinksToVersionSidebarEntries(entry.entries, archivedEntry.entries, version, excludedSlugs, baseURL)
      }

      cursor = archivedIndex + 1
      continue
    }

    const clone = cloneExcludedSidebarEntry(entry, excludedSlugs, baseURL)
    if (!clone) continue

    archivedSidebar.splice(cursor, 0, clone)
    cursor++
  }
}

function cloneExcludedSidebarEntry(
  entry: StarlightSidebar[number],
  excludedSlugs: string[],
  baseURL: URL,
): StarlightSidebar[number] | undefined {
  if (!('autogenerate' in entry)) return undefined

  if (entry.type === 'link') {
    const slug = getSidebarSlug(entry.href, baseURL)
    if (!excludedSlugs.includes(slug)) return undefined
    return { ...entry, isCurrent: false }
  }

  const entries = entry.entries.flatMap((child) => {
    const clone = cloneExcludedSidebarEntry(child, excludedSlugs, baseURL)
    return clone ? [clone] : []
  })

  return entries.length > 0 ? { ...entry, entries } : undefined
}

function isMatchingSidebarEntry(
  current: StarlightSidebar[number],
  archived: StarlightSidebar[number],
  version: string,
  baseURL: URL,
) {
  if (current.type !== archived.type) return false
  if (current.type === 'link' && archived.type === 'link') {
    return getSidebarSlug(current.href, baseURL) === getSidebarSlug(archived.href, baseURL, version)
  }
  if (current.type !== 'group' || archived.type !== 'group') return false

  const currentAuto = 'autogenerate' in current
  const archivedAuto = 'autogenerate' in archived
  if (currentAuto !== archivedAuto || current.label !== archived.label) return false
  if (!currentAuto || !archivedAuto) return true

  return current.autogenerate.directory === stripVersionSegment(archived.autogenerate.directory, version)
}

function getSidebarSlug(href: string, baseURL: URL, version?: string) {
  const slug = getURLSlug(new URL(href, baseURL))
  return version ? stripVersionSegment(slug, version) : slug
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

async function getVersionConfig(version: Version, srcDir: URL) {
  try {
    return docsVersionsSchema().parse(
      await readJSONFile<Partial<DocsVersionsConfig>>(getVersionConfigURL(version, srcDir)),
    )
  } catch (error) {
    throw new Error(`Failed to read the version '${version.slug}' configuration file.`, { cause: error })
  }
}

async function getExcludedDocs(config: StarlightVersionsConfig, locales: string[], docsDir: URL) {
  const excludedDocs = new Map<string, string>()

  async function visitDirectory(directory: URL) {
    for (const entry of await listDirectory(directory)) {
      const isDirectory = await isDirectoryEntry(entry)
      const entryURL = new URL(isDirectory ? ensureTrailingSlash(entry.name) : entry.name, directory)
      const docPath = getDocPath(docsDir, entryURL)

      if (isDirectory) {
        const [firstSegment, secondSegment] = docPath.split('/')

        if (
          (firstSegment && firstSegment in config.versionsBySlug) ||
          (firstSegment && locales.includes(firstSegment) && secondSegment && secondSegment in config.versionsBySlug)
        ) {
          continue
        }

        await visitDirectory(entryURL)

        continue
      }

      if (!entry.isFile() || !config.exclude.some((excludeGlob) => path.posix.matchesGlob(docPath, excludeGlob))) {
        continue
      }

      excludedDocs.set(docPath, resolveDocSlug(docsDir, entryURL, await fs.readFile(entryURL, 'utf8')))
    }
  }

  await visitDirectory(docsDir)

  return excludedDocs
}

async function checkForNewVersion(config: StarlightVersionsConfig, docsDir: URL): Promise<Version | undefined> {
  let newVersion: Version | undefined

  const docsDirEntries = await listDirectory(docsDir)
  const docsDirDirectories = new Set<string>()

  for (const entry of docsDirEntries) {
    if (await isDirectoryEntry(entry)) {
      docsDirDirectories.add(entry.name)
    }
  }

  for (const version of config.versions) {
    if (!docsDirDirectories.has(version.slug)) {
      if (newVersion) {
        throw new Error('Only one new version can be configured at a time.')
      }
      newVersion = version
    }
  }

  return newVersion
}

async function makeVersionConfig(
  version: Version,
  starlightConfig: StarlightUserConfig,
  srcDir: URL,
  excludedSlugs: string[],
) {
  const versionsDir = getVersionContentCollectionURL(srcDir)

  await ensureDirectory(versionsDir)
  await writeJSONFile(getVersionConfigURL(version, srcDir), {
    sidebar: starlightConfig.sidebar,
    excluded: excludedSlugs,
  } satisfies DocsVersionsConfig)
}

function getVersionContentCollectionURL(srcDir: URL) {
  return new URL('content/versions/', srcDir)
}

function getVersionConfigURL(version: Version, srcDir: URL) {
  return new URL(`${version.slug}.json`, getVersionContentCollectionURL(srcDir))
}

function stripVersionSegment(route: string, version: string) {
  const segments = route.split('/')
  const index = segments.indexOf(version)
  if (index !== -1) segments.splice(index, 1)
  return segments.join('/')
}

export type Version = z.output<typeof VersionSchema>

export interface VersionAsset {
  source: URL
  dest: URL
}
