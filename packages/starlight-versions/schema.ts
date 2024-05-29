import { z } from 'astro/zod'

import type { StarlightSidebarConfig } from './libs/starlight'

export function docsVersionsSchema() {
  return z.object({
    sidebar: z.any().optional(),
  })
}

export interface DocsVersionsConfig {
  sidebar?: StarlightSidebarConfig
}
