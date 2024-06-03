import starlight from '@astrojs/starlight'
import { defineConfig } from 'astro/config'

export default defineConfig({
  integrations: [
    starlight({
      customCss: ['./src/styles/custom.css'],
      editLink: {
        baseUrl: 'https://github.com/HiDeoo/starlight-versions/edit/main/docs/',
      },
      sidebar: [
        {
          label: 'Start Here',
          items: [{ label: 'Getting Started', link: '/getting-started/' }],
        },
        {
          label: 'Guides',
          autogenerate: { directory: 'guides' },
        },
      ],
      social: {
        github: 'https://github.com/HiDeoo/starlight-versions',
      },
      title: 'Starlight Versions',
    }),
  ],
  site: 'https://starlight-versions.vercel.app',
})
