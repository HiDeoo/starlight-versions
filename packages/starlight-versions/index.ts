import type { StarlightPlugin } from '@astrojs/starlight/types'
import { z } from 'astro/zod'

import { throwUserError } from './libs/plugin'
import { ensureNewVersion, VersionSchema } from './libs/versions'

// TODO(HiDeoo) docs: aside early prototype
// TODO(HiDeoo) search
// TODO(HiDeoo) assets
// TODO(HiDeoo) i18n
// TODO(HiDeoo) i18n fallback
// TODO(HiDeoo) vsc settings to ignore old versions or something?
// TODO(HiDeoo) base
// TODO(HiDeoo) trailing slash?
// TODO(HiDeoo) MDX comment issue when creating a new version

const starlightVersionsConfigSchema = z.object({
  // TODO(HiDeoo) comment
  versions: z.array(VersionSchema).refine((value) => value.length > 0, {
    // TODO(HiDeoo)
    message: 'At least one version must be defined.',
  }),
  // TODO(HiDeoo) Add all versions to the schema so it's easier to use it
})

export default function starlightVersionsPlugin(userConfig: StarlightVersionsUserConfig): StarlightPlugin {
  const parsedConfig = starlightVersionsConfigSchema.safeParse(userConfig)

  if (!parsedConfig.success) {
    throwUserError(
      `The provided plugin configuration is invalid.\n${parsedConfig.error.issues.map((issue) => issue.message).join('\n')}`,
    )
  }

  const config = parsedConfig.data

  return {
    name: 'starlight-versions-plugin',
    hooks: {
      async setup({ astroConfig, config: starlightConfig }) {
        try {
          await ensureNewVersion(config, starlightConfig, astroConfig.srcDir)
        } catch (error) {
          throwUserError(
            error instanceof Error ? error.message : 'An error occurred while creating a new documentation version.',
          )
        }
      },
    },
  }
}

export type StarlightVersionsUserConfig = z.input<typeof starlightVersionsConfigSchema>
export type StarlightVersionsConfig = z.output<typeof starlightVersionsConfigSchema>
