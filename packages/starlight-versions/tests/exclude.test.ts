import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import url from 'node:url'

import type { AstroConfig, AstroIntegrationLogger } from 'astro'
import { describe, expect, test, vi } from 'vitest'

import { StarlightVersionsConfigSchema } from '../libs/config'
import { ensureNewVersion } from '../libs/versions'

describe('ensureNewVersion', () => {
  test('omits excluded pages from new versions', async () => {
    const project = await makeTestProject()

    try {
      await write(project.srcDir, 'content/docs/index.md', '# Home')
      await write(project.srcDir, 'content/docs/guide.md', '![Included](/included.png)')
      await write(project.srcDir, 'content/docs/internal/preview.md', '![Excluded](/excluded.png)')
      await write(project.srcDir, 'content/docs/fr/test.mdx', '---\nslug: fr/custom-test\n---\n\nTest')
      await write(project.publicDir, 'included.png', 'included')
      await write(project.publicDir, 'excluded.png', 'excluded')

      await ensureNewVersion(
        StarlightVersionsConfigSchema.parse({
          exclude: ['index.md', 'internal/**', 'fr/test.mdx', 'unknown/**'],
          versions: [{ slug: '1.0' }],
        }),
        { title: 'Test', locales: { fr: { label: 'French' } } },
        project.astroConfig,
        { info: vi.fn() } as unknown as AstroIntegrationLogger,
      )

      await expect(fs.access(new URL('content/docs/1.0/guide.md', project.srcDir))).resolves.toBeUndefined()
      await expect(fs.access(new URL('1.0/included.png', project.publicDir))).resolves.toBeUndefined()

      await expect(fs.access(new URL('content/docs/1.0/internal/preview.md', project.srcDir))).rejects.toThrow()
      await expect(fs.access(new URL('content/docs/1.0/index.md', project.srcDir))).rejects.toThrow()
      await expect(fs.access(new URL('1.0/excluded.png', project.publicDir))).rejects.toThrow()

      expect(JSON.parse(await fs.readFile(new URL('content/versions/1.0.json', project.srcDir), 'utf8')))
        .toMatchInlineSnapshot(`
        {
          "excluded": [
            "",
            "fr/custom-test",
            "internal/preview",
          ],
        }
      `)
    } finally {
      await fs.rm(project.root, { recursive: true })
    }
  })
})

async function makeTestProject() {
  const root = url.pathToFileURL(`${await fs.mkdtemp(path.join(os.tmpdir(), 'starlight-versions-exclude-'))}/`)
  const srcDir = new URL('src/', root)
  const publicDir = new URL('public/', root)

  await fs.mkdir(new URL('content/docs/', srcDir), { recursive: true })
  await fs.mkdir(publicDir, { recursive: true })

  return {
    root,
    srcDir,
    publicDir,
    astroConfig: { base: '/', publicDir, srcDir } as AstroConfig,
  }
}

async function write(directory: URL, file: string, content: string) {
  const fileURL = new URL(file, directory)
  await fs.mkdir(new URL('./', fileURL), { recursive: true })
  await fs.writeFile(fileURL, content)
}
