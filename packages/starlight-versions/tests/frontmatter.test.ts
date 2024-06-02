import { describe, expect, test } from 'vitest'

import { transformMarkdown, type TransformContext } from '../libs/markdown'

const context: TransformContext = {
  assets: [],
  slug: 'test',
  url: new URL('src/content/docs/test.md', import.meta.url),
  version: {
    slug: '2.0.1',
    redirect: 'same-page',
  },
}

describe('transformMarkdown', () => {
  test('adds versioned slug', async () => {
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

  test('adds versioned slug for the root index', async () => {
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

  test('updates an existing slug to a versioned one', async () => {
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

  test('updates existing prev/next links', async () => {
    const result = await transformMarkdown(
      `---
title: Test
prev:
  link: /custom-prev/
next:
  link: /custom-next/
---

Test`,
      context,
    )

    expect(result.content).toMatchInlineSnapshot(`
      "---
      title: Test
      prev:
        link: /2.0.1/custom-prev/
      next:
        link: /2.0.1/custom-next/
      slug: 2.0.1/test
      ---

      Test
      "
    `)
  })
})
