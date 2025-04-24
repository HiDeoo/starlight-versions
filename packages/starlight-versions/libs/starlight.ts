import path from 'node:path'
import url from 'node:url'

import type { StarlightRouteData } from '@astrojs/starlight/route-data'
import type { docsSchema } from '@astrojs/starlight/schema'
import type { HookParameters } from '@astrojs/starlight/types'
import type { z } from 'astro/zod'
import yaml from 'yaml'

import { isAbsoluteLink, slugifyPath } from './path'

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

export function getDocLocale(slug: string, starlightConfig: StarlightUserConfig): string | undefined {
  const locales = Object.keys(starlightConfig.locales ?? {})

  if (locales.length === 0) return undefined

  const localeSegment = slug.split('/')[0]

  if (!localeSegment) return undefined

  return locales.find((locale) => locale === localeSegment)
}

export function addPrefixToSidebarConfig(
  prefix: string,
  sidebar: NonNullable<StarlightSidebarUserConfig>,
): NonNullable<StarlightSidebarUserConfig> {
  return sidebar.map((item) => {
    if (typeof item === 'string') {
      return addPrefixToSlug(prefix, item)
    } else if ('items' in item) {
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
    } else if ('slug' in item) {
      return {
        ...item,
        slug: addPrefixToSlug(prefix, item.slug),
      }
    } else if (isAbsoluteLink(item.link)) {
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

function addPrefixToSlug(prefix: string, slug: string) {
  if (slug === '' || slug === 'index') return prefix
  return `${prefix}/${slug}`
}

type StarlightFrontmatter = z.input<ReturnType<ReturnType<typeof docsSchema>>> & {
  slug?: string
  hero?: StarlightFrontmatteHero
}

// Just to simplify type checking when updating the frontmatter,
interface StarlightFrontmatteHero {
  image?: {
    file?: string
    dark?: string
    light?: string
  }
}

export type StarlightUserConfig = HookParameters<'config:setup'>['config']
export type StarlightSidebarUserConfig = StarlightUserConfig['sidebar']

export type StarlightSidebar = StarlightRouteData['sidebar']
