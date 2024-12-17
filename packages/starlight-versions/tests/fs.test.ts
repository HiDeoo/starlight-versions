import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import url from 'node:url'

import glob from 'fast-glob'
import { describe, expect, test, vi } from 'vitest'

import { copyDirectory, type CopyDirectoryCallback } from '../libs/fs'
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

  test('uses the callback to filter directories to copy', async () => {
    const source = getFixtureURL('basics')
    const dest = await makeTempDir()

    const callback = vi.fn(((entry) => {
      if (entry.type === 'directory') {
        return Promise.resolve(entry.name === 'nested')
      }

      return Promise.resolve('')
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
        content: expect.any(String),
        url: expect.objectContaining({ pathname: expect.stringMatching(/hello\.mdx$/) }),
      }),
    )
    expect(callback).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        type: 'file',
        content: expect.any(String),
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
        content: expect.any(String),
        url: expect.objectContaining({ pathname: expect.stringMatching(/hello\.md$/) }),
      }),
    )
    expect(callback).toHaveBeenNthCalledWith(
      6,
      expect.objectContaining({
        type: 'file',
        content: expect.any(String),
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

      return Promise.resolve('')
    }) as CopyDirectoryCallback)

    await copyDirectory(source, dest, callback)

    expect(await getDirEntries(dest)).toEqual(
      expect.arrayContaining(['index.md', 'hello.md', 'test/index.md', 'test/hello.mdx']),
    )

    await fs.rm(dest, { recursive: true })
  })

  test('uses the callback to update file content', async () => {
    const source = getFixtureURL('basics')
    const dest = await makeTempDir()

    const callback = vi.fn(((entry) =>
      Promise.resolve(entry.type === 'file' ? 'updated content' : true)) as CopyDirectoryCallback)

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
        content: expect.any(String),
        url: expect.objectContaining({ pathname: expect.stringMatching(/hello\.md$/) }),
      }),
    )
    expect(callback).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        type: 'file',
        content: expect.any(String),
        url: expect.objectContaining({ pathname: expect.stringMatching(/index\.md$/) }),
      }),
    )
    /* eslint-enable @typescript-eslint/no-unsafe-assignment */

    expect(await fs.readFile(new URL('hello.md', dest), 'utf8')).toEqual('updated content')
    expect(await fs.readFile(new URL('index.md', dest), 'utf8')).toEqual('updated content')

    await fs.rm(dest, { recursive: true })
  })
})

const copyAllCallback: CopyDirectoryCallback = (entry) => {
  return Promise.resolve(entry.type === 'directory' ? false : '')
}

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
