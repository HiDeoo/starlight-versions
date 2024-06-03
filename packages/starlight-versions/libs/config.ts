import { z } from 'astro/zod'

import { VersionBaseSchema, VersionSchema } from './versions'

export const StarlightVersionsConfigSchema = z
  .object({
    /**
     * Options related to the current version of the documentation.
     */
    current: z
      .object({
        /**
         * The label used in the UI to represent the current version.
         *
         * @default 'Latest'
         */
        label: z.string().default('Latest'),
      })
      .merge(VersionBaseSchema)
      .default({}),
    /**
     * A list of all archived versions of the documentation.
     */
    versions: z.array(VersionSchema).refine((value) => value.length > 0, {
      message: 'At least one version of the documentation must be defined.',
    }),
  })
  .transform((value) => ({
    ...value,
    versionsBySlug: Object.fromEntries(value.versions.map((version) => [version.slug, version])),
  }))

export type StarlightVersionsUserConfig = z.input<typeof StarlightVersionsConfigSchema>
export type StarlightVersionsConfig = z.output<typeof StarlightVersionsConfigSchema>
