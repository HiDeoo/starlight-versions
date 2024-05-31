import { describe, expect, test } from 'vitest'

import { getVersionFromSlug } from '../libs/versions'

describe('getVersionFromSlug', () => {
  test('returns undefined for the current version', () => {
    expect(getVersionFromSlug({ versions: [{ slug: '5.0' }] }, 'guides/example')).toBeUndefined()
  })

  test('returns undefined for a non-existing version', () => {
    expect(getVersionFromSlug({ versions: [{ slug: '4.0' }] }, '5.0/guides/example')).toBeUndefined()
  })

  test('returns the version for an existing version matching the slug', () => {
    const expectedSlug = '3.0'
    const expectedVersion = { slug: expectedSlug }

    expect(
      getVersionFromSlug(
        { versions: [{ slug: '2.0' }, expectedVersion, { slug: '5.0' }] },
        `${expectedSlug}/guides/example`,
      ),
    ).toBe(expectedVersion)
  })

  test('returns the version for an existing version that equals the slug', () => {
    const expectedSlug = '3.0'
    const expectedVersion = { slug: expectedSlug }

    expect(getVersionFromSlug({ versions: [{ slug: '2.0' }, expectedVersion, { slug: '5.0' }] }, expectedSlug)).toBe(
      expectedVersion,
    )
  })
})
