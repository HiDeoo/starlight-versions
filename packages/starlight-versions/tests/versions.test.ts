import { describe, expect, test, vi } from 'vitest'

import { StarlightVersionsConfigSchema } from '../libs/config'
import { getVersionFromSlug, getVersionURL, type Version } from '../libs/versions'

describe('getVersionFromSlug', () => {
  test('returns undefined for the current version', () => {
    expect(
      getVersionFromSlug(
        StarlightVersionsConfigSchema.parse({ versions: [createTestVersion('5.0')] }),
        'guides/example',
      ),
    ).toBeUndefined()
  })

  test('returns undefined for a non-existing version', () => {
    expect(
      getVersionFromSlug(
        StarlightVersionsConfigSchema.parse({ versions: [createTestVersion('4.0')] }),
        '5.0/guides/example',
      ),
    ).toBeUndefined()
  })

  test('returns the version for an existing version matching the slug', () => {
    const expectedSlug = '3.0'
    const expectedVersion = createTestVersion(expectedSlug)

    expect(
      getVersionFromSlug(
        StarlightVersionsConfigSchema.parse({
          versions: [createTestVersion('2.0'), expectedVersion, createTestVersion('4.0')],
        }),
        `${expectedSlug}/guides/example`,
      ),
    ).toStrictEqual(expectedVersion)
  })

  test('returns the version for an existing version that equals the slug', () => {
    const expectedSlug = '3.0'
    const expectedVersion = createTestVersion(expectedSlug)

    expect(
      getVersionFromSlug(
        StarlightVersionsConfigSchema.parse({
          versions: [createTestVersion('2.0'), expectedVersion, createTestVersion('4.0')],
        }),
        expectedSlug,
      ),
    ).toStrictEqual(expectedVersion)
  })
})

describe('getVersionURL', () => {
  const version = createTestVersion('3.0')
  const config = StarlightVersionsConfigSchema.parse({ versions: [createTestVersion('2.0'), version] })

  describe("with `build.output: 'directory'`", () => {
    test('does nothing on the index route if the requested version is the current one', () => {
      const url = new URL('https://example.com/')
      expect(getVersionURL(config, url, undefined).href).toBe(url.href)
    })

    test('does nothing if the version and requested version are the current one', () => {
      const url = new URL('https://example.com/guides/example/')
      expect(getVersionURL(config, url, undefined).href).toBe(url.href)
    })

    test('does nothing if the version and requested version are the same', () => {
      const url = new URL('https://example.com/3.0/guides/example/')
      expect(getVersionURL(config, url, version).href).toBe(url.href)
    })

    test('does nothing if the version and requested version are the same for the index route', () => {
      const url = new URL('https://example.com/3.0/')
      expect(getVersionURL(config, url, version).href).toBe(url.href)
    })

    test('changes version to the current one', () => {
      expect(getVersionURL(config, new URL('https://example.com/3.0/guides/example/'), undefined).href).toBe(
        'https://example.com/guides/example/',
      )
    })

    test('changes version to the current one for the index route', () => {
      expect(getVersionURL(config, new URL('https://example.com/3.0/'), undefined).href).toBe('https://example.com/')
    })

    test('changes version to the requested one', () => {
      expect(getVersionURL(config, new URL('https://example.com/guides/example/'), version).href).toBe(
        'https://example.com/3.0/guides/example/',
      )
      expect(getVersionURL(config, new URL('https://example.com/2.0/guides/example/'), version).href).toBe(
        'https://example.com/3.0/guides/example/',
      )
    })

    test('changes version to the requested one for the index route', () => {
      expect(getVersionURL(config, new URL('https://example.com'), version).href).toBe('https://example.com/3.0/')
      expect(getVersionURL(config, new URL('https://example.com/2.0/'), version).href).toBe('https://example.com/3.0/')
    })

    test('preserves the base when changing version', () => {
      vi.stubEnv('BASE_URL', '/test')

      expect(getVersionURL(config, new URL('https://example.com/test/3.0/guides/example/'), undefined).href).toBe(
        'https://example.com/test/guides/example/',
      )
      expect(getVersionURL(config, new URL('https://example.com/test/guides/example/'), version).href).toBe(
        'https://example.com/test/3.0/guides/example/',
      )

      vi.unstubAllEnvs()
    })
  })

  describe("with `build.output: 'file'`", () => {
    test('does nothing on the index route if the requested version is the current one', () => {
      const url = new URL('https://example.com/index.html')
      expect(getVersionURL(config, url, undefined).href).toBe(url.href)
    })

    test('does nothing if the version and requested version are the current one', () => {
      const url = new URL('https://example.com/guides/example.html')
      expect(getVersionURL(config, url, undefined).href).toBe(url.href)
    })

    test('does nothing if the version and requested version are the same', () => {
      const url = new URL('https://example.com/3.0/guides/example.html')
      expect(getVersionURL(config, url, version).href).toBe(url.href)
    })

    test('does nothing if the version and requested version are the same for the index route', () => {
      const url = new URL('https://example.com/3.0.html')
      expect(getVersionURL(config, url, version).href).toBe(url.href)
    })

    test('changes version to the current one', () => {
      const url = new URL('https://example.com/3.0/guides/example.html')
      expect(getVersionURL(config, url, undefined).href).toBe('https://example.com/guides/example.html')
    })

    test('changes version to the current one for the index route', () => {
      const url = new URL('https://example.com/3.0.html')
      expect(getVersionURL(config, url, undefined).href).toBe('https://example.com/index.html')
    })

    test('changes version to the requested one', () => {
      expect(getVersionURL(config, new URL('https://example.com/guides/example.html'), version).href).toBe(
        'https://example.com/3.0/guides/example.html',
      )
      expect(getVersionURL(config, new URL('https://example.com/2.0/guides/example.html'), version).href).toBe(
        'https://example.com/3.0/guides/example.html',
      )
    })

    test('changes version to the requested one for the index route', () => {
      expect(getVersionURL(config, new URL('https://example.com/index.html'), version).href).toBe(
        'https://example.com/3.0.html',
      )
      expect(getVersionURL(config, new URL('https://example.com/2.0.html'), version).href).toBe(
        'https://example.com/3.0.html',
      )
    })

    test('preserves the base when changing version', () => {
      vi.stubEnv('BASE_URL', '/test')

      expect(getVersionURL(config, new URL('https://example.com/test/3.0/guides/example.html'), undefined).href).toBe(
        'https://example.com/test/guides/example.html',
      )
      expect(getVersionURL(config, new URL('https://example.com/test/guides/example.html'), version).href).toBe(
        'https://example.com/test/3.0/guides/example.html',
      )

      vi.unstubAllEnvs()
    })
  })

  // TODO(HiDeoo) i18n tests
})

function createTestVersion(slug: string): Version {
  return { slug, redirect: 'same-page' }
}
