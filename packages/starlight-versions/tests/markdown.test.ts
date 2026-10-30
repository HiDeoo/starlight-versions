import { describe, expect, test } from 'vitest'

import { transformMarkdown } from '../libs/markdown'

import { expectVersionAssetToMatch, expectVersionAssetsToHaveLength } from './utils'

const extensions = ['md', 'mdx'] as const

describe('transformMarkdown', () => {
  describe('processor', () => {
    test('preserves invalid MDX in Markdown files', async () => {
      const markdown = `<->blah
<->blah

Some text with < and > characters: a < b, b > a and a <= b.

Some inline code with \`<T>\`, \`a -> b\` and \`<Component />\`.

Some {curly braces} and an <!-- inline comment --> that are not MDX expressions or JSX.

<!-- A comment -->

<https://example.com>

:::note
This is a note with < and > characters
:::

\`\`\`js title=src/index.js
if (a < b && b > c) console.log('Hello, world!')
\`\`\``

      const result = await transformTestMarkdown(markdown, { extension: 'md' })

      expect(result.content).toMatchInlineSnapshot(`
        "<->blah
        <->blah

        Some text with < and > characters: a < b, b > a and a <= b.

        Some inline code with \`<T>\`, \`a -> b\` and \`<Component />\`.

        Some {curly braces} and an <!-- inline comment --> that are not MDX expressions or JSX.

        <!-- A comment -->

        <https://example.com>

        :::note
        This is a note with < and > characters
        :::

        \`\`\`js title=src/index.js
        if (a < b && b > c) console.log('Hello, world!')
        \`\`\`
        "
      `)
    })

    test('does not parse MDX in Markdown files', async () => {
      const markdown = `import test from '../../assets/test.png'

{frontmatter.title}

<Image src={test} alt="Test" />`

      const result = await transformTestMarkdown(markdown, { extension: 'md' })

      expect(result.content).toMatchInlineSnapshot(`
        "import test from '../../assets/test.png'

        {frontmatter.title}

        <Image src={test} alt="Test" />
        "
      `)

      expectVersionAssetsToHaveLength(result.assets, 0)
    })
  })

  describe('content', () => {
    test.for(extensions)('preserves existing content (.%s)', async (extension) => {
      const result = await transformTestMarkdown(
        `:::note
This is a note
:::

:::tip[Custom Title]
This is a tip with a custom title
:::

Some :abbr[HTML]{title="HyperText Markup Language"} text.

\`\`\`js title=src/index.js
console.log('Hello, world!')
\`\`\``,
        { extension },
      )

      expect(result.content).toMatchInlineSnapshot(`
        ":::note
        This is a note
        :::

        :::tip[Custom Title]
        This is a tip with a custom title
        :::

        Some :abbr[HTML]{title="HyperText Markup Language"} text.

        \`\`\`js title=src/index.js
        console.log('Hello, world!')
        \`\`\`
        "
      `)
    })

    test('preserves existing MDX content', async () => {
      const result = await transformTestMarkdown(
        `import { Card, CardGrid } from '@astrojs/starlight/components'

<CardGrid stagger>
  <Card title="Do something" icon="puzzle">
    Test
  </Card>
</CardGrid>`,
        { extension: 'mdx' },
      )

      expect(result.content).toMatchInlineSnapshot(`
        "import { Card, CardGrid } from '@astrojs/starlight/components'

        <CardGrid stagger>
          <Card title="Do something" icon="puzzle">
            Test
          </Card>
        </CardGrid>
        "
      `)
    })
  })

  describe('links', () => {
    test.for(extensions)('transforms Markdown absolute internal links (.%s)', async (extension) => {
      const result = await transformTestMarkdown(
        `[Test 1](https://example.com/)
[Test 2](/test/)
[Test 3](./test/)
[Test 4](../test/)`,
        { extension },
      )

      expect(result.content).toMatchInlineSnapshot(`
        "[Test 1](https://example.com/)
        [Test 2](/2.0/test/)
        [Test 3](./test/)
        [Test 4](../test/)
        "
      `)
    })

    test.for(extensions)(
      'transforms Markdown absolute internal links in multilingual projects (.%s)',
      async (extension) => {
        const result = await transformTestMarkdown(`[Test](/fr/test/)`, { extension, locale: 'fr' })

        expect(result.content).toMatchInlineSnapshot(`
          "[Test](/fr/2.0/test/)
          "
        `)
      },
    )

    test.for(extensions)('does not match a partial base segment (.%s)', async (extension) => {
      const result = await transformTestMarkdown('[Test](/docs-old/page/)', { extension, base: '/docs' })

      expect(result.content.trim()).toBe('[Test](/2.0/docs-old/page/)')
    })

    test.for(
      extensions.flatMap((extension) => [
        {
          content: '[Test](../../test/?foo=bar#baz)',
          expected: '[Test](/docs/fr/test/?foo=bar#baz)',
          extension,
        },
        {
          content: '<a href="../../test/?foo=bar#baz">Test</a>',
          expected: '<a href="/docs/fr/test/?foo=bar#baz">Test</a>',
          extension,
        },
      ]),
    )(
      'transforms excluded internal links to canonical URLs (.$extension)',
      async ({ content, expected, extension }) => {
        const result = await transformTestMarkdown(content, {
          extension,
          base: '/docs',
          locale: 'fr',
          slug: 'fr/guides/page',
          excludedSlugs: ['fr/test'],
        })

        expect(result.content.trim()).toBe(expected)
      },
    )

    test.for(extensions)('preserves absolute links to excluded pages (.%s)', async (extension) => {
      const result = await transformTestMarkdown('[Test](/docs/fr/test/)', {
        extension,
        base: '/docs',
        locale: 'fr',
        slug: 'fr/guides/page',
        excludedSlugs: ['fr/test'],
      })

      expect(result.content.trim()).toBe('[Test](/docs/fr/test/)')
    })

    test.for(extensions)('transforms HTML absolute internal links (.%s)', async (extension) => {
      const result = await transformTestMarkdown(
        `<a href="https://example.com/">Test 1</a>

<a href="/test/">Test 2</a>

<a href="./test/">Test 3</a>

<a href="../test/">Test 4</a>`,
        { extension },
      )

      expect(result.content).toMatchInlineSnapshot(`
        "<a href="https://example.com/">Test 1</a>

        <a href="/2.0/test/">Test 2</a>

        <a href="./test/">Test 3</a>

        <a href="../test/">Test 4</a>
        "
      `)
    })

    test.for(extensions)(
      'transforms HTML absolute internal links in multilingual projects (.%s)',
      async (extension) => {
        const result = await transformTestMarkdown(`<a href="/fr/test/">Test</a>`, { extension, locale: 'fr' })

        expect(result.content).toMatchInlineSnapshot(`
          "<a href="/fr/2.0/test/">Test</a>
          "
        `)
      },
    )

    test('transforms inline and block HTML links in Markdown files', async () => {
      const result = await transformTestMarkdown(
        `See <a href="https://example.com/">Test 1</a>, <a href="/test/">Test 2</a>, <a href="./test/">Test 3</a> and <a href="../test/">Test 4</a>.

<div>
  <a href="/test/">Test 5</a>
  <a class="link" href='/test/'>Test 6</a>
</div>

<p><a href="/test/">Test 7<p>Test 8</a>`,
        { extension: 'md' },
      )

      expect(result.content).toMatchInlineSnapshot(`
        "See <a href="https://example.com/">Test 1</a>, <a href="/2.0/test/">Test 2</a>, <a href="./test/">Test 3</a> and <a href="../test/">Test 4</a>.

        <div>
          <a href="/2.0/test/">Test 5</a>
          <a class="link" href='/2.0/test/'>Test 6</a>
        </div>

        <p><a href="/2.0/test/">Test 7<p>Test 8</a>
        "
      `)
    })

    test('transforms HTML links using any attribute syntax in Markdown files', async () => {
      const result = await transformTestMarkdown(
        `<a href=/test>Test 1</a>

<a href = "/test/">Test 2</a>

<a HREF="/test/">Test 3</a>

<a href="/test/?a=b">Test 4</a>

<a class="link" href='/test/' title="Test">Test 5</a>

<a href>Test 6</a>

<a href="">Test 7</a>`,
        { extension: 'md' },
      )

      expect(result.content).toMatchInlineSnapshot(`
        "<a href=/2.0/test>Test 1</a>

        <a href = "/2.0/test/">Test 2</a>

        <a HREF="/2.0/test/">Test 3</a>

        <a href="/2.0/test/?a=b">Test 4</a>

        <a class="link" href='/2.0/test/' title="Test">Test 5</a>

        <a href>Test 6</a>

        <a href="">Test 7</a>
        "
      `)
    })
  })

  describe('assets', () => {
    test.for(extensions)('does not transform images co-located with Markdown files (.%s)', async (extension) => {
      const result = await transformTestMarkdown('![Test](./image.png)', { extension })

      expect(result.content.trim()).toBe('![Test](./image.png)')

      expectVersionAssetsToHaveLength(result.assets, 0)
    })

    test.for(extensions)('transforms and copies Markdown images (.%s)', async (extension) => {
      const result = await transformTestMarkdown(
        `![Test 1](https://example.com/test.png)
![Test 2](/test.png)
![Test 3](../../assets/test.png)`,
        { extension },
      )

      expect(result.content).toMatchInlineSnapshot(`
        "![Test 1](https://example.com/test.png)
        ![Test 2](/2.0/test.png)
        ![Test 3](../../../assets/2.0/test.png)
        "
      `)

      expectVersionAssetsToHaveLength(result.assets, 2)

      expectVersionAssetToMatch(result.assets?.[0], /\/test\.png$/, /\/2\.0\/test\.png$/)
      expectVersionAssetToMatch(result.assets?.[1], /\/src\/assets\/test\.png$/, /\/src\/assets\/2\.0\/test\.png$/)
    })

    test('transforms import paths and copies HTML and MDX images in MDX files', async () => {
      const result = await transformTestMarkdown(
        `import { Image } from 'astro:assets'
import test3 from '../../assets/test3.png'
import test4 from '../../assets/test4.png'
import Test from '../../components/Test.astro'

<img src="https://example.com/test.png" alt="Test 1"/>
<Image src="https://example.com/test.png" alt="Test 2"/>

<Image src={test3} alt="Test 3" />
<img src={test4.src} alt="Test 4"/>

<Image src="/test5.png" alt="Test 5" />
<img src="/test6.png" alt="Test 6" />

import test7 from "../../assets/test7.png";
import test8 from '../../assets/test8.png';

<Picture src={test7} formats={['avif', 'webp']} alt="Test 7" />

<picture>
  <source srcset={test7.src} media="(orientation: portrait)" />
  <img src={test8.src} alt="Test 8" />
</picture>

<picture>
  <source srcset="/test9.png" media="(orientation: portrait)" />
  <img src="/test10.png" alt="Test 10" />
</picture>`,
        { extension: 'mdx' },
      )

      expect(result.content).toMatchInlineSnapshot(`
        "import { Image } from 'astro:assets'
        import test3 from '../../../assets/2.0/test3.png'
        import test4 from '../../../assets/2.0/test4.png'
        import Test from '../../../components/Test.astro'

        <img src="https://example.com/test.png" alt="Test 1" />

        <Image src="https://example.com/test.png" alt="Test 2" />

        <Image src={test3} alt="Test 3" />

        <img src={test4.src} alt="Test 4" />

        <Image src="/2.0/test5.png" alt="Test 5" />

        <img src="/2.0/test6.png" alt="Test 6" />

        import test7 from "../../../assets/2.0/test7.png";
        import test8 from '../../../assets/2.0/test8.png';

        <Picture src={test7} formats={['avif', 'webp']} alt="Test 7" />

        <picture>
          <source srcset={test7.src} media="(orientation: portrait)" />

          <img src={test8.src} alt="Test 8" />
        </picture>

        <picture>
          <source srcset="/2.0/test9.png" media="(orientation: portrait)" />

          <img src="/2.0/test10.png" alt="Test 10" />
        </picture>
        "
      `)

      expectVersionAssetsToHaveLength(result.assets, 8)

      expectVersionAssetToMatch(result.assets?.[0], /\/src\/assets\/test3\.png$/, /\/src\/assets\/2\.0\/test3\.png$/)
      expectVersionAssetToMatch(result.assets?.[1], /\/src\/assets\/test4\.png$/, /\/src\/assets\/2\.0\/test4\.png$/)
      expectVersionAssetToMatch(result.assets?.[2], /\/test5\.png$/, /\/2\.0\/test5\.png$/)
      expectVersionAssetToMatch(result.assets?.[3], /\/test6\.png$/, /\/2\.0\/test6\.png$/)
      expectVersionAssetToMatch(result.assets?.[4], /\/test7\.png$/, /\/2\.0\/test7\.png$/)
      expectVersionAssetToMatch(result.assets?.[5], /\/test8\.png$/, /\/2\.0\/test8\.png$/)
      expectVersionAssetToMatch(result.assets?.[6], /\/test9\.png$/, /\/2\.0\/test9\.png$/)
      expectVersionAssetToMatch(result.assets?.[7], /\/test10\.png$/, /\/2\.0\/test10\.png$/)
    })

    test('transforms import paths and copies assets imported as strings in MDX files', async () => {
      const result = await transformTestMarkdown(
        `import { Code } from "@astrojs/starlight/components";
import exampleConfig from "../../assets/example-config.json?raw";

<Code code={exampleConfig} lang="json" title="config.json" />`,
        { extension: 'mdx' },
      )

      expect(result.content).toMatchInlineSnapshot(`
        "import { Code } from "@astrojs/starlight/components";
        import exampleConfig from "../../../assets/2.0/example-config.json?raw";

        <Code code={exampleConfig} lang="json" title="config.json" />
        "
      `)

      expectVersionAssetsToHaveLength(result.assets, 1)

      expect(result.assets?.[0]?.source.pathname).toMatch(/\/src\/assets\/example-config\.json$/)
      expect(result.assets?.[0]?.dest.pathname).toMatch(/\/src\/assets\/2\.0\/example-config\.json$/)
    })

    test('transforms HTML audio elements in MDX files', async () => {
      const result = await transformTestMarkdown(
        `<audio src="https://example.com/test1.mp3"></audio>
<audio src="/test2.mp3"></audio>

<audio>
  <source src="https://example.com/test3.mp3" type="audio/mpeg" />
  <source src="https://example.com/test4.ogg" type="audio/ogg" />
</audio>

<audio>
  <source src="/test5.mp3" type="audio/mpeg" />
  <source src="/test6.ogg" type="audio/ogg" />
</audio>`,
        { extension: 'mdx' },
      )

      expect(result.content).toMatchInlineSnapshot(`
        "<audio src="https://example.com/test1.mp3" />

        <audio src="/2.0/test2.mp3" />

        <audio>
          <source src="https://example.com/test3.mp3" type="audio/mpeg" />

          <source src="https://example.com/test4.ogg" type="audio/ogg" />
        </audio>

        <audio>
          <source src="/2.0/test5.mp3" type="audio/mpeg" />

          <source src="/2.0/test6.ogg" type="audio/ogg" />
        </audio>
        "
      `)

      expectVersionAssetsToHaveLength(result.assets, 3)

      expectVersionAssetToMatch(result.assets?.[0], /\/test2\.mp3$/, /\/2\.0\/test2\.mp3$/)
      expectVersionAssetToMatch(result.assets?.[1], /\/test5\.mp3$/, /\/2\.0\/test5\.mp3$/)
      expectVersionAssetToMatch(result.assets?.[2], /\/test6\.ogg$/, /\/2\.0\/test6\.ogg$/)
    })

    test('transforms HTML video elements in MDX files', async () => {
      const result = await transformTestMarkdown(
        `<video src="https://example.com/test1.mp4"></video>
<video src="/test2.mp4"></video>

<video>
  <source src="https://example.com/test3.mp4" type="video/mp4" />
  <source src="https://example.com/test4.webm" type="video/webm" />
</video>

<video>
  <source src="/test5.mp4" type="video/mp4" />
  <source src="/test6.webm" type="video/webm" />
</video>`,
        { extension: 'mdx' },
      )

      expect(result.content).toMatchInlineSnapshot(`
        "<video src="https://example.com/test1.mp4" />

        <video src="/2.0/test2.mp4" />

        <video>
          <source src="https://example.com/test3.mp4" type="video/mp4" />

          <source src="https://example.com/test4.webm" type="video/webm" />
        </video>

        <video>
          <source src="/2.0/test5.mp4" type="video/mp4" />

          <source src="/2.0/test6.webm" type="video/webm" />
        </video>
        "
      `)

      expectVersionAssetsToHaveLength(result.assets, 3)

      expectVersionAssetToMatch(result.assets?.[0], /\/test2\.mp4$/, /\/2\.0\/test2\.mp4$/)
      expectVersionAssetToMatch(result.assets?.[1], /\/test5\.mp4$/, /\/2\.0\/test5\.mp4$/)
      expectVersionAssetToMatch(result.assets?.[2], /\/test6\.webm$/, /\/2\.0\/test6\.webm$/)
    })

    test('transforms and copies HTML media elements in Markdown files', async () => {
      const result = await transformTestMarkdown(
        `<img src="https://example.com/test1.png" alt="Test 1">
<img src="/test2.png" alt="Test 2">

<picture>
  <source srcset="/test3.png" media="(orientation: portrait)">
  <img src="/test4.png" alt="Test 4">
</picture>

<audio src="/test5.mp3"></audio>

<video controls>
  <source src="https://example.com/test6.mp4" type="video/mp4">
  <source src="/test7.webm" type="video/webm">
</video>

An inline <img src="/test8.png" alt="Test 8"> image.`,
        { extension: 'md' },
      )

      expect(result.content).toMatchInlineSnapshot(`
        "<img src="https://example.com/test1.png" alt="Test 1">
        <img src="/2.0/test2.png" alt="Test 2">

        <picture>
          <source srcset="/2.0/test3.png" media="(orientation: portrait)">
          <img src="/2.0/test4.png" alt="Test 4">
        </picture>

        <audio src="/2.0/test5.mp3"></audio>

        <video controls>
          <source src="https://example.com/test6.mp4" type="video/mp4">
          <source src="/2.0/test7.webm" type="video/webm">
        </video>

        An inline <img src="/2.0/test8.png" alt="Test 8"> image.
        "
      `)

      expectVersionAssetsToHaveLength(result.assets, 6)

      expectVersionAssetToMatch(result.assets?.[0], /\/test2\.png$/, /\/2\.0\/test2\.png$/)
      expectVersionAssetToMatch(result.assets?.[1], /\/test3\.png$/, /\/2\.0\/test3\.png$/)
      expectVersionAssetToMatch(result.assets?.[2], /\/test4\.png$/, /\/2\.0\/test4\.png$/)
      expectVersionAssetToMatch(result.assets?.[3], /\/test5\.mp3$/, /\/2\.0\/test5\.mp3$/)
      expectVersionAssetToMatch(result.assets?.[4], /\/test7\.webm$/, /\/2\.0\/test7\.webm$/)
      expectVersionAssetToMatch(result.assets?.[5], /\/test8\.png$/, /\/2\.0\/test8\.png$/)
    })

    test.for(extensions)('transforms and copies public assets in srcset attributes (.%s)', async (extension) => {
      const result = await transformTestMarkdown(
        `<img srcset="/test1.png" alt="Test 1" />

<img srcset="/test2.png 1x, /test2@2x.png 2x" alt="Test 2" />

<img srcset="/test3.png 480w,/test3-large.png 800w" alt="Test 3" />

<img srcset="/test4.png, /test4@2x.png 2x" alt="Test 4" />

<img srcset="https://example.com/test5.png 1x, /test5@2x.png 2x" alt="Test 5" />

<img srcset="data:image/png;base64,abc= 1x, /test6@2x.png 2x" alt="Test 6" />`,
        { extension },
      )

      expect(result.content).toMatchInlineSnapshot(`
        "<img srcset="/2.0/test1.png" alt="Test 1" />

        <img srcset="/2.0/test2.png 1x, /2.0/test2@2x.png 2x" alt="Test 2" />

        <img srcset="/2.0/test3.png 480w,/2.0/test3-large.png 800w" alt="Test 3" />

        <img srcset="/2.0/test4.png, /2.0/test4@2x.png 2x" alt="Test 4" />

        <img srcset="https://example.com/test5.png 1x, /2.0/test5@2x.png 2x" alt="Test 5" />

        <img srcset="data:image/png;base64,abc= 1x, /2.0/test6@2x.png 2x" alt="Test 6" />
        "
      `)

      expectVersionAssetsToHaveLength(result.assets, 9)

      expectVersionAssetToMatch(result.assets?.[0], /\/test1\.png$/, /\/2\.0\/test1\.png$/)
      expectVersionAssetToMatch(result.assets?.[1], /\/test2\.png$/, /\/2\.0\/test2\.png$/)
      expectVersionAssetToMatch(result.assets?.[2], /\/test2@2x\.png$/, /\/2\.0\/test2@2x\.png$/)
      expectVersionAssetToMatch(result.assets?.[3], /\/test3\.png$/, /\/2\.0\/test3\.png$/)
      expectVersionAssetToMatch(result.assets?.[4], /\/test3-large\.png$/, /\/2\.0\/test3-large\.png$/)
      expectVersionAssetToMatch(result.assets?.[5], /\/test4\.png$/, /\/2\.0\/test4\.png$/)
      expectVersionAssetToMatch(result.assets?.[6], /\/test4@2x\.png$/, /\/2\.0\/test4@2x\.png$/)
      expectVersionAssetToMatch(result.assets?.[7], /\/test5@2x\.png$/, /\/2\.0\/test5@2x\.png$/)
      expectVersionAssetToMatch(result.assets?.[8], /\/test6@2x\.png$/, /\/2\.0\/test6@2x\.png$/)
    })

    test.for(extensions)(
      'transforms and copies public assets in src and srcset attributes (.%s)',
      async (extension) => {
        const result = await transformTestMarkdown(
          `<img src="/test1.png" srcset="/test1@2x.png 2x" alt="Test 1" />

<img srcset="/test2@2x.png 2x" src="https://example.com/test2.png" alt="Test 2" />

<img src="https://example.com/test3.png" srcset="/test3@2x.png 2x" alt="Test 3" />

<img srcSet="/test4.png 1x, /test4@2x.png 2x" alt="Test 4" />`,
          { extension },
        )

        expect(result.content).toMatchInlineSnapshot(`
          "<img src="/2.0/test1.png" srcset="/2.0/test1@2x.png 2x" alt="Test 1" />

          <img srcset="/2.0/test2@2x.png 2x" src="https://example.com/test2.png" alt="Test 2" />

          <img src="https://example.com/test3.png" srcset="/2.0/test3@2x.png 2x" alt="Test 3" />

          <img srcSet="/2.0/test4.png 1x, /2.0/test4@2x.png 2x" alt="Test 4" />
          "
        `)

        expectVersionAssetsToHaveLength(result.assets, 6)

        expectVersionAssetToMatch(result.assets?.[0], /\/test1\.png$/, /\/2\.0\/test1\.png$/)
        expectVersionAssetToMatch(result.assets?.[1], /\/test1@2x\.png$/, /\/2\.0\/test1@2x\.png$/)
        expectVersionAssetToMatch(result.assets?.[2], /\/test2@2x\.png$/, /\/2\.0\/test2@2x\.png$/)
        expectVersionAssetToMatch(result.assets?.[3], /\/test3@2x\.png$/, /\/2\.0\/test3@2x\.png$/)
        expectVersionAssetToMatch(result.assets?.[4], /\/test4\.png$/, /\/2\.0\/test4\.png$/)
        expectVersionAssetToMatch(result.assets?.[5], /\/test4@2x\.png$/, /\/2\.0\/test4@2x\.png$/)
      },
    )

    test.for(extensions)('transforms and copies inline HTML media elements (.%s)', async (extension) => {
      const result = await transformTestMarkdown(
        `An inline <img src="/test1.png" alt="Test 1" /> image.

An inline <img srcset="/test2.png 1x, /test2@2x.png 2x" alt="Test 2" /> image.`,
        { extension },
      )

      expect(result.content).toMatchInlineSnapshot(`
        "An inline <img src="/2.0/test1.png" alt="Test 1" /> image.

        An inline <img srcset="/2.0/test2.png 1x, /2.0/test2@2x.png 2x" alt="Test 2" /> image.
        "
      `)

      expectVersionAssetsToHaveLength(result.assets, 3)

      expectVersionAssetToMatch(result.assets?.[0], /\/test1\.png$/, /\/2\.0\/test1\.png$/)
      expectVersionAssetToMatch(result.assets?.[1], /\/test2\.png$/, /\/2\.0\/test2\.png$/)
      expectVersionAssetToMatch(result.assets?.[2], /\/test2@2x\.png$/, /\/2\.0\/test2@2x\.png$/)
    })

    test.for(extensions)('transforms and copies images in links (.%s)', async (extension) => {
      const result = await transformTestMarkdown(
        `[![Test 1](/test1.png)](/test/)

[![Test 2](../../assets/test2.png)](/test/)

[<img src="/test3.png" alt="Test 3" />](/test/)`,
        { extension },
      )

      expect(result.content).toMatchInlineSnapshot(`
        "[![Test 1](/2.0/test1.png)](/2.0/test/)

        [![Test 2](../../../assets/2.0/test2.png)](/2.0/test/)

        [<img src="/2.0/test3.png" alt="Test 3" />](/2.0/test/)
        "
      `)

      expectVersionAssetsToHaveLength(result.assets, 3)

      expectVersionAssetToMatch(result.assets?.[0], /\/test1\.png$/, /\/2\.0\/test1\.png$/)
      expectVersionAssetToMatch(result.assets?.[1], /\/src\/assets\/test2\.png$/, /\/src\/assets\/2\.0\/test2\.png$/)
      expectVersionAssetToMatch(result.assets?.[2], /\/test3\.png$/, /\/2\.0\/test3\.png$/)
    })
  })
})

async function transformTestMarkdown(markdown: string, { extension = 'mdx', ...context }: TransformTestContext = {}) {
  const result = await transformMarkdown(markdown, {
    assets: [],
    base: '',
    docsDir: new URL('src/content/docs/', import.meta.url),
    excludedSlugs: [],
    locale: undefined,
    publicDir: new URL(import.meta.url),
    slug: 'test',
    url: new URL(`src/content/docs/test.${extension}`, import.meta.url),
    version: {
      slug: '2.0',
      redirect: 'same-page',
    },
    ...context,
  })

  return {
    ...result,
    content: result.content.replace(/^---\n(?:.|\n)*---\n\n/, ''),
  }
}

type TransformTestContext = Partial<Parameters<typeof transformMarkdown>[1]> & { extension?: 'md' | 'mdx' }
