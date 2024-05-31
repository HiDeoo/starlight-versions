import type { StarlightPlugin } from '@astrojs/starlight/types'
import { z } from 'astro/zod'

import { overrideComponent, throwUserError } from './libs/plugin'
import { ensureNewVersion, getVersionedSidebar, VersionSchema } from './libs/versions'
import { vitePluginStarlightVersions } from './libs/vite'

// TODO(HiDeoo) docs: aside early prototype
// TODO(HiDeoo) navigation links
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
      async setup({ addIntegration, astroConfig, config: starlightConfig, logger, updateConfig }) {
        try {
          // TODO(HiDeoo) logs/cli/feedback
          await ensureNewVersion(config, starlightConfig, astroConfig.srcDir)
        } catch (error) {
          throwUserError(
            error instanceof Error ? error.message : 'An error occurred while creating a new documentation version.',
          )
        }

        try {
          const versionedSidebar = await getVersionedSidebar(config, starlightConfig.sidebar, astroConfig.srcDir)

          updateConfig({
            components: {
              ...starlightConfig.components,
              ...overrideComponent(starlightConfig.components, 'ThemeSelect', 'VersionSelect', logger),
              // TODO(HiDeoo) mobile dropdown
            },
            sidebar: versionedSidebar,
          })
        } catch (error) {
          throwUserError(
            error instanceof Error ? error.message : 'An error occurred while generating versioned sidebars.',
          )
        }

        addIntegration({
          name: 'starlight-versions-integration',
          hooks: {
            'astro:config:setup': ({ updateConfig }) => {
              updateConfig({ vite: { plugins: [vitePluginStarlightVersions(config)] } })
            },
          },
        })
      },
    },
  }
}

export type StarlightVersionsUserConfig = z.input<typeof starlightVersionsConfigSchema>
export type StarlightVersionsConfig = z.output<typeof starlightVersionsConfigSchema>
