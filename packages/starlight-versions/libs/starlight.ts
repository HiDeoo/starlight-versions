import path from 'node:path'
import url from 'node:url'

import type { docsSchema } from '@astrojs/starlight/schema'
import type { z } from 'astro/zod'
import yaml from 'yaml'

import { ensureLeadingSlash, ensureTrailingSlash, slugifyPath } from './path'

export function parseFrontmatter(frontmatter: string) {
  return yaml.parse(frontmatter) as StarlightFrontmatter
}

export function getFrontmatterNodeValue(frontmatter: StarlightFrontmatter) {
  return yaml.stringify(frontmatter).trim()
}

export function getDocSlug(docsDir: URL, doc: URL) {
  const docPath = path.relative(url.fileURLToPath(docsDir), url.fileURLToPath(doc))
  const slug = slugifyPath(docPath)

  return ensureLeadingSlash(ensureTrailingSlash(slug === 'index' ? '/' : slug.replace(/\/index$/, '')))
}

type StarlightFrontmatter = z.input<ReturnType<ReturnType<typeof docsSchema>>> & {
  slug?: string
}
