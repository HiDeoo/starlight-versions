import { describe, expect, test } from 'vitest'

import { transformMarkdown, type TransformContext } from '../libs/markdown'

import { expectVersionAssetToMatch, expectVersionAssetsToHaveLength } from './utils'

describe('transformMarkdown', () => {
  test('adds versioned slug and preserves existing frontmatter', async () => {
    const result = await transformMarkdown(
      `---
title: Test
head:
  - tag: title
    content: Starlight Versions
---

Test`,
      getTestContext(),
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
---

Test`,
      { ...getTestContext(), slug: '/' },
    )

    expect(result.content).toMatchInlineSnapshot(`
      "---
      title: Test
      slug: 2.0.1
      ---

      Test
      "
    `)
  })

  test('adds versioned slug for a specific locale', async () => {
    const result = await transformMarkdown(
      `---
title: Test
---

Test`,
      { ...getTestContext(), locale: 'fr', slug: 'fr/test' },
    )

    expect(result.content).toMatchInlineSnapshot(`
      "---
      title: Test
      slug: fr/2.0.1/test
      ---

      Test
      "
    `)
  })

  test('updates an existing slug to a versioned one', async () => {
    const result = await transformMarkdown(
      `---
title: Test
slug: custom
---

Test`,
      getTestContext(),
    )

    expect(result.content).toMatchInlineSnapshot(`
      "---
      title: Test
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
      getTestContext(),
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

  test('updates hero action links', async () => {
    const result = await transformMarkdown(
      `---
title: Test
hero:
  actions:
    - text: Test 1
      link: /test1/
    - text: Test 2
      link: https://example.com/
---

Test`,
      getTestContext(),
    )

    expect(result.content).toMatchInlineSnapshot(`
      "---
      title: Test
      hero:
        actions:
          - text: Test 1
            link: /2.0.1/test1/
          - text: Test 2
            link: https://example.com/
      slug: 2.0.1/test
      ---

      Test
      "
    `)
  })

  test('updates hero action links with a base', async () => {
    const result = await transformMarkdown(
      `---
title: Test
hero:
  actions:
    - text: Test 1
      link: /base/test1/
    - text: Test 2
      link: https://example.com/
---

Test`,
      { ...getTestContext(), base: '/base' },
    )

    expect(result.content).toMatchInlineSnapshot(`
      "---
      title: Test
      hero:
        actions:
          - text: Test 1
            link: /base/2.0.1/test1/
          - text: Test 2
            link: https://example.com/
      slug: 2.0.1/test
      ---

      Test
      "
    `)
  })

  test('updates hero file image', async () => {
    const result = await transformMarkdown(
      `---
title: Test
hero:
  image:
    file: ../../assets/test1.png
    dark: ~/assets/test2.png
    light: ~/assets/test3.png
---

Test`,
      getTestContext(),
    )

    expect(result.content).toMatchInlineSnapshot(`
      "---
      title: Test
      hero:
        image:
          file: ../../../assets/2.0.1/test1.png
          dark: ~/assets/test2.png
          light: ~/assets/test3.png
      slug: 2.0.1/test
      ---

      Test
      "
    `)

    expectVersionAssetsToHaveLength(result.assets, 1)
    expectVersionAssetToMatch(result.assets?.[0], /\/test1\.png$/, /\/2\.0\.1\/test1\.png$/)
  })

  test('updates hero dark/light images', async () => {
    const result = await transformMarkdown(
      `---
title: Test
hero:
  image:
    file: ~/assets/test1.png
    dark: ../../assets/test2.png
    light: ../../assets/test3.png
---

Test`,
      getTestContext(),
    )

    expect(result.content).toMatchInlineSnapshot(`
      "---
      title: Test
      hero:
        image:
          file: ~/assets/test1.png
          dark: ../../../assets/2.0.1/test2.png
          light: ../../../assets/2.0.1/test3.png
      slug: 2.0.1/test
      ---

      Test
      "
    `)

    expectVersionAssetsToHaveLength(result.assets, 2)
    expectVersionAssetToMatch(result.assets?.[0], /\/test2\.png$/, /\/2\.0\.1\/test2\.png$/)
    expectVersionAssetToMatch(result.assets?.[1], /\/test3\.png$/, /\/2\.0\.1\/test3\.png$/)
  })
})

function getTestContext(): TransformContext {
  return {
    assets: [],
    base: '',
    locale: undefined,
    publicDir: new URL(import.meta.url),
    slug: 'test',
    url: new URL('src/content/docs/test.md', import.meta.url),
    version: {
      slug: '2.0.1',
      redirect: 'same-page',
    },
  }
}
