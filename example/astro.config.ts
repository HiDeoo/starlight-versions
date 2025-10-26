import starlight from '@astrojs/starlight'
import { defineConfig } from 'astro/config'
import starlightVersions from 'starlight-versions'

const site =
  process.env['VERCEL_ENV'] !== 'production' && process.env['VERCEL_URL']
    ? `https://${process.env['VERCEL_URL']}`
    : 'https://starlight-versions-example.vercel.app/'

export default defineConfig({
  integrations: [
    starlight({
      plugins: [
        starlightVersions({
          versions: [
            {
              slug: '2.0',
              label: 'v2.0',
            },
            {
              slug: '1.0',
              label: 'v1.0',
            },
          ],
        }),
      ],
      customCss: ['./src/styles/custom.css'],
      editLink: {
        baseUrl: 'https://github.com/HiDeoo/starlight-versions/edit/main/example/',
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
          items: [{ slug: 'getting-started' }, { label: 'Another Page', link: '/another-page/' }],
        },
        {
          label: 'Guides',
          autogenerate: { directory: 'guides' },
        },
      ],
      social: {
        blueSky: 'https://bsky.app/profile/hideoo.dev',
        github: 'https://github.com/HiDeoo/starlight-versions',
      },
      title: 'Starlight Versions Example',
    }),
  ],
  site,
})
