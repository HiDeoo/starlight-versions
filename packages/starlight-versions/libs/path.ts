import path from 'node:path'

import { slug } from 'github-slugger'

export function ensureLeadingSlash(filePath: string): string {
  if (filePath.startsWith('/')) {
    return filePath
  }

  return `/${filePath}`
}

export function ensureTrailingSlash(filePath: string): string {
  if (filePath.endsWith('/')) {
    return filePath
  }

  return `${filePath}/`
}

export function stripLeadingSlash(path: string) {
  if (!path.startsWith('/')) {
    return path
  }

  return path.slice(1)
}

export function stripTrailingSlash(path: string) {
  if (!path.endsWith('/')) {
    return path
  }

  return path.slice(0, -1)
}

export function slugifyPath(filePath: string): string {
  const segments = stripExtension(filePath).split('/')

  return segments.map((segment) => slug(segment)).join('/')
}

function stripExtension(filePath: string) {
  const parsedPath = path.parse(filePath)

  return path.posix.join(parsedPath.dir, parsedPath.name)
}
