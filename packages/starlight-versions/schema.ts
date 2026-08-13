import { z } from 'astro/zod'

import type { StarlightSidebarUserConfig } from './libs/starlight'

export function docsVersionsSchema() {
  return z.object({
    sidebar: z.custom<NonNullable<StarlightSidebarUserConfig>>().optional(),
    excluded: z.array(z.string()).default([]),
  })
}

export interface DocsVersionsConfig {
  sidebar?: StarlightSidebarUserConfig
  excluded: string[]
}
