import { z } from 'astro/zod'

import { VersionBaseSchema, VersionSchema } from './versions'

export const StarlightVersionsConfigSchema = z
  .object({
    // TODO(HiDeoo) comment
    current: z
      .object({
        // TODO(HiDeoo) comment
        label: z.string().default('Latest'),
      })
      .merge(VersionBaseSchema)
      .default({}),
    // TODO(HiDeoo) comment
    versions: z.array(VersionSchema).refine((value) => value.length > 0, {
      // TODO(HiDeoo)
      message: 'At least one version must be defined.',
    }),
  })
  .transform((value) => ({
    ...value,
    versionsBySlug: Object.fromEntries(value.versions.map((version) => [version.slug, version])),
  }))

export type StarlightVersionsUserConfig = z.input<typeof StarlightVersionsConfigSchema>
export type StarlightVersionsConfig = z.output<typeof StarlightVersionsConfigSchema>
