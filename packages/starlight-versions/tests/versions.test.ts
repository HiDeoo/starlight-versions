import util from 'node:util'

import type { StarlightConfig, StarlightUserConfig } from '@astrojs/starlight/types'
import { describe, expect, test, vi } from 'vitest'

import { StarlightVersionsConfigSchema, type StarlightVersionsConfig } from '../libs/config'
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
  const starlightBasicConfig = createTestStarlightConfig({ title: 'basics' })
  const starlightI18nConfig = createTestStarlightConfig({
    title: 'i18n',
    locales: {
      fr: { label: 'French' },
      en: { label: 'English', lang: 'en-US' },
      ar: { label: 'Arabic', dir: 'rtl' },
      'pt-br': { label: 'Brazilian Portuguese', lang: 'pt-BR' },
    },
  })
  const starlightI18nRootLocaleConfig = createTestStarlightConfig({
    title: 'i18n-root-locale',
    locales: {
      root: { label: 'French', lang: 'fr', dir: 'ltr' },
      en: { label: 'English', lang: 'en-US' },
      ar: { label: 'Arabic', dir: 'rtl' },
    },
  })
  const starlightI18nNonRootSingleLocaleConfig = createTestStarlightConfig({
    title: 'i18n-non-root-single-locale',
    locales: {
      fr: { label: 'Français', lang: 'fr-CA' },
    },
  })

  describe("with `redirect: 'root'`", () => {
    const version = createTestVersion('3.0', 'root')
    const config = StarlightVersionsConfigSchema.parse({
      current: { redirect: 'root' },
      versions: [createTestVersion('2.0', 'root'), version],
    })

    describe("with `build.output: 'directory'`", () => {
      test.each([
        [starlightBasicConfig, '/', '/'],
        [starlightI18nConfig, '/fr/', '/fr/'],
        [starlightI18nRootLocaleConfig, '/en/', '/en/'],
        [starlightI18nRootLocaleConfig, '/', '/'],
        [starlightI18nNonRootSingleLocaleConfig, '/fr/', '/fr/'],
      ])(
        'does nothing on an index route if the requested version is the current one (%o)',
        (starlightConfig, url, expected) => {
          expectVersionURL(config, starlightConfig, url, undefined, expected)
        },
      )

      test.each([
        [starlightBasicConfig, '/guides/example/', '/'],
        [starlightI18nConfig, '/fr/guides/example/', '/fr/'],
        [starlightI18nRootLocaleConfig, '/en/guides/example/', '/en/'],
        [starlightI18nRootLocaleConfig, '/guides/example/', '/'],
        [starlightI18nNonRootSingleLocaleConfig, '/fr/guides/example/', '/fr/'],
      ])(
        'changes to the root URL if the version and requested version are the current one (%o)',
        (starlightConfig, url, expected) => {
          expectVersionURL(config, starlightConfig, url, undefined, expected)
        },
      )

      test.each([
        [starlightBasicConfig, '/3.0/guides/example/', '/3.0/'],
        [starlightI18nConfig, '/fr/3.0/guides/example/', '/fr/3.0/'],
        [starlightI18nRootLocaleConfig, '/en/3.0/guides/example/', '/en/3.0/'],
        [starlightI18nRootLocaleConfig, '/3.0/guides/example/', '/3.0/'],
        [starlightI18nNonRootSingleLocaleConfig, '/fr/3.0/guides/example/', '/fr/3.0/'],
      ])(
        'changes to the root URL if the version and requested version are the same (%o)',
        (starlightConfig, url, expected) => {
          expectVersionURL(config, starlightConfig, url, version, expected)
        },
      )

      test.each([
        [starlightBasicConfig, '/3.0/guides/example/', '/'],
        [starlightI18nConfig, '/fr/3.0/guides/example/', '/fr/'],
        [starlightI18nRootLocaleConfig, '/en/3.0/guides/example/', '/en/'],
        [starlightI18nRootLocaleConfig, '/3.0/guides/example/', '/'],
        [starlightI18nNonRootSingleLocaleConfig, '/fr/3.0/guides/example/', '/fr/'],
      ])('changes version to the current one (%o)', (starlightConfig, url, expected) => {
        expectVersionURL(config, starlightConfig, url, undefined, expected)
      })

      test.each([
        [starlightBasicConfig, '/3.0/', '/'],
        [starlightI18nConfig, '/fr/3.0/', '/fr/'],
        [starlightI18nRootLocaleConfig, '/en/3.0/', '/en/'],
        [starlightI18nRootLocaleConfig, '/3.0/', '/'],
        [starlightI18nNonRootSingleLocaleConfig, '/fr/3.0/', '/fr/'],
      ])('changes version to the current one for an index route (%o)', (starlightConfig, url, expected) => {
        expectVersionURL(config, starlightConfig, url, undefined, expected)
      })

      test.each([
        [starlightBasicConfig, '/guides/example/', '/3.0/'],
        [starlightBasicConfig, '/2.0/guides/example/', '/3.0/'],
        [starlightI18nConfig, '/fr/guides/example/', '/fr/3.0/'],
        [starlightI18nConfig, '/fr/2.0guides/example/', '/fr/3.0/'],
        [starlightI18nRootLocaleConfig, '/en/guides/example/', '/en/3.0/'],
        [starlightI18nRootLocaleConfig, '/en/2.0/guides/example/', '/en/3.0/'],
        [starlightI18nRootLocaleConfig, '/guides/example/', '/3.0/'],
        [starlightI18nRootLocaleConfig, '/guides/2.0/example/', '/3.0/'],
        [starlightI18nNonRootSingleLocaleConfig, '/fr/guides/example/', '/fr/3.0/'],
        [starlightI18nNonRootSingleLocaleConfig, '/fr/2.0/guides/example/', '/fr/3.0/'],
      ])('changes version to the requested one (%o)', (starlightConfig, url, expected) => {
        expectVersionURL(config, starlightConfig, url, version, expected)
      })

      test.each([
        [starlightBasicConfig, '/', '/3.0/'],
        [starlightBasicConfig, '/2.0/', '/3.0/'],
        [starlightI18nConfig, '/fr/', '/fr/3.0/'],
        [starlightI18nConfig, '/fr/2.0', '/fr/3.0/'],
        [starlightI18nRootLocaleConfig, '/en/', '/en/3.0/'],
        [starlightI18nRootLocaleConfig, '/en/2.0/', '/en/3.0/'],
        [starlightI18nRootLocaleConfig, '/', '/3.0/'],
        [starlightI18nRootLocaleConfig, '/guides/2.0/example/', '/3.0/'],
        [starlightI18nNonRootSingleLocaleConfig, '/fr/', '/fr/3.0/'],
        [starlightI18nNonRootSingleLocaleConfig, '/fr/2.0/', '/fr/3.0/'],
      ])('changes version to the requested one for an index route (%o)', (starlightConfig, url, expected) => {
        expectVersionURL(config, starlightConfig, url, version, expected)
      })

      test.each([
        [starlightBasicConfig, '/test/3.0/guides/example/', '/test/'],
        [starlightI18nConfig, '/test/fr/3.0/guides/example/', '/test/fr/'],
        [starlightI18nRootLocaleConfig, '/test/en/3.0/guides/example/', '/test/en/'],
        [starlightI18nRootLocaleConfig, '/test/3.0/guides/example/', '/test/'],
        [starlightI18nNonRootSingleLocaleConfig, '/test/fr/3.0/guides/example/', '/test/fr/'],
      ])('preserves the base when changing to the current version (%o)', (starlightConfig, url, expected) => {
        vi.stubEnv('BASE_URL', '/test')

        expectVersionURL(config, starlightConfig, url, undefined, expected)

        vi.unstubAllEnvs()
      })

      test.each([
        [starlightBasicConfig, '/test/guides/example/', '/test/3.0/'],
        [starlightBasicConfig, '/test/2.0/guides/example/', '/test/3.0/'],
        [starlightI18nConfig, '/test/fr/guides/example/', '/test/fr/3.0/'],
        [starlightI18nConfig, '/test/fr/2.0/guides/example/', '/test/fr/3.0/'],
        [starlightI18nRootLocaleConfig, '/test/en/guides/example/', '/test/en/3.0/'],
        [starlightI18nRootLocaleConfig, '/test/en/2.0/guides/example/', '/test/en/3.0/'],
        [starlightI18nRootLocaleConfig, '/test/guides/example/', '/test/3.0/'],
        [starlightI18nRootLocaleConfig, '/test/2.0/guides/example/', '/test/3.0/'],
        [starlightI18nNonRootSingleLocaleConfig, '/test/fr/guides/example/', '/test/fr/3.0/'],
        [starlightI18nNonRootSingleLocaleConfig, '/test/fr/2.0/guides/example/', '/test/fr/3.0/'],
      ])('preserves the base when changing to the requested version (%o)', (starlightConfig, url, expected) => {
        vi.stubEnv('BASE_URL', '/test')

        expectVersionURL(config, starlightConfig, url, version, expected)

        vi.unstubAllEnvs()
      })
    })

    describe("with `build.output: 'file'`", () => {
      test.each([
        [starlightBasicConfig, '/index.html', '/index.html'],
        [starlightI18nConfig, '/fr.html', '/fr.html'],
        [starlightI18nRootLocaleConfig, '/en.html', '/en.html'],
        [starlightI18nRootLocaleConfig, '/index.html', '/index.html'],
        [starlightI18nNonRootSingleLocaleConfig, '/fr.html', '/fr.html'],
      ])(
        'does nothing on an index route if the requested version is the current one (%o)',
        (starlightConfig, url, expected) => {
          expectVersionURL(config, starlightConfig, url, undefined, expected)
        },
      )

      test.each([
        [starlightBasicConfig, '/guides/example.html', '/index.html'],
        [starlightI18nConfig, '/fr/guides/example.html', '/fr.html'],
        [starlightI18nRootLocaleConfig, '/en/guides/example.html', '/en.html'],
        [starlightI18nRootLocaleConfig, '/guides/example.html', '/index.html'],
        [starlightI18nNonRootSingleLocaleConfig, '/fr/guides/example.html', '/fr.html'],
      ])(
        'changes to the root URL if the version and requested version are the current one (%o)',
        (starlightConfig, url, expected) => {
          expectVersionURL(config, starlightConfig, url, undefined, expected)
        },
      )

      test.each([
        [starlightBasicConfig, '/3.0/guides/example.html', '/3.0.html'],
        [starlightI18nConfig, '/fr/3.0/guides/example.html', '/fr/3.0.html'],
        [starlightI18nRootLocaleConfig, '/en/3.0/guides/example.html', '/en/3.0.html'],
        [starlightI18nRootLocaleConfig, '/3.0/guides/example.html', '/3.0.html'],
        [starlightI18nNonRootSingleLocaleConfig, '/fr/3.0/guides/example.html', '/fr/3.0.html'],
      ])(
        'changes to the root URL if the version and requested version are the same (%o)',
        (starlightConfig, url, expected) => {
          expectVersionURL(config, starlightConfig, url, version, expected)
        },
      )

      test.each([
        [starlightBasicConfig, '/3.0/guides/example.html', '/index.html'],
        [starlightI18nConfig, '/fr/3.0/guides/example.html', '/fr.html'],
        [starlightI18nRootLocaleConfig, '/en/3.0/guides/example.html', '/en.html'],
        [starlightI18nRootLocaleConfig, '/3.0/guides/example.html', '/index.html'],
        [starlightI18nNonRootSingleLocaleConfig, '/fr/3.0/guides/example.html', '/fr.html'],
      ])('changes version to the current one (%o)', (starlightConfig, url, expected) => {
        expectVersionURL(config, starlightConfig, url, undefined, expected)
      })

      test.each([
        [starlightBasicConfig, '/3.0.html', '/index.html'],
        [starlightI18nConfig, '/fr/3.0.html', '/fr.html'],
        [starlightI18nRootLocaleConfig, '/en/3.0.html', '/en.html'],
        [starlightI18nRootLocaleConfig, '/3.0.html', '/index.html'],
        [starlightI18nNonRootSingleLocaleConfig, '/fr/3.0.html', '/fr.html'],
      ])('changes version to the current one (%o)', (starlightConfig, url, expected) => {
        expectVersionURL(config, starlightConfig, url, undefined, expected)
      })

      test.each([
        [starlightBasicConfig, '/guides/example.html', '/3.0.html'],
        [starlightBasicConfig, '/2.0/guides/example.html', '/3.0.html'],
        [starlightI18nConfig, '/fr/guides/example.html', '/fr/3.0.html'],
        [starlightI18nConfig, '/fr/2.0/guides/example.html', '/fr/3.0.html'],
        [starlightI18nRootLocaleConfig, '/en/guides/example.html', '/en/3.0.html'],
        [starlightI18nRootLocaleConfig, '/en/2.0/guides/example.html', '/en/3.0.html'],
        [starlightI18nRootLocaleConfig, '/guides/example.html', '/3.0.html'],
        [starlightI18nRootLocaleConfig, '/2.0/guides/example.html', '/3.0.html'],
        [starlightI18nNonRootSingleLocaleConfig, '/fr/guides/example.html', '/fr/3.0.html'],
        [starlightI18nNonRootSingleLocaleConfig, '/fr/2.0/guides/example.html', '/fr/3.0.html'],
      ])('changes version to the requested one (%o)', (starlightConfig, url, expected) => {
        expectVersionURL(config, starlightConfig, url, version, expected)
      })

      test.each([
        [starlightBasicConfig, '/index.html', '/3.0.html'],
        [starlightBasicConfig, '/2.0.html', '/3.0.html'],
        [starlightI18nConfig, '/fr.html', '/fr/3.0.html'],
        [starlightI18nConfig, '/fr/2.0.html', '/fr/3.0.html'],
        [starlightI18nRootLocaleConfig, '/en.html', '/en/3.0.html'],
        [starlightI18nRootLocaleConfig, '/en/2.0.html', '/en/3.0.html'],
        [starlightI18nRootLocaleConfig, '/index.html', '/3.0.html'],
        [starlightI18nRootLocaleConfig, '/2.0.html', '/3.0.html'],
        [starlightI18nNonRootSingleLocaleConfig, '/fr.html', '/fr/3.0.html'],
        [starlightI18nNonRootSingleLocaleConfig, '/fr/2.0.html', '/fr/3.0.html'],
      ])('changes version to the requested one for an index route (%o)', (starlightConfig, url, expected) => {
        expectVersionURL(config, starlightConfig, url, version, expected)
      })

      test.each([
        [starlightBasicConfig, '/test/3.0/guides/example.html', '/test/index.html'],
        [starlightI18nConfig, '/test/fr/3.0/guides/example.html', '/test/fr.html'],
        [starlightI18nRootLocaleConfig, '/test/en/3.0/guides/example.html', '/test/en.html'],
        [starlightI18nRootLocaleConfig, '/test/3.0/guides/example.html', '/test/index.html'],
        [starlightI18nNonRootSingleLocaleConfig, '/test/fr/3.0/guides/example.html', '/test/fr.html'],
      ])('preserves the base when changing to the current version (%o)', (starlightConfig, url, expected) => {
        vi.stubEnv('BASE_URL', '/test')

        expectVersionURL(config, starlightConfig, url, undefined, expected)

        vi.unstubAllEnvs()
      })

      test.each([
        [starlightBasicConfig, '/test/guides/example.html', '/test/3.0.html'],
        [starlightBasicConfig, '/test/2.0/guides/example.html', '/test/3.0.html'],
        [starlightI18nConfig, '/test/fr/guides/example.html', '/test/fr/3.0.html'],
        [starlightI18nConfig, '/test/fr/2.0/guides/example.html', '/test/fr/3.0.html'],
        [starlightI18nRootLocaleConfig, '/test/en/guides/example.html', '/test/en/3.0.html'],
        [starlightI18nRootLocaleConfig, '/test/en/2.0/guides/example.html', '/test/en/3.0.html'],
        [starlightI18nRootLocaleConfig, '/test/guides/example.html', '/test/3.0.html'],
        [starlightI18nRootLocaleConfig, '/test/2.0/guides/example.html', '/test/3.0.html'],
        [starlightI18nNonRootSingleLocaleConfig, '/test/fr/guides/example.html', '/test/fr/3.0.html'],
        [starlightI18nNonRootSingleLocaleConfig, '/test/fr/2.0/guides/example.html', '/test/fr/3.0.html'],
      ])('preserves the base when changing to the requested version (%o)', (starlightConfig, url, expected) => {
        vi.stubEnv('BASE_URL', '/test')

        expectVersionURL(config, starlightConfig, url, version, expected)

        vi.unstubAllEnvs()
      })
    })
  })

  describe("with `redirect: 'same-page'`", () => {
    const version = createTestVersion('3.0', 'same-page')
    const config = StarlightVersionsConfigSchema.parse({
      current: { redirect: 'same-page' },
      versions: [createTestVersion('2.0', 'same-page'), version],
    })

    describe("with `build.output: 'directory'`", () => {
      test.each([
        [starlightBasicConfig, '/', '/'],
        [starlightI18nConfig, '/fr/', '/fr/'],
        [starlightI18nRootLocaleConfig, '/en/', '/en/'],
        [starlightI18nRootLocaleConfig, '/', '/'],
        [starlightI18nNonRootSingleLocaleConfig, '/fr/', '/fr/'],
      ])(
        'does nothing on an index route if the requested version is the current one (%o)',
        (starlightConfig, url, expected) => {
          expectVersionURL(config, starlightConfig, url, undefined, expected)
        },
      )

      test.each([
        [starlightBasicConfig, '/guides/example/', '/guides/example/'],
        [starlightI18nConfig, '/fr/guides/example/', '/fr/guides/example/'],
        [starlightI18nRootLocaleConfig, '/en/guides/example/', '/en/guides/example/'],
        [starlightI18nRootLocaleConfig, '/guides/example/', '/guides/example/'],
        [starlightI18nNonRootSingleLocaleConfig, '/fr/guides/example/', '/fr/guides/example/'],
      ])(
        'does nothing if the version and requested version are the current one (%o)',
        (starlightConfig, url, expected) => {
          expectVersionURL(config, starlightConfig, url, undefined, expected)
        },
      )

      test.each([
        [starlightBasicConfig, '/3.0/guides/example/', '/3.0/guides/example/'],
        [starlightI18nConfig, '/fr/3.0/guides/example/', '/fr/3.0/guides/example/'],
        [starlightI18nRootLocaleConfig, '/en/3.0/guides/example/', '/en/3.0/guides/example/'],
        [starlightI18nRootLocaleConfig, '/3.0/guides/example/', '/3.0/guides/example/'],
        [starlightI18nNonRootSingleLocaleConfig, '/fr/3.0/guides/example/', '/fr/3.0/guides/example/'],
      ])('does nothing if the version and requested version are the same (%o)', (starlightConfig, url, expected) => {
        expectVersionURL(config, starlightConfig, url, version, expected)
      })

      test.each([
        [starlightBasicConfig, '/3.0/', '/3.0/'],
        [starlightI18nConfig, '/fr/3.0/', '/fr/3.0/'],
        [starlightI18nRootLocaleConfig, '/en/3.0/', '/en/3.0/'],
        [starlightI18nRootLocaleConfig, '/3.0/', '/3.0/'],
        [starlightI18nNonRootSingleLocaleConfig, '/fr/3.0/', '/fr/3.0/'],
      ])(
        'does nothing if the version and requested version are the same for an index route (%o)',
        (starlightConfig, url, expected) => {
          expectVersionURL(config, starlightConfig, url, version, expected)
        },
      )

      test.each([
        [starlightBasicConfig, '/3.0/guides/example/', '/guides/example/'],
        [starlightI18nConfig, '/fr/3.0/guides/example/', '/fr/guides/example/'],
        [starlightI18nRootLocaleConfig, '/en/3.0/guides/example/', '/en/guides/example/'],
        [starlightI18nRootLocaleConfig, '/3.0/guides/example/', '/guides/example/'],
        [starlightI18nNonRootSingleLocaleConfig, '/fr/3.0/guides/example/', '/fr/guides/example/'],
      ])('changes version to the current one (%o)', (starlightConfig, url, expected) => {
        expectVersionURL(config, starlightConfig, url, undefined, expected)
      })

      test.each([
        [starlightBasicConfig, '/3.0/', '/'],
        [starlightI18nConfig, '/fr/3.0/', '/fr/'],
        [starlightI18nRootLocaleConfig, '/en/3.0/', '/en/'],
        [starlightI18nRootLocaleConfig, '/3.0/', '/'],
        [starlightI18nNonRootSingleLocaleConfig, '/fr/3.0/', '/fr/'],
      ])('changes version to the current one for an index route (%o)', (starlightConfig, url, expected) => {
        expectVersionURL(config, starlightConfig, url, undefined, expected)
      })

      test.each([
        [starlightBasicConfig, '/guides/example/', '/3.0/guides/example/'],
        [starlightBasicConfig, '/2.0/guides/example/', '/3.0/guides/example/'],
        [starlightI18nConfig, '/fr/guides/example/', '/fr/3.0/guides/example/'],
        [starlightI18nConfig, '/fr/2.0/guides/example/', '/fr/3.0/guides/example/'],
        [starlightI18nRootLocaleConfig, '/en/guides/example/', '/en/3.0/guides/example/'],
        [starlightI18nRootLocaleConfig, '/en/2.0/guides/example/', '/en/3.0/guides/example/'],
        [starlightI18nRootLocaleConfig, '/guides/example/', '/3.0/guides/example/'],
        [starlightI18nRootLocaleConfig, '/2.0/guides/example/', '/3.0/guides/example/'],
        [starlightI18nNonRootSingleLocaleConfig, '/fr/guides/example/', '/fr/3.0/guides/example/'],
        [starlightI18nNonRootSingleLocaleConfig, '/fr/2.0/guides/example/', '/fr/3.0/guides/example/'],
      ])('changes version to the requested one (%o)', (starlightConfig, url, expected) => {
        expectVersionURL(config, starlightConfig, url, version, expected)
      })

      test.each([
        [starlightBasicConfig, '/', '/3.0/'],
        [starlightBasicConfig, '/2.0/', '/3.0/'],
        [starlightI18nConfig, '/fr/', '/fr/3.0/'],
        [starlightI18nConfig, '/fr/2.0/', '/fr/3.0/'],
        [starlightI18nRootLocaleConfig, '/en/', '/en/3.0/'],
        [starlightI18nRootLocaleConfig, '/en/2.0/', '/en/3.0/'],
        [starlightI18nRootLocaleConfig, '/', '/3.0/'],
        [starlightI18nRootLocaleConfig, '/2.0/', '/3.0/'],
        [starlightI18nNonRootSingleLocaleConfig, '/fr/', '/fr/3.0/'],
        [starlightI18nNonRootSingleLocaleConfig, '/fr/2.0/', '/fr/3.0/'],
      ])('changes version to the requested one for an index route (%o)', (starlightConfig, url, expected) => {
        expectVersionURL(config, starlightConfig, url, version, expected)
      })

      test.each([
        [starlightBasicConfig, '/test/3.0/guides/example/', '/test/guides/example/'],
        [starlightI18nConfig, '/test/fr/3.0/guides/example/', '/test/fr/guides/example/'],
        [starlightI18nRootLocaleConfig, '/test/en/3.0/guides/example/', '/test/en/guides/example/'],
        [starlightI18nRootLocaleConfig, '/test/3.0/guides/example/', '/test/guides/example/'],
        [starlightI18nNonRootSingleLocaleConfig, '/test/fr/3.0/guides/example/', '/test/fr/guides/example/'],
      ])('preserves the base when changing to the current version (%o)', (starlightConfig, url, expected) => {
        vi.stubEnv('BASE_URL', '/test')

        expectVersionURL(config, starlightConfig, url, undefined, expected)

        vi.unstubAllEnvs()
      })

      test.each([
        [starlightBasicConfig, '/test/guides/example/', '/test/3.0/guides/example/'],
        [starlightBasicConfig, '/test/2.0/guides/example/', '/test/3.0/guides/example/'],
        [starlightI18nConfig, '/test/fr/guides/example/', '/test/fr/3.0/guides/example/'],
        [starlightI18nConfig, '/test/fr/2.0/guides/example/', '/test/fr/3.0/guides/example/'],
        [starlightI18nRootLocaleConfig, '/test/en/guides/example/', '/test/en/3.0/guides/example/'],
        [starlightI18nRootLocaleConfig, '/test/en/2.0/guides/example/', '/test/en/3.0/guides/example/'],
        [starlightI18nRootLocaleConfig, '/test/guides/example/', '/test/3.0/guides/example/'],
        [starlightI18nRootLocaleConfig, '/test/2.0/guides/example/', '/test/3.0/guides/example/'],
        [starlightI18nNonRootSingleLocaleConfig, '/test/fr/guides/example/', '/test/fr/3.0/guides/example/'],
        [starlightI18nNonRootSingleLocaleConfig, '/test/fr/2.0/guides/example/', '/test/fr/3.0/guides/example/'],
      ])('preserves the base when changing to the requested version (%o)', (starlightConfig, url, expected) => {
        vi.stubEnv('BASE_URL', '/test')

        expectVersionURL(config, starlightConfig, url, version, expected)

        vi.unstubAllEnvs()
      })
    })

    describe("with `build.output: 'file'`", () => {
      test.each([
        [starlightBasicConfig, '/index.html', '/index.html'],
        [starlightI18nConfig, '/fr.html', '/fr.html'],
        [starlightI18nRootLocaleConfig, '/en.html', '/en.html'],
        [starlightI18nRootLocaleConfig, '/index.html', '/index.html'],
        [starlightI18nNonRootSingleLocaleConfig, '/fr.html', '/fr.html'],
      ])(
        'does nothing on an index route if the requested version is the current one (%o)',
        (starlightConfig, url, expected) => {
          expectVersionURL(config, starlightConfig, url, undefined, expected)
        },
      )

      test.each([
        [starlightBasicConfig, '/guides/example.html', '/guides/example.html'],
        [starlightI18nConfig, '/fr/guides/example.html', '/fr/guides/example.html'],
        [starlightI18nRootLocaleConfig, '/en/guides/example.html', '/en/guides/example.html'],
        [starlightI18nRootLocaleConfig, '/guides/example.html', '/guides/example.html'],
        [starlightI18nNonRootSingleLocaleConfig, '/fr/guides/example.html', '/fr/guides/example.html'],
      ])(
        'does nothing if the version and requested version are the current one (%o)',
        (starlightConfig, url, expected) => {
          expectVersionURL(config, starlightConfig, url, undefined, expected)
        },
      )

      test.each([
        [starlightBasicConfig, '/3.0/guides/example.html', '/3.0/guides/example.html'],
        [starlightI18nConfig, '/fr/3.0/guides/example.html', '/fr/3.0/guides/example.html'],
        [starlightI18nRootLocaleConfig, '/en/3.0/guides/example.html', '/en/3.0/guides/example.html'],
        [starlightI18nRootLocaleConfig, '/3.0/guides/example.html', '/3.0/guides/example.html'],
        [starlightI18nNonRootSingleLocaleConfig, '/fr/3.0/guides/example.html', '/fr/3.0/guides/example.html'],
      ])('does nothing if the version and requested version are the same (%o)', (starlightConfig, url, expected) => {
        expectVersionURL(config, starlightConfig, url, version, expected)
      })

      test.each([
        [starlightBasicConfig, '/3.0.html', '/3.0.html'],
        [starlightI18nConfig, '/fr/3.0.html', '/fr/3.0.html'],
        [starlightI18nRootLocaleConfig, '/en/3.0.html', '/en/3.0.html'],
        [starlightI18nRootLocaleConfig, '/3.0.html', '/3.0.html'],
        [starlightI18nNonRootSingleLocaleConfig, '/fr/3.0.html', '/fr/3.0.html'],
      ])(
        'does nothing if the version and requested version are the same for an index route (%o)',
        (starlightConfig, url, expected) => {
          expectVersionURL(config, starlightConfig, url, version, expected)
        },
      )

      test.each([
        [starlightBasicConfig, '/3.0/guides/example.html', '/guides/example.html'],
        [starlightI18nConfig, '/fr/3.0/guides/example.html', '/fr/guides/example.html'],
        [starlightI18nRootLocaleConfig, '/en/3.0/guides/example.html', '/en/guides/example.html'],
        [starlightI18nRootLocaleConfig, '/3.0/guides/example.html', '/guides/example.html'],
        [starlightI18nNonRootSingleLocaleConfig, '/fr/3.0/guides/example.html', '/fr/guides/example.html'],
      ])('changes version to the current one (%o)', (starlightConfig, url, expected) => {
        expectVersionURL(config, starlightConfig, url, undefined, expected)
      })

      test.each([
        [starlightBasicConfig, '/3.0.html', '/index.html'],
        [starlightI18nConfig, '/fr/3.0.html', '/fr.html'],
        [starlightI18nRootLocaleConfig, '/en/3.0.html', '/en.html'],
        [starlightI18nRootLocaleConfig, '/3.0.html', '/index.html'],
        [starlightI18nNonRootSingleLocaleConfig, '/fr/3.0.html', '/fr.html'],
      ])('changes version to the current one for an index route (%o)', (starlightConfig, url, expected) => {
        expectVersionURL(config, starlightConfig, url, undefined, expected)
      })

      test.each([
        [starlightBasicConfig, '/guides/example.html', '/3.0/guides/example.html'],
        [starlightBasicConfig, '/2.0/guides/example.html', '/3.0/guides/example.html'],
        [starlightI18nConfig, '/fr/guides/example.html', '/fr/3.0/guides/example.html'],
        [starlightI18nConfig, '/fr/2.0/guides/example.html', '/fr/3.0/guides/example.html'],
        [starlightI18nRootLocaleConfig, '/en/guides/example.html', '/en/3.0/guides/example.html'],
        [starlightI18nRootLocaleConfig, '/en/2.0/guides/example.html', '/en/3.0/guides/example.html'],
        [starlightI18nRootLocaleConfig, '/guides/example.html', '/3.0/guides/example.html'],
        [starlightI18nRootLocaleConfig, '/2.0/guides/example.html', '/3.0/guides/example.html'],
        [starlightI18nNonRootSingleLocaleConfig, '/fr/guides/example.html', '/fr/3.0/guides/example.html'],
        [starlightI18nNonRootSingleLocaleConfig, '/fr/2.0/guides/example.html', '/fr/3.0/guides/example.html'],
      ])('changes version to the requested one (%o)', (starlightConfig, url, expected) => {
        expectVersionURL(config, starlightConfig, url, version, expected)
      })

      test.each([
        [starlightBasicConfig, '/index.html', '/3.0.html'],
        [starlightBasicConfig, '/2.0.html', '/3.0.html'],
        [starlightI18nConfig, '/fr.html', '/fr/3.0.html'],
        [starlightI18nConfig, '/fr/2.0.html', '/fr/3.0.html'],
        [starlightI18nRootLocaleConfig, '/en.html', '/en/3.0.html'],
        [starlightI18nRootLocaleConfig, '/en/2.0.html', '/en/3.0.html'],
        [starlightI18nRootLocaleConfig, '/index.html', '/3.0.html'],
        [starlightI18nRootLocaleConfig, '/2.0.html', '/3.0.html'],
        [starlightI18nNonRootSingleLocaleConfig, '/fr.html', '/fr/3.0.html'],
        [starlightI18nNonRootSingleLocaleConfig, '/fr/2.0.html', '/fr/3.0.html'],
      ])('changes version to the requested one for an index route (%o)', (starlightConfig, url, expected) => {
        expectVersionURL(config, starlightConfig, url, version, expected)
      })

      test.each([
        [starlightBasicConfig, '/test/3.0/guides/example.html', '/test/guides/example.html'],
        [starlightI18nConfig, '/test/fr/3.0/guides/example.html', '/test/fr/guides/example.html'],
        [starlightI18nRootLocaleConfig, '/test/en/3.0/guides/example.html', '/test/en/guides/example.html'],
        [starlightI18nRootLocaleConfig, '/test/3.0/guides/example.html', '/test/guides/example.html'],
        [starlightI18nNonRootSingleLocaleConfig, '/test/fr/3.0/guides/example.html', '/test/fr/guides/example.html'],
      ])('preserves the base when changing to the current version (%o)', (starlightConfig, url, expected) => {
        vi.stubEnv('BASE_URL', '/test')

        expectVersionURL(config, starlightConfig, url, undefined, expected)

        vi.unstubAllEnvs()
      })

      test.each([
        [starlightBasicConfig, '/test/guides/example.html', '/test/3.0/guides/example.html'],
        [starlightBasicConfig, '/test/2.0/guides/example.html', '/test/3.0/guides/example.html'],
        [starlightI18nConfig, '/test/fr/guides/example.html', '/test/fr/3.0/guides/example.html'],
        [starlightI18nConfig, '/test/fr/2.0/guides/example.html', '/test/fr/3.0/guides/example.html'],
        [starlightI18nRootLocaleConfig, '/test/en/guides/example.html', '/test/en/3.0/guides/example.html'],
        [starlightI18nRootLocaleConfig, '/test/en/2.0/guides/example.html', '/test/en/3.0/guides/example.html'],
        [starlightI18nRootLocaleConfig, '/test/guides/example.html', '/test/3.0/guides/example.html'],
        [starlightI18nRootLocaleConfig, '/test/2.0/guides/example.html', '/test/3.0/guides/example.html'],
        [starlightI18nNonRootSingleLocaleConfig, '/test/fr/guides/example.html', '/test/fr/3.0/guides/example.html'],
        [
          starlightI18nNonRootSingleLocaleConfig,
          '/test/fr/2.0/guides/example.html',
          '/test/fr/3.0/guides/example.html',
        ],
      ])('preserves the base when changing to the requested version (%o)', (starlightConfig, url, expected) => {
        vi.stubEnv('BASE_URL', '/test')

        expectVersionURL(config, starlightConfig, url, version, expected)

        vi.unstubAllEnvs()
      })
    })
  })
})

function createTestVersion(slug: string, redirect: Version['redirect'] = 'same-page'): Version {
  return { slug, redirect }
}

function createTestStarlightConfig(userConfig: Partial<StarlightUserConfig>): StarlightConfig {
  return {
    ...userConfig,
    isMultilingual: userConfig.locales !== undefined && Object.keys(userConfig.locales).length > 1,
    [util.inspect.custom]: () => userConfig.title,
  } as unknown as StarlightConfig
}

function expectVersionURL(
  config: StarlightVersionsConfig,
  starlightConfig: StarlightConfig,
  url: string,
  version: Version | undefined,
  expected: string,
) {
  expect(getVersionURL(config, starlightConfig, new URL(`https://example.com${url}`), version).href).toBe(
    `https://example.com${expected}`,
  )
}
