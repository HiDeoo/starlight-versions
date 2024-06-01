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
    const result = await transformTestMarkdown(`[Test 1](https://starlight.astro.build/)
[Test 2](/test/)
[Test 3](./test/)
[Test 4](../test/)`)

    expect(result.content).toMatchInlineSnapshot(`
      "[Test 1](https://starlight.astro.build/)
      [Test 2](/2.0/test/)
      [Test 3](./test/)
      [Test 4](../test/)
      "
    `)
  })

  test('transforms HTML absolute internal links', async () => {
    const result = await transformTestMarkdown(`<a href="https://starlight.astro.build/">Test 1</a>
<a href="/test/">Test 2</a>
<a href="./test/">Test 3</a>
<a href="../test/">Test 4</a>`)

    expect(result.content).toMatchInlineSnapshot(`
      "<a href="https://starlight.astro.build/">Test 1</a>
      <a href="/2.0/test/">Test 2</a>
      <a href="./test/">Test 3</a>
      <a href="../test/">Test 4</a>
      "
    `)
  })
})

async function transformTestMarkdown(markdown: string) {
  const result = await transformMarkdown(markdown, {
    slug: 'test',
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
