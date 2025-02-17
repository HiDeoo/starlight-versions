import { defineRouteMiddleware, type StarlightRouteData } from '@astrojs/starlight/route-data'
import starlightConfig from 'virtual:starlight/user-config'
import starlightVersionsConfig from 'virtual:starlight-versions-config'

import { getVersionFromPaginationLink, getVersionFromSlug, getVersionSidebar, type Version } from './libs/versions'

export const onRequest = defineRouteMiddleware((context) => {
  const { starlightRoute } = context.locals
  const { entry, locale, pagination, sidebar } = starlightRoute

  starlightRoute.sidebar = getVersionSidebar(
    getVersionFromSlug(starlightVersionsConfig, starlightConfig, entry.slug),
    sidebar,
  )

  const pageVersion = getVersionFromSlug(starlightVersionsConfig, starlightConfig, entry.slug)

  starlightRoute.pagination.prev = getPaginationLink(locale, pageVersion, pagination.prev)
  starlightRoute.pagination.next = getPaginationLink(locale, pageVersion, pagination.next)
})

function getPaginationLink(locale: string | undefined, currentVersion: Version | undefined, link: PaginationLink) {
  if (!link) return undefined

  const linkVersion = getVersionFromPaginationLink(starlightVersionsConfig, link.href, locale)

  // If the current version is not the same as the link version, remove the link.
  return (currentVersion === undefined && linkVersion === undefined) || currentVersion?.slug === linkVersion?.slug
    ? link
    : undefined
}

type PaginationLink = StarlightRouteData['pagination']['next']
