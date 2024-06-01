import { describe, expect, test } from 'vitest'

import { transformMarkdown } from '../libs/markdown'

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

    expect(result.assets).toHaveLength(2)

    expect(result.assets?.[0]?.source.href).toMatch(/\/test\.png$/)
    expect(result.assets?.[0]?.dest.href).toMatch(/\/2\.0\/test\.png$/)

    expect(result.assets?.[1]?.source.href).toMatch(/\/src\/assets\/test\.png$/)
    expect(result.assets?.[1]?.dest.href).toMatch(/\/src\/assets\/2\.0\/test\.png$/)
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

    expect(result.assets).toHaveLength(8)

    expect(result.assets?.[0]?.source.href).toMatch(/\/src\/assets\/test3\.png$/)
    expect(result.assets?.[0]?.dest.href).toMatch(/\/src\/assets\/2\.0\/test3\.png$/)

    expect(result.assets?.[1]?.source.href).toMatch(/\/src\/assets\/test4\.png$/)
    expect(result.assets?.[1]?.dest.href).toMatch(/\/src\/assets\/2\.0\/test4\.png$/)

    expect(result.assets?.[2]?.source.href).toMatch(/\/test5\.png$/)
    expect(result.assets?.[2]?.dest.href).toMatch(/\/2\.0\/test5\.png$/)

    expect(result.assets?.[3]?.source.href).toMatch(/\/test6\.png$/)
    expect(result.assets?.[3]?.dest.href).toMatch(/\/2\.0\/test6\.png$/)

    expect(result.assets?.[4]?.source.href).toMatch(/\/test7\.png$/)
    expect(result.assets?.[4]?.dest.href).toMatch(/\/2\.0\/test7\.png$/)

    expect(result.assets?.[5]?.source.href).toMatch(/\/test8\.png$/)
    expect(result.assets?.[5]?.dest.href).toMatch(/\/2\.0\/test8\.png$/)

    expect(result.assets?.[5]?.source.href).toMatch(/\/test8\.png$/)
    expect(result.assets?.[5]?.dest.href).toMatch(/\/2\.0\/test8\.png$/)

    expect(result.assets?.[6]?.source.href).toMatch(/\/test9\.png$/)
    expect(result.assets?.[6]?.dest.href).toMatch(/\/2\.0\/test9\.png$/)

    expect(result.assets?.[7]?.source.href).toMatch(/\/test10\.png$/)
    expect(result.assets?.[7]?.dest.href).toMatch(/\/2\.0\/test10\.png$/)
  })
})

async function transformTestMarkdown(markdown: string) {
  const result = await transformMarkdown(markdown, {
    assets: [],
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
