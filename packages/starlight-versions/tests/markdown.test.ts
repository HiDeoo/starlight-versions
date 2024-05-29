import { describe, expect, test } from 'vitest'

import { transformMarkdown } from '../libs/markdown'

describe('transformMarkdown', () => {
  test('transforms the frontmatter', async () => {
    const result = await transformMarkdown(`---
title: Test
head:
  - tag: title
    content: Starlight Versions
---

Test`)

    expect(result.content).toMatchInlineSnapshot(`
      "---
      title: Test
      head:
        - tag: title
          content: Starlight Versions
      slug: // TODO(HiDeoo)
      ---

      Test
      "
    `)
  })

  test('preserves existing content', async () => {
    const result = await transformMarkdown(`---
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
\`\`\``)

    expect(result.content).toMatchInlineSnapshot(`
      "---
      title: Test
      slug: // TODO(HiDeoo)
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
