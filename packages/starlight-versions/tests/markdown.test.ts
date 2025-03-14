import { describe, expect, test } from 'vitest'

import { transformMarkdown } from '../libs/markdown'

import { expectVersionAssetToMatch, expectVersionAssetsToHaveLength } from './utils'

describe('transformMarkdown', () => {
  test('preserves existing content', async () => {
    const result = await transformTestMarkdown(
      `import { Card, CardGrid } from '@astrojs/starlight/components'

<CardGrid stagger>
  <Card title="Do something" icon="puzzle">
    Test
  </Card>
</CardGrid>

:::note
This is a note
:::

\`\`\`js title=src/index.js
console.log('Hello, world!')
\`\`\``,
    )

    expect(result.content).toMatchInlineSnapshot(`
      "import { Card, CardGrid } from '@astrojs/starlight/components'

      <CardGrid stagger>
        <Card title="Do something" icon="puzzle">
          Test
        </Card>
      </CardGrid>

      :::note
      This is a note
      :::

      \`\`\`js title=src/index.js
      console.log('Hello, world!')
      \`\`\`
      "
    `)
  })

  test('transforms Markdown absolute internal links', async () => {
    const result = await transformTestMarkdown(`[Test 1](https://example.com/)
[Test 2](/test/)
[Test 3](./test/)
[Test 4](../test/)`)

    expect(result.content).toMatchInlineSnapshot(`
      "[Test 1](https://example.com/)
      [Test 2](/2.0/test/)
      [Test 3](./test/)
      [Test 4](../test/)
      "
    `)
  })

  test('transforms HTML absolute internal links', async () => {
    const result = await transformTestMarkdown(`<a href="https://example.com/">Test 1</a>
<a href="/test/">Test 2</a>
<a href="./test/">Test 3</a>
<a href="../test/">Test 4</a>`)

    expect(result.content).toMatchInlineSnapshot(`
      "<a href="https://example.com/">Test 1</a>
      <a href="/2.0/test/">Test 2</a>
      <a href="./test/">Test 3</a>
      <a href="../test/">Test 4</a>
      "
    `)
  })

  test('transforms and copies Markdown images', async () => {
    const result = await transformTestMarkdown(`![Test 1](https://example.com/test.png)
![Test 2](/test.png)
![Test 3](../../assets/test.png)`)

    expect(result.content).toMatchInlineSnapshot(`
      "![Test 1](https://example.com/test.png)
      ![Test 2](/2.0/test.png)
      ![Test 3](../../../assets/2.0/test.png)
      "
    `)

    expectVersionAssetsToHaveLength(result.assets, 2)

    expectVersionAssetToMatch(result.assets?.[0], /\/test\.png$/, /\/2\.0\/test\.png$/)
    expectVersionAssetToMatch(result.assets?.[1], /\/src\/assets\/test\.png$/, /\/src\/assets\/2\.0\/test\.png$/)
  })

  test('transforms import paths and copies HTML and MDX images', async () => {
    const result = await transformTestMarkdown(`import { Image } from 'astro:assets'
import test3 from '../../assets/test3.png'
import test4 from '../../assets/test4.png'
import Test from '../../components/Test.astro'

<img src="https://example.com/test.png" alt="Test 1"/>
<Image src="https://example.com/test.png" alt="Test 2"/>

<Image src={test3} alt="Test 3" />
<img src={test4.src} alt="Test 4"/>

<Image src="/test5.png" alt="Test 5" />
<img src="/test6.png" alt="Test 6" />

import test7 from "../../assets/test7.png";
import test8 from '../../assets/test8.png';

<Picture src={test7} formats={['avif', 'webp']} alt="Test 7" />

<picture>
  <source srcset={test7.src} media="(orientation: portrait)" />
  <img src={test8.src} alt="Test 8" />
</picture>

<picture>
  <source srcset="/test9.png" media="(orientation: portrait)" />
  <img src="/test10.png" alt="Test 10" />
</picture>`)

    expect(result.content).toMatchInlineSnapshot(`
      "import { Image } from 'astro:assets'
      import test3 from '../../../assets/2.0/test3.png'
      import test4 from '../../../assets/2.0/test4.png'
      import Test from '../../../components/Test.astro'

      <img src="https://example.com/test.png" alt="Test 1" />

      <Image src="https://example.com/test.png" alt="Test 2" />

      <Image src={test3} alt="Test 3" />

      <img src={test4.src} alt="Test 4" />

      <Image src="/2.0/test5.png" alt="Test 5" />

      <img src="/2.0/test6.png" alt="Test 6" />

      import test7 from "../../../assets/2.0/test7.png";
      import test8 from '../../../assets/2.0/test8.png';

      <Picture src={test7} formats={['avif', 'webp']} alt="Test 7" />

      <picture>
        <source srcset={test7.src} media="(orientation: portrait)" />

        <img src={test8.src} alt="Test 8" />
      </picture>

      <picture>
        <source srcset="/2.0/test9.png" media="(orientation: portrait)" />

        <img src="/2.0/test10.png" alt="Test 10" />
      </picture>
      "
    `)

    expectVersionAssetsToHaveLength(result.assets, 8)

    expectVersionAssetToMatch(result.assets?.[0], /\/src\/assets\/test3\.png$/, /\/src\/assets\/2\.0\/test3\.png$/)
    expectVersionAssetToMatch(result.assets?.[1], /\/src\/assets\/test4\.png$/, /\/src\/assets\/2\.0\/test4\.png$/)
    expectVersionAssetToMatch(result.assets?.[2], /\/test5\.png$/, /\/2\.0\/test5\.png$/)
    expectVersionAssetToMatch(result.assets?.[3], /\/test6\.png$/, /\/2\.0\/test6\.png$/)
    expectVersionAssetToMatch(result.assets?.[4], /\/test7\.png$/, /\/2\.0\/test7\.png$/)
    expectVersionAssetToMatch(result.assets?.[5], /\/test8\.png$/, /\/2\.0\/test8\.png$/)
    expectVersionAssetToMatch(result.assets?.[6], /\/test9\.png$/, /\/2\.0\/test9\.png$/)
    expectVersionAssetToMatch(result.assets?.[7], /\/test10\.png$/, /\/2\.0\/test10\.png$/)
  })

  test('transforms HTML audio elements', async () => {
    const result = await transformTestMarkdown(`<audio src="https://example.com/test1.mp3"></audio>
<audio src="/test2.mp3"></audio>

<audio>
  <source src="https://example.com/test3.mp3" type="audio/mpeg" />
  <source src="https://example.com/test4.ogg" type="audio/ogg" />
</audio>

<audio>
  <source src="/test5.mp3" type="audio/mpeg" />
  <source src="/test6.ogg" type="audio/ogg" />
</audio>`)

    expect(result.content).toMatchInlineSnapshot(`
      "<audio src="https://example.com/test1.mp3" />

      <audio src="/2.0/test2.mp3" />

      <audio>
        <source src="https://example.com/test3.mp3" type="audio/mpeg" />

        <source src="https://example.com/test4.ogg" type="audio/ogg" />
      </audio>

      <audio>
        <source src="/2.0/test5.mp3" type="audio/mpeg" />

        <source src="/2.0/test6.ogg" type="audio/ogg" />
      </audio>
      "
    `)

    expectVersionAssetsToHaveLength(result.assets, 3)

    expectVersionAssetToMatch(result.assets?.[0], /\/test2\.mp3$/, /\/2\.0\/test2\.mp3$/)
    expectVersionAssetToMatch(result.assets?.[1], /\/test5\.mp3$/, /\/2\.0\/test5\.mp3$/)
    expectVersionAssetToMatch(result.assets?.[2], /\/test6\.ogg$/, /\/2\.0\/test6\.ogg$/)
  })

  test('transforms HTML video elements', async () => {
    const result = await transformTestMarkdown(`<video src="https://example.com/test1.mp4"></video>
<video src="/test2.mp4"></video>

<video>
  <source src="https://example.com/test3.mp4" type="video/mp4" />
  <source src="https://example.com/test4.webm" type="video/webm" />
</video>

<video>
  <source src="/test5.mp4" type="video/mp4" />
  <source src="/test6.webm" type="video/webm" />
</video>`)

    expect(result.content).toMatchInlineSnapshot(`
      "<video src="https://example.com/test1.mp4" />

      <video src="/2.0/test2.mp4" />

      <video>
        <source src="https://example.com/test3.mp4" type="video/mp4" />

        <source src="https://example.com/test4.webm" type="video/webm" />
      </video>

      <video>
        <source src="/2.0/test5.mp4" type="video/mp4" />

        <source src="/2.0/test6.webm" type="video/webm" />
      </video>
      "
    `)

    expectVersionAssetsToHaveLength(result.assets, 3)

    expectVersionAssetToMatch(result.assets?.[0], /\/test2\.mp4$/, /\/2\.0\/test2\.mp4$/)
    expectVersionAssetToMatch(result.assets?.[1], /\/test5\.mp4$/, /\/2\.0\/test5\.mp4$/)
    expectVersionAssetToMatch(result.assets?.[2], /\/test6\.webm$/, /\/2\.0\/test6\.webm$/)
  })
})

async function transformTestMarkdown(markdown: string) {
  const result = await transformMarkdown(markdown, {
    assets: [],
    base: '',
    locale: undefined,
    slug: 'test',
    url: new URL('src/content/docs/test.md', import.meta.url),
    version: {
      slug: '2.0',
      redirect: 'same-page',
    },
  })

  return {
    ...result,
    content: result.content.replace(/^---\n(?:.|\n)*---\n\n/, ''),
  }
}
