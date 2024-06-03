import type { AstroIntegrationLogger } from 'astro'
import { AstroError } from 'astro/errors'

import type { StarlightUserConfig } from './starlight'

export function throwPluginError(message: string): never {
  throw new AstroError(
    message,
    `See the error report above for more informations.\n\nIf you believe this is a bug, please file an issue at https://github.com/HiDeoo/starlight-versions/issues/new/choose`,
  )
}

export function overrideComponents(
  starlightConfig: StarlightUserConfig,
  overrides: ComponentOverride[],
  logger: AstroIntegrationLogger,
): StarlightUserConfig['components'] {
  const components = { ...starlightConfig.components }
  for (const { name, fallback } of overrides) {
    if (starlightConfig.components?.[name]) {
      logger.warn(`A \`<${name}>\` component override is already defined in your Starlight configuration.`)
      logger.warn(
        `To use \`starlight-versions\`, either remove this override or manually render the content from \`starlight-versions/components/${fallback}.astro\`.`,
      )
      continue
    }
    components[name] = `starlight-versions/overrides/${name}.astro`
  }

  return components
}

interface ComponentOverride {
  name: keyof NonNullable<StarlightUserConfig['components']>
  fallback: string
}
