import fs from 'node:fs/promises'
import path from 'node:path'

export function listDirectory(directory: URL): Promise<DirEntries> {
  return fs.readdir(directory, { withFileTypes: true })
}

export function ensureDirectory(directory: URL) {
  return fs.mkdir(directory, { recursive: true })
}

export function copyDirEntry(entry: DirEntry, sourceDir: URL, destDir: URL) {
  return fs.cp(path.join(sourceDir.pathname, entry.name), path.join(destDir.pathname, entry.name), {
    recursive: true,
  })
}

type DirEntry = Awaited<ReturnType<typeof fs.readdir>>[number]
export type DirEntries = DirEntry[]
