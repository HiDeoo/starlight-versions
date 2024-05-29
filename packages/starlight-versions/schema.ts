import { z } from 'astro/zod'

export function docsVersionsSchema() {
  return z.object({
    // TODO(HiDeoo) make sure to handle optional
    sidebar: z.any().optional(),
  })
}

export type DocsVersionsConfig = z.output<ReturnType<typeof docsVersionsSchema>>
