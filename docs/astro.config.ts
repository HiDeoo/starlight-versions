import starlight from '@astrojs/starlight'
import { defineConfig } from 'astro/config'

const site =
  process.env['VERCEL_ENV'] !== 'production' && process.env['VERCEL_URL']
    ? `https://${process.env['VERCEL_URL']}`
    : 'https://starlight-versions.vercel.app/'

export default defineConfig({
  integrations: [
    starlight({
      customCss: ['./src/styles/custom.css'],
      editLink: {
        baseUrl: 'https://github.com/HiDeoo/starlight-versions/edit/main/docs/',
      },
      head: [
        {
          tag: 'meta',
          attrs: { property: 'og:image', content: new URL('og.jpg', site).href },
        },
        {
          tag: 'meta',
          attrs: { property: 'og:image:alt', content: 'Starlight plugin to version documentation pages.' },
        },
      ],
      sidebar: [
        {
          label: 'Start Here',
          items: [
            { label: 'Getting Started', link: '/getting-started/' },
            { label: 'Configuration', link: '/configuration/' },
          ],
        },
        {
          label: 'Guides',
          autogenerate: { directory: 'guides' },
        },
        {
          label: 'Resources',
          items: [{ label: 'Plugins and Tools', link: '/resources/starlight/' }],
        },
        { label: 'Demo', link: 'https://starlight-versions-example.vercel.app' },
      ],
      social: {
        blueSky: 'https://bsky.app/profile/hideoo.dev',
        github: 'https://github.com/HiDeoo/starlight-versions',
      },
      title: 'Starlight Versions',
    }),
  ],
  site,
})
