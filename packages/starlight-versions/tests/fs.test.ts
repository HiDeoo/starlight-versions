import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import url from 'node:url'
import { gzipSync } from 'node:zlib'

import glob from 'fast-glob'
import { describe, expect, test, vi } from 'vitest'

import { copyDirectory, isDirectoryEntry, listDirectory, type CopyDirectoryCallback } from '../libs/fs'
import { ensureTrailingSlash } from '../libs/path'

describe('copyDirectory', () => {
  test('throws an error when the source directory is empty', async () => {
    const source = await makeTempDir()
    const dest = await makeTempDir()

    await expect(() => copyDirectory(source, dest, copyAllCallback)).rejects.toThrowError(
      /Failed to copy the empty directory/,
    )

    await fs.rm(source, { recursive: true })
    await fs.rm(dest, { recursive: true })
  })

  test('copies a single root file', async () => {
    const source = getFixtureURL('single-root-file')
    const dest = await makeTempDir()

    await copyDirectory(source, dest, copyAllCallback)

    expect(await getDirEntries(dest)).toEqual(['index.md'])

    await fs.rm(dest, { recursive: true })
  })

  test('copies a single nested file', async () => {
    const source = getFixtureURL('single-nested-file')
    const dest = await makeTempDir()

    await copyDirectory(source, dest, copyAllCallback)

    expect(await getDirEntries(dest)).toEqual(['dir/hello.md'])

    await fs.rm(dest, { recursive: true })
  })

  test('does not throw when a nested directory is empty', async () => {
    const source = await makeTempDir()
    await fs.cp(getFixtureURL('single-root-file'), source, { recursive: true })
    await fs.mkdir(new URL('dir/', source))
    const dest = await makeTempDir()

    await expect(copyDirectory(source, dest, copyAllCallback)).resolves.not.toThrowError()

    await fs.rm(source, { recursive: true })
    await fs.rm(dest, { recursive: true })
  })

  test('copies all files and directories', async () => {
    const source = getFixtureURL('basics')
    const dest = await makeTempDir()

    await copyDirectory(source, dest, copyAllCallback)

    expect(await getDirEntries(dest)).toEqual(
      expect.arrayContaining([
        'index.md',
        'hello.md',
        'dir/index.md',
        'dir/hello.mdx',
        'dir/nested/index.md',
        'dir/nested/hello.md',
      ]),
    )

    await fs.rm(dest, { recursive: true })
  })

  test('copies assets as-is', async () => {
    const source = await makeTempDir()
    const dest = await makeTempDir()
    const content = gzipSync('asset content')
    await fs.writeFile(new URL('asset', source), content)

    await copyDirectory(source, dest, copyAllCallback)

    expect(await fs.readFile(new URL('asset', dest))).toEqual(content)

    await fs.rm(source, { recursive: true })
    await fs.rm(dest, { recursive: true })
  })

  test('uses the callback to filter directories to copy', async () => {
    const source = getFixtureURL('basics')
    const dest = await makeTempDir()

    const callback = vi.fn(((entry) => {
      if (entry.type === 'directory') {
        return Promise.resolve(entry.name === 'nested' ? true : undefined)
      }

      return Promise.resolve()
    }) as CopyDirectoryCallback)

    await copyDirectory(source, dest, callback)

    expect(await getDirEntries(dest)).toEqual(
      expect.arrayContaining(['index.md', 'hello.md', 'dir/index.md', 'dir/hello.mdx']),
    )

    /* eslint-disable @typescript-eslint/no-unsafe-assignment */
    expect(callback).toHaveBeenCalledTimes(6)
    expect(callback).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ type: 'directory', name: 'dir', isRoot: true }),
    )
    expect(callback).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ type: 'directory', name: 'dir', isRoot: true }),
    )
    expect(callback).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        type: 'file',
        url: expect.objectContaining({ pathname: expect.stringMatching(/hello\.mdx$/) }),
      }),
    )
    expect(callback.mock.calls[1]?.[0]).not.toHaveProperty('content')
    expect(callback).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        type: 'file',
        url: expect.objectContaining({ pathname: expect.stringMatching(/index\.md$/) }),
      }),
    )
    expect(callback).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining({ type: 'directory', name: 'nested', isRoot: false }),
    )
    expect(callback).toHaveBeenNthCalledWith(
      5,
      expect.objectContaining({
        type: 'file',
        url: expect.objectContaining({ pathname: expect.stringMatching(/hello\.md$/) }),
      }),
    )
    expect(callback).toHaveBeenNthCalledWith(
      6,
      expect.objectContaining({
        type: 'file',
        url: expect.objectContaining({ pathname: expect.stringMatching(/index\.md$/) }),
      }),
    )
    /* eslint-enable @typescript-eslint/no-unsafe-assignment */

    await fs.rm(dest, { recursive: true })
  })

  test('uses the callback to change the destination of directories to copy', async () => {
    const source = getFixtureURL('basics')
    const dest = await makeTempDir()

    const callback = vi.fn(((entry) => {
      if (entry.type === 'directory') {
        return Promise.resolve(new URL('test/', dest))
      }

      return Promise.resolve()
    }) as CopyDirectoryCallback)

    await copyDirectory(source, dest, callback)

    expect(await getDirEntries(dest)).toEqual(
      expect.arrayContaining(['index.md', 'hello.md', 'test/index.md', 'test/hello.mdx']),
    )

    await fs.rm(dest, { recursive: true })
  })

  test('uses the callback to skip or update files', async () => {
    const source = getFixtureURL('basics')
    const dest = await makeTempDir()

    const callback = vi.fn<CopyDirectoryCallback>((entry) => {
      if (entry.type === 'directory' || entry.url.pathname.endsWith('/hello.md')) return Promise.resolve(true)
      return Promise.resolve('updated content')
    })

    await copyDirectory(source, dest, callback)

    /* eslint-disable @typescript-eslint/no-unsafe-assignment */
    expect(callback).toHaveBeenCalledTimes(3)
    expect(callback).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ type: 'directory', name: 'dir', isRoot: true }),
    )
    expect(callback).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        type: 'file',
        url: expect.objectContaining({ pathname: expect.stringMatching(/hello\.md$/) }),
      }),
    )
    expect(callback).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        type: 'file',
        url: expect.objectContaining({ pathname: expect.stringMatching(/index\.md$/) }),
      }),
    )
    /* eslint-enable @typescript-eslint/no-unsafe-assignment */

    expect(await getDirEntries(dest)).toEqual(['index.md'])
    expect(await fs.readFile(new URL('index.md', dest), 'utf8')).toEqual('updated content')

    await fs.rm(dest, { recursive: true })
  })
})

describe('isDirectoryEntry', () => {
  test('returns `true` for a directory entry or a symbolic link to a directory', async () => {
    const source = getFixtureURL('symlinks')
    const entries = await listDirectory(source)

    const dirEntries: string[] = []

    for (const entry of entries) {
      if (await isDirectoryEntry(entry)) {
        dirEntries.push(entry.name)
      }
    }

    expect(dirEntries).toMatchInlineSnapshot(`
      [
        "dir",
        "symlink-dir",
      ]
    `)
  })
})

const copyAllCallback: CopyDirectoryCallback = () => Promise.resolve(undefined)

async function makeTempDir() {
  const tempDirPath = await fs.mkdtemp(path.join(os.tmpdir(), 'starlight-versions-test-'))
  return url.pathToFileURL(ensureTrailingSlash(tempDirPath))
}

function getFixtureURL(fixture: string) {
  return new URL(`../fixtures/${fixture}/`, import.meta.url)
}

function getDirEntries(directory: URL) {
  return glob('**', { cwd: directory.pathname, dot: true })
}
