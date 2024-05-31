import path from 'node:path'
import url from 'node:url'

import type { Props } from '@astrojs/starlight/props'
import type { docsSchema } from '@astrojs/starlight/schema'
import type { StarlightPlugin } from '@astrojs/starlight/types'
import type { z } from 'astro/zod'
import yaml from 'yaml'

import { slugifyPath } from './path'

const absoluteLinkRegex = /^https?:\/\//

export function parseFrontmatter(frontmatter: string) {
  return yaml.parse(frontmatter) as StarlightFrontmatter
}

export function getFrontmatterNodeValue(frontmatter: StarlightFrontmatter) {
  return yaml.stringify(frontmatter).trim()
}

export function getDocSlug(docsDir: URL, doc: URL) {
  const docPath = path.relative(url.fileURLToPath(docsDir), url.fileURLToPath(doc))
  const slug = slugifyPath(docPath)

  return slug === 'index' ? '/' : slug.replace(/\/index$/, '')
}

export function addPrefixToSidebarConfig(
  prefix: string,
  sidebar: NonNullable<StarlightSidebarUserConfig>,
): NonNullable<StarlightSidebarUserConfig> {
  return sidebar.map((item) => {
    if ('items' in item) {
      return {
        ...item,
        items: addPrefixToSidebarConfig(prefix, item.items),
      }
    } else if ('autogenerate' in item) {
      return {
        ...item,
        autogenerate: {
          ...item.autogenerate,
          directory: path.posix.join(prefix, item.autogenerate.directory),
        },
      }
    } else if (isAbsoluteSidebarLinkItem(item.link)) {
      return item
    }

    const segments = item.link.split('/')
    segments.splice(1, 0, prefix)

    return {
      ...item,
      link: segments.join('/'),
    }
  })
}

export function getPageSlug(url: URL) {
  return url.pathname.replace(/^\//, '').replace(/\/$/, '')
}

function isAbsoluteSidebarLinkItem(link: string) {
  return absoluteLinkRegex.test(link)
}

type StarlightFrontmatter = z.input<ReturnType<ReturnType<typeof docsSchema>>> & {
  slug?: string
}

export type StarlightUserConfig = Parameters<StarlightPlugin['hooks']['setup']>['0']['config']
export type StarlightSidebarUserConfig = StarlightUserConfig['sidebar']

export type StarlightSidebar = Props['sidebar']
