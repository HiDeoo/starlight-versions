import { describe, expect, test } from 'vitest'

import { getDocSlug } from '../libs/starlight'

describe('getDocSlug', () => {
  const docsDir = new URL('content/docs/', import.meta.url)

  test('handles root index file', () => {
    expect(getDocSlug(docsDir, new URL('index.md', docsDir))).toBe('/')
  })

  test('handles nested index files', () => {
    expect(getDocSlug(docsDir, new URL('guides/index.md', docsDir))).toBe('/guides/')
  })

  test('handles root files', () => {
    expect(getDocSlug(docsDir, new URL('test.mdx', docsDir))).toBe('/test/')
  })

  test('handles nested files', () => {
    expect(getDocSlug(docsDir, new URL('guides/examples/test.mdx', docsDir))).toBe('/guides/examples/test/')
  })
})
