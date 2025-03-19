import type { Dirent, PathLike } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'

import { ensureTrailingSlash } from './path'

export function listDirectory(directory: URL) {
  return fs.readdir(directory, { withFileTypes: true })
}

export async function copyDirectory(sourceDir: URL, destDir: URL, callback: CopyDirectoryCallback, isRoot = true) {
  const dirEntries = await listDirectory(sourceDir)

  if (isRoot && dirEntries.length === 0) {
    throw new Error(
      `Failed to copy the empty directory ('${sourceDir.pathname}') to the destination ('${destDir.pathname}').`,
    )
  }

  await ensureDirectory(destDir)

  for (const entry of dirEntries) {
    if (entry.isDirectory()) {
      const source = new URL(ensureTrailingSlash(entry.name), sourceDir)
      let dest = new URL(ensureTrailingSlash(entry.name), destDir)

      const skipOrDest = await callback({ type: 'directory', name: entry.name, isRoot, dest, source })
      if (skipOrDest === true) continue
      if (skipOrDest instanceof URL) dest = skipOrDest

      await ensureDirectory(dest)
      await copyDirectory(source, dest, callback, false)
    } else if (entry.isFile()) {
      const source = new URL(entry.name, sourceDir)
      const content = await fs.readFile(source, 'utf8')

      const updatedContent = await callback({ type: 'file', content, url: source })

      if (typeof updatedContent !== 'string') continue

      await fs.writeFile(new URL(entry.name, destDir), updatedContent)
    }
  }
}

export function copyFile(source: URL, dest: URL) {
  return fs.cp(source, dest, { force: true })
}

export function writeJSONFile(file: PathLike, data: unknown) {
  return fs.writeFile(file, JSON.stringify(data, null, 2))
}

export async function readJSONFile<T extends object>(file: PathLike): Promise<T> {
  const content = await fs.readFile(file, 'utf8')

  return JSON.parse(content) as T
}

export function ensureDirectory(directory: PathLike) {
  return fs.mkdir(directory, { recursive: true })
}

// Checks if the entry is a directory or a symbolic link to a directory.
export async function isDirectoryEntry(entry: Dirent) {
  if (entry.isDirectory()) return true
  if (!entry.isSymbolicLink()) return false

  const entryPath = path.join(entry.parentPath, entry.name)
  const stats = await fs.stat(entryPath)

  return stats.isDirectory()
}

export type CopyDirectoryCallback = (
  entry:
    | { type: 'file'; content: string; url: URL }
    | { type: 'directory'; name: string; isRoot: boolean; source: URL; dest: URL },
) => Promise<string | boolean | URL>
