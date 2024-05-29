import type { docsSchema } from '@astrojs/starlight/schema'
import type { z } from 'astro/zod'
import yaml from 'yaml'

export function parseFrontmatter(frontmatter: string) {
  return yaml.parse(frontmatter) as StarlightFrontmatter
}

export function getFrontmatterNodeValue(frontmatter: StarlightFrontmatter) {
  return yaml.stringify(frontmatter).trim()
}

type StarlightFrontmatter = z.input<ReturnType<ReturnType<typeof docsSchema>>> & {
  slug?: string
}
