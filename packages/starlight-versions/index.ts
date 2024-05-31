import type { StarlightPlugin } from '@astrojs/starlight/types'

import { StarlightVersionsConfigSchema, type StarlightVersionsUserConfig } from './libs/config'
import { overrideComponents, throwPluginError } from './libs/plugin'
import { ensureNewVersion, getVersionedSidebar } from './libs/versions'
import { vitePluginStarlightVersions } from './libs/vite'

export type { StarlightVersionsConfig, StarlightVersionsUserConfig } from './libs/config'

// TODO(HiDeoo) docs: aside early prototype
// TODO(HiDeoo) navigation links
// TODO(HiDeoo) search
// TODO(HiDeoo) assets
// TODO(HiDeoo) i18n
// TODO(HiDeoo) i18n fallback
// TODO(HiDeoo) vsc settings to ignore old versions or something?
// TODO(HiDeoo) base
// TODO(HiDeoo) trailing slash?
// TODO(HiDeoo) MDX comment issue when creating a new version (maybe we just need to have a mdx processor?)
// TODO(HiDeoo) outdated version notice
// TODO(HiDeoo) option to redirect to homepage when selecting a version (redirect/behavior)

export default function starlightVersionsPlugin(userConfig: StarlightVersionsUserConfig): StarlightPlugin {
  const parsedConfig = StarlightVersionsConfigSchema.safeParse(userConfig)

  if (!parsedConfig.success) {
    throwPluginError(
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
          throwPluginError(
            error instanceof Error ? error.message : 'An error occurred while creating a new documentation version.',
          )
        }

        try {
          const versionedSidebar = await getVersionedSidebar(config, starlightConfig.sidebar, astroConfig.srcDir)

          updateConfig({
            components: overrideComponents(
              starlightConfig,
              [
                { name: 'ThemeSelect', fallback: 'VersionSelect' },
                { name: 'Sidebar', fallback: 'VersionSidebar' },
              ],
              logger,
            ),
            sidebar: versionedSidebar,
          })
        } catch (error) {
          throwPluginError(
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
