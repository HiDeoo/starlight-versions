import type { StarlightPlugin } from '@astrojs/starlight/types'

import { StarlightVersionsConfigSchema, type StarlightVersionsUserConfig } from './libs/config'
import { overrideComponents, throwPluginError } from './libs/plugin'
import { ensureNewVersion, getVersionedSidebar } from './libs/versions'
import { vitePluginStarlightVersions } from './libs/vite'

export type { StarlightVersionsConfig, StarlightVersionsUserConfig } from './libs/config'

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
      async 'config:setup'({
        addIntegration,
        addRouteMiddleware,
        astroConfig,
        command,
        config: starlightConfig,
        logger,
        updateConfig,
      }) {
        if (command !== 'dev' && command !== 'build') return

        try {
          await ensureNewVersion(config, starlightConfig, astroConfig, logger)
        } catch (error) {
          throwPluginError(
            error instanceof Error ? error.message : 'An error occurred while creating a new documentation version.',
          )
        }

        try {
          addRouteMiddleware({ entrypoint: 'starlight-versions/middleware' })

          const versionedSidebar = await getVersionedSidebar(config, starlightConfig.sidebar, astroConfig.srcDir)

          updateConfig({
            components: overrideComponents(
              starlightConfig,
              [
                { name: 'ThemeSelect', fallback: 'VersionSelect' },
                { name: 'Search', fallback: 'VersionSearch' },
                { name: 'PageTitle', fallback: 'VersionNotice' },
                { name: 'Banner', fallback: 'VersionBanner' },
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
