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

    expect(result.assets?.[0]?.source.href).toMatch(/\/test\.png$/)
    expect(result.assets?.[0]?.dest.href).toMatch(/\/2\.0\/test\.png$/)

    expect(result.assets?.[1]?.source.href).toMatch(/\/src\/assets\/test\.png$/)
    expect(result.assets?.[1]?.dest.href).toMatch(/\/src\/assets\/2\.0\/test\.png$/)
  })

  test('transforms and copies HTML and MDX images', async () => {
    const result = await transformTestMarkdown(`import { Image } from 'astro:assets'
import test2 from '../../assets/test2.png'
import test3 from '../../assets/test3.png'

<img src="https://example.com/test.png" alt="Test 1"/>

<Image src={test2} alt="Test 2" />
<img src={test3.src} alt="Test 3"/>

<Image src="/test4.png" alt="Test 4" />
<img src="/test5.png" alt="Test 5" />`)

    expect(result.content).toMatchInlineSnapshot(`
      "import { Image } from 'astro:assets'
      import test2 from '../../../assets/2.0/test2.png'
      import test3 from '../../../assets/2.0/test3.png'

      <img src="https://example.com/test.png" alt="Test 1" />

      <Image src={test2} alt="Test 2" />

      <img src={test3.src} alt="Test 3" />

      <Image src="/2.0/test4.png" alt="Test 4" />

      <img src="/2.0/test5.png" alt="Test 5" />
      "
    `)

    expect(result.assets?.[0]?.source.href).toMatch(/\/src\/assets\/test2\.png$/)
    expect(result.assets?.[0]?.dest.href).toMatch(/\/src\/assets\/2\.0\/test2\.png$/)

    expect(result.assets?.[1]?.source.href).toMatch(/\/src\/assets\/test3\.png$/)
    expect(result.assets?.[1]?.dest.href).toMatch(/\/src\/assets\/2\.0\/test3\.png$/)

    expect(result.assets?.[2]?.source.href).toMatch(/\/test4\.png$/)
    expect(result.assets?.[2]?.dest.href).toMatch(/\/2\.0\/test4\.png$/)

    expect(result.assets?.[3]?.source.href).toMatch(/\/test5\.png$/)
    expect(result.assets?.[3]?.dest.href).toMatch(/\/2\.0\/test5\.png$/)
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
