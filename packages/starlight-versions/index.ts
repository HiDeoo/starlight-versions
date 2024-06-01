import type { StarlightPlugin } from '@astrojs/starlight/types'

import { StarlightVersionsConfigSchema, type StarlightVersionsUserConfig } from './libs/config'
import { overrideComponents, throwPluginError } from './libs/plugin'
import { ensureNewVersion, getVersionedSidebar } from './libs/versions'
import { vitePluginStarlightVersions } from './libs/vite'

export type { StarlightVersionsConfig, StarlightVersionsUserConfig } from './libs/config'

// TODO(HiDeoo) docs: aside early prototype
// TODO(HiDeoo) navigation links
// TODO(HiDeoo) frontmatter paths/links
// TODO(HiDeoo) search
// TODO(HiDeoo) assets/paths/links
// TODO(HiDeoo) outdated version notice (notice on splash page)

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
      async setup({ addIntegration, astroConfig, command, config: starlightConfig, logger, updateConfig }) {
        if (command !== 'dev' && command !== 'build') return

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
