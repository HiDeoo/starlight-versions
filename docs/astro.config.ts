import starlight from '@astrojs/starlight'
import { defineConfig } from 'astro/config'
import starlightVersions from 'starlight-versions'

export default defineConfig({
  integrations: [
    starlight({
      // TODO(HiDeoo)
      plugins: [
        starlightVersions({
          versions: [
            {
              slug: '5.1',
            },
            {
              slug: '5.0',
            },
          ],
        }),
      ],
      // TODO(HiDeoo)
      customCss: ['./src/styles/custom.css'],
      editLink: {
        baseUrl: 'https://github.com/HiDeoo/starlight-versions/edit/main/docs/',
      },
      // TODO(HiDeoo)
      sidebar: [
        {
          label: 'Start Here',
          items: [{ label: 'Getting Started', link: '/getting-started/' }],
        },
        {
          label: 'Components',
          autogenerate: { directory: 'components' },
        },
        { label: 'Demo', link: '/demo/' },
      ],
      social: {
        github: 'https://github.com/HiDeoo/starlight-versions',
      },
      title: 'Starlight Versions',
    }),
  ],
  site: 'https://starlight-versions.vercel.app',
})
