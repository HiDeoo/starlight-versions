import { defineRouteMiddleware, type StarlightRouteData } from '@astrojs/starlight/route-data'
import starlightConfig from 'virtual:starlight/user-config'
import starlightVersionsConfig from 'virtual:starlight-versions-config'

import { getSidebarLinks } from './libs/starlight'
import {
  addExcludedLinksToVersionSidebar,
  getCanonicalSlug,
  getVersionFromPaginationLink,
  getVersionFromSlug,
  getVersionSidebar,
  isSlugExcludedFromVersion,
  type Version,
} from './libs/versions'

export const onRequest = defineRouteMiddleware((context) => {
  const { starlightRoute } = context.locals
  const { entry, locale, sidebar } = starlightRoute

  const pageVersion = getVersionFromSlug(starlightVersionsConfig, starlightConfig, entry.id)
  const versionSidebar = getVersionSidebar(pageVersion, sidebar)

  if (pageVersion) {
    const excludedSlugs = starlightVersionsConfig.excludedSlugsByVersion[pageVersion.slug] ?? []
    if (excludedSlugs.length > 0) {
      addExcludedLinksToVersionSidebar(
        getVersionSidebar(undefined, sidebar),
        versionSidebar,
        pageVersion,
        excludedSlugs,
        context.url,
      )
      starlightRoute.pagination = getPaginationFromSidebar(starlightRoute, versionSidebar)
    }
  }

  starlightRoute.sidebar = versionSidebar

  starlightRoute.pagination.prev = getPaginationLink(context.url, locale, pageVersion, starlightRoute.pagination.prev)
  starlightRoute.pagination.next = getPaginationLink(context.url, locale, pageVersion, starlightRoute.pagination.next)
})

function getPaginationLink(
  baseURL: URL,
  locale: string | undefined,
  currentVersion: Version | undefined,
  link: PaginationLink,
) {
  if (!link) return undefined

  const linkVersion = getVersionFromPaginationLink(starlightVersionsConfig, link.href, locale)
  const canonicalSlug = getCanonicalSlug(starlightVersionsConfig, starlightConfig, new URL(link.href, baseURL))

  // If the current version is not the same as the link version and it's not an excluded version link, remove it.
  return (currentVersion === undefined && linkVersion === undefined) ||
    currentVersion?.slug === linkVersion?.slug ||
    (linkVersion === undefined && isSlugExcludedFromVersion(starlightVersionsConfig, currentVersion, canonicalSlug))
    ? link
    : undefined
}

// https://github.com/withastro/starlight/blob/main/packages/starlight/utils/navigation.ts#L481
function getPaginationFromSidebar(
  route: StarlightRouteData,
  sidebar: StarlightRouteData['sidebar'],
): StarlightRouteData['pagination'] {
  const entries = getSidebarLinks(sidebar)
  const currentIndex = entries.findIndex((entry) => entry.isCurrent)

  const prev = applyPaginationConfig(
    entries[currentIndex - 1],
    starlightConfig.pagination,
    route.entry.data.prev,
    route.pagination.prev,
  )
  const next = applyPaginationConfig(
    currentIndex > -1 ? entries[currentIndex + 1] : undefined,
    starlightConfig.pagination,
    route.entry.data.next,
    route.pagination.next,
  )

  return { prev, next }
}

// https://github.com/withastro/starlight/blob/main/packages/starlight/utils/navigation.ts#L501
function applyPaginationConfig(
  link: PaginationLink,
  paginationEnabled: boolean,
  config: StarlightRouteData['entry']['data']['prev'],
  existing: PaginationLink,
): PaginationLink {
  // Explicitly remove the link.
  if (config === false) return undefined
  // Use the generated link if any.
  else if (config === true) return link
  // If a link exists, update its label if needed.
  else if (typeof config === 'string' && link) {
    return { ...link, label: config }
  } else if (typeof config === 'object') {
    if (link) {
      // If a link exists, update both its label and href if needed.
      return {
        ...link,
        label: config.label ?? link.label,
        href: config.link ?? link.href,
        // Explicitly remove sidebar link attributes for prev/next links.
        attrs: {},
      }
    } else if (config.link && config.label) {
      // If there is no link and the frontmatter contains both a URL and a label, use it.
      return existing
    }
  }

  // Otherwise, if the global config is enabled, return the generated link if any.
  return paginationEnabled ? link : undefined
}

type PaginationLink = StarlightRouteData['pagination']['next']
