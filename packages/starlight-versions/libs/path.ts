export function ensureTrailingSlash(path: string): string {
  if (path.endsWith('/')) {
    return path
  }

  return `${path}/`
}
