import type { ViteUserConfig } from 'astro'

import type { StarlightVersionsConfig } from '..'

export function vitePluginStarlightVersions(config: StarlightVersionsConfig): VitePlugin {
  const moduleId = 'virtual:starlight-versions-config'
  const resolvedModuleId = `\0${moduleId}`
  const moduleContent = `export default ${JSON.stringify(config)}`

  return {
    name: 'vite-plugin-starlight-versions',
    load(id) {
      return id === resolvedModuleId ? moduleContent : undefined
    },
    resolveId(id) {
      return id === moduleId ? resolvedModuleId : undefined
    },
  }
}

type VitePlugin = NonNullable<ViteUserConfig['plugins']>[number]
