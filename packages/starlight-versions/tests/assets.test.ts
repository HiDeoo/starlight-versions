import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import url from 'node:url'

import type { AstroConfig, AstroIntegrationLogger } from 'astro'
import glob from 'fast-glob'
import { describe, expect, test, vi } from 'vitest'

import { StarlightVersionsConfigSchema } from '../libs/config'
import { ensureNewVersion } from '../libs/versions'

// A 1x1 transparent PNG, small enough to inline and not valid utf8.
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==',
  'base64',
)

describe('ensureNewVersion', () => {
  test('copies colocated binary assets without altering them', async () => {
    const project = await makeTestProject()

    try {
      // Referenced by a markdown image.
      await writeText(project.srcDir, 'content/docs/md/index.md', '![Alt](./md-image.png)')
      await writeBinary(project.srcDir, 'content/docs/md/md-image.png', png)

      // Referenced by an MDX import from the same directory.
      await writeText(
        project.srcDir,
        'content/docs/mdx/index.mdx',
        'import image from \'./mdx-import.png\'\n\n<img src={image.src} alt="Alt" />\n',
      )
      await writeBinary(project.srcDir, 'content/docs/mdx/mdx-import.png', png)

      // Referenced as a relative string on the prop of a component.
      await writeText(project.srcDir, 'content/docs/prop/index.mdx', '<Figure src="./prop-image.png" />\n')
      await writeBinary(project.srcDir, 'content/docs/prop/prop-image.png', png)

      // Not referenced by any page.
      await writeText(project.srcDir, 'content/docs/orphan/index.md', '# Orphan')
      await writeBinary(project.srcDir, 'content/docs/orphan/orphan.png', png)

      await ensureNewVersion(
        StarlightVersionsConfigSchema.parse({ versions: [{ slug: '1.0' }] }),
        { title: 'Test' },
        project.astroConfig,
        { info: vi.fn() } as unknown as AstroIntegrationLogger,
      )

      const versionDir = new URL('content/docs/1.0/', project.srcDir)
      const assets = await glob('**/*.png', { cwd: url.fileURLToPath(versionDir) })

      expect(assets.toSorted()).toEqual([
        'md/md-image.png',
        'mdx/mdx-import.png',
        'orphan/orphan.png',
        'prop/prop-image.png',
      ])

      for (const asset of assets) {
        expect(await fs.readFile(new URL(asset, versionDir))).toEqual(png)
      }
    } finally {
      await fs.rm(project.root, { recursive: true })
    }
  })
})

async function makeTestProject() {
  const root = url.pathToFileURL(`${await fs.mkdtemp(path.join(os.tmpdir(), 'starlight-versions-assets-'))}/`)
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

function writeText(directory: URL, file: string, content: string) {
  return write(directory, file, content)
}

function writeBinary(directory: URL, file: string, content: Buffer) {
  return write(directory, file, content)
}

async function write(directory: URL, file: string, content: Buffer | string) {
  const fileURL = new URL(file, directory)
  await fs.mkdir(new URL('./', fileURL), { recursive: true })
  await fs.writeFile(fileURL, content)
}
