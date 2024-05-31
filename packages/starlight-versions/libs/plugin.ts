import type { StarlightUserConfig } from '@astrojs/starlight/types'
import type { AstroIntegrationLogger } from 'astro'
import { AstroError } from 'astro/errors'

export function throwUserError(message: string): never {
  throw new AstroError(
    message,
    `See the error report above for more informations.\n\nIf you believe this is a bug, please file an issue at https://github.com/HiDeoo/starlight-versions/issues/new/choose`,
  )
}

export function overrideComponent(
  components: StarlightUserConfig['components'],
  name: keyof NonNullable<StarlightUserConfig['components']>,
  fallback: string,
  logger: AstroIntegrationLogger,
) {
  if (components?.[name]) {
    logger.warn(`A \`<${name}>\` component override is already defined in your Starlight configuration.`)
    logger.warn(
      `To use \`starlight-versions\`, either remove this override or manually render the content from \`starlight-versions/components/${fallback}.astro\`.`,
    )
    return {}
  }

  return {
    [name]: `starlight-versions/overrides/${name}.astro`,
  }
}
