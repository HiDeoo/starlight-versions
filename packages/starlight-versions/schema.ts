import { z } from 'astro/zod'

export const StarlightVersionsConfigSchema = z.object({
  // TODO(HiDeoo) comment
  versions: z
    .array(
      z.object({
        // TODO(HiDeoo) comment
        version: z.string(),
        // TODO(HiDeoo) comment
        label: z.string().optional(),
      }),
    )
    .refine((value) => value.length > 0, {
      // TODO(HiDeoo)
      message: 'At least one version must be defined.',
    }),
  // TODO(HiDeoo) Add all versions to the schema so it's easier to use it
})

export type StarlightVersionsUserConfig = z.input<typeof StarlightVersionsConfigSchema>
export type StarlightVersionsConfig = z.output<typeof StarlightVersionsConfigSchema>
