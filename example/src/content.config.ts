import { docsLoader } from '@astrojs/starlight/loaders'
import { docsSchema } from '@astrojs/starlight/schema'
import { defineCollection, z } from 'astro:content'
import { docsVersionsLoader } from 'starlight-versions/loader'

export const collections = {
  docs: defineCollection({
    loader: docsLoader(),
    schema: docsSchema({
      extend: z.object({
        banner: z
          .object({
            content: z.string(),
          })
          .default({
            content:
              'This is a demo of the Starlight Versions plugin — Back to the <a href="https://starlight-versions.vercel.app/">documentation</a>.',
          }),
      }),
    }),
  }),
  versions: defineCollection({ loader: docsVersionsLoader() }),
}
