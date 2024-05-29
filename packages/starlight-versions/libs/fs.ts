import type { PathLike } from 'node:fs'
import fs from 'node:fs/promises'

import { ensureTrailingSlash } from './path'
import { throwUserError } from './plugin'

export function listDirectory(directory: URL) {
  return fs.readdir(directory, { withFileTypes: true })
}

export async function copyDirectory(sourceDir: URL, destDir: URL, callback: CopyDirectoryCallback, isRoot = true) {
  const dirEntries = await listDirectory(sourceDir)

  if (isRoot && dirEntries.length === 0) {
    throwUserError(
      `Failed to copy the empty directory ('${sourceDir.pathname}') to the destination ('${destDir.pathname}').`,
    )
  }

  await ensureDirectory(destDir)

  for (const entry of dirEntries) {
    if (entry.isDirectory()) {
      const source = new URL(ensureTrailingSlash(entry.name), sourceDir)
      const dest = new URL(ensureTrailingSlash(entry.name), destDir)

      const skipDir = callback({ type: 'directory', name: entry.name, isRoot })
      if (skipDir) continue

      await ensureDirectory(dest)
      await copyDirectory(source, dest, callback, false)
    } else if (entry.isFile()) {
      const source = new URL(entry.name, sourceDir)
      const content = await fs.readFile(source, 'utf8')

      const updatedContent = callback({ type: 'file', name: entry.name, content })

      await fs.writeFile(new URL(entry.name, destDir), `${updatedContent}`)
    }
  }
}

function ensureDirectory(directory: PathLike) {
  return fs.mkdir(directory, { recursive: true })
}

type CopyDirectoryCallback = (
  entry: { type: 'file'; name: string; content: string } | { type: 'directory'; name: string; isRoot: boolean },
) => string | boolean
