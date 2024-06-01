import { describe, expect, test } from 'vitest'

import { transformMarkdown, type TransformContext } from '../libs/markdown'

const context: TransformContext = {
  slug: 'test',
  version: {
    slug: '2.0.1',
    redirect: 'same-page',
  },
}

describe('transformMarkdown', () => {
  test('transforms the frontmatter', async () => {
    const result = await transformMarkdown(
      `---
title: Test
head:
  - tag: title
    content: Starlight Versions
---

Test`,
      context,
    )

    expect(result.content).toMatchInlineSnapshot(`
      "---
      title: Test
      head:
        - tag: title
          content: Starlight Versions
      slug: 2.0.1/test
      ---

      Test
      "
    `)
  })

  test('transforms the frontmatter for the root index', async () => {
    const result = await transformMarkdown(
      `---
title: Test
head:
  - tag: title
    content: Starlight Versions
---

Test`,
      { ...context, slug: '/' },
    )

    expect(result.content).toMatchInlineSnapshot(`
      "---
      title: Test
      head:
        - tag: title
          content: Starlight Versions
      slug: 2.0.1
      ---

      Test
      "
    `)
  })

  test('transforms the frontmatter with an existing slug', async () => {
    const result = await transformMarkdown(
      `---
title: Test
head:
  - tag: title
    content: Starlight Versions
slug: custom
---

Test`,
      context,
    )

    expect(result.content).toMatchInlineSnapshot(`
      "---
      title: Test
      head:
        - tag: title
          content: Starlight Versions
      slug: 2.0.1/custom
      ---

      Test
      "
    `)
  })

  test('preserves existing content', async () => {
    const result = await transformMarkdown(
      `---
title: Test
---

import { Card, CardGrid } from '@astrojs/starlight/components'

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
      context,
    )

    expect(result.content).toMatchInlineSnapshot(`
      "---
      title: Test
      slug: 2.0.1/test
      ---

      import { Card, CardGrid } from '@astrojs/starlight/components'

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
})
