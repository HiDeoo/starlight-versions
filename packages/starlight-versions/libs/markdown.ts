import assert from 'node:assert'

import type { Image, Link, Root } from 'mdast'
import type { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx-jsx'
import type { MdxjsEsm } from 'mdast-util-mdxjs-esm'
import { remark } from 'remark'
import remarkDirective from 'remark-directive'
import remarkFrontmatter from 'remark-frontmatter'
import remarkMdx from 'remark-mdx'
import { CONTINUE, SKIP, visit } from 'unist-util-visit'
import type { VFile } from 'vfile'

import { isAbsoluteLink, stripLeadingSlash, stripTrailingSlash } from './path'
import { getFrontmatterNodeValue, parseFrontmatter } from './starlight'
import type { Version, VersionAsset } from './versions'

const importPathRegex = /(from ?["'])([^"']*)(["'];?\s?)$/gm
const astroAssetRegex = /\.(png|jpg|jpeg|tiff|webp|gif|svg|avif)$/i

const mediaElements = new Set(['img', 'source', 'Image', 'audio', 'video'])

const processor = remark().use(remarkDirective).use(remarkMdx).use(remarkFrontmatter).use(remarkStarlightVersions)

export async function transformMarkdown(markdown: string, context: TransformContext) {
  const file = await processor.process({
    data: { ...context },
    value: markdown,
  })

  return {
    assets: file.data.assets,
    content: String(file),
  }
}

export function remarkStarlightVersions() {
  return function transformer(tree: Root, file: VFile) {
    visit(tree, (node) => {
      switch (node.type) {
        case 'link': {
          return handleLinks(node, file)
        }
        case 'mdxJsxTextElement': {
          if (node.name === 'a') {
            return handleLinkElements(node, file)
          }

          return CONTINUE
        }
        case 'mdxjsEsm': {
          return handleImports(node, file)
        }
        case 'mdxJsxFlowElement': {
          if (node.name && mediaElements.has(node.name)) {
            return handleMediaElements(node, file)
          }

          return CONTINUE
        }
        case 'image': {
          return handleImages(node, file)
        }
        default: {
          return CONTINUE
        }
      }
    })

    handleFrontmatter(tree, file)
  }
}

function handleFrontmatter(tree: Root, file: VFile) {
  // The frontmatter is always at the root of the tree.
  for (const node of tree.children) {
    if (node.type !== 'yaml') {
      continue
    }

    const frontmatter = parseFrontmatter(node.value)

    if (frontmatter.slug) {
      frontmatter.slug = stripLeadingSlash(
        stripTrailingSlash(`${file.data.version?.slug}/${stripTrailingSlash(frontmatter.slug)}`),
      )
    } else if (file.data.slug && file.data.version) {
      if (file.data.slug === '/') {
        frontmatter.slug = file.data.version.slug
      } else {
        const segments = file.data.slug.split('/')

        if (file.data.locale && segments[0] === file.data.locale) {
          segments.splice(1, 0, file.data.version.slug)
        } else {
          segments.splice(0, 0, file.data.version.slug)
        }

        frontmatter.slug = segments.join('/')
      }
    }

    if (typeof frontmatter.prev === 'object' && frontmatter.prev.link?.startsWith('/')) {
      frontmatter.prev.link = addVersionToLink(frontmatter.prev.link, file)
    }

    if (typeof frontmatter.next === 'object' && frontmatter.next.link?.startsWith('/')) {
      frontmatter.next.link = addVersionToLink(frontmatter.next.link, file)
    }

    if (frontmatter.hero?.actions) {
      for (const action of frontmatter.hero.actions) {
        if (action.link.startsWith('/')) {
          action.link = addVersionToLink(action.link, file)
        }
      }
    }

    if (frontmatter.hero?.image) {
      if (frontmatter.hero.image.file?.startsWith('../')) {
        frontmatter.hero.image.file = addVersionToAstroAsset(frontmatter.hero.image.file, file)
      }
      if (frontmatter.hero.image.dark?.startsWith('../')) {
        frontmatter.hero.image.dark = addVersionToAstroAsset(frontmatter.hero.image.dark, file)
      }
      if (frontmatter.hero.image.light?.startsWith('../')) {
        frontmatter.hero.image.light = addVersionToAstroAsset(frontmatter.hero.image.light, file)
      }
    }

    node.value = getFrontmatterNodeValue(frontmatter)

    break
  }
}

function handleLinks(node: Link, file: VFile) {
  if (!isPublicAsset(node.url)) return SKIP

  node.url = addVersionToLink(node.url, file)

  return SKIP
}

function handleLinkElements(node: MdxJsxTextElement, file: VFile) {
  const href = node.attributes.find((attribute) => attribute.type === 'mdxJsxAttribute' && attribute.name === 'href')

  if (!href || typeof href.value !== 'string' || !isPublicAsset(href.value)) return CONTINUE

  href.value = addVersionToLink(href.value, file)

  return CONTINUE
}

function handleImages(node: Image, file: VFile) {
  if (isAbsoluteLink(node.url)) return SKIP

  node.url = (isPublicAsset(node.url) ? addVersionToPublicAsset : addVersionToAstroAsset)(node.url, file)

  return SKIP
}

function handleMediaElements(node: MdxJsxFlowElement, file: VFile) {
  const srcOrSrcset = node.attributes.find(
    (attribute) => attribute.type === 'mdxJsxAttribute' && (attribute.name === 'src' || attribute.name === 'srcset'),
  )

  if (!srcOrSrcset || typeof srcOrSrcset.value !== 'string' || !isPublicAsset(srcOrSrcset.value)) return CONTINUE

  srcOrSrcset.value = addVersionToPublicAsset(srcOrSrcset.value, file)

  return SKIP
}

function handleImports(node: MdxjsEsm, file: VFile) {
  node.value = node.value.replaceAll(importPathRegex, (match, start, importPath: string, end) => {
    if (!importPath.startsWith('../')) return match

    if (isAstroAsset(importPath)) {
      return `${start}${addVersionToAstroAsset(importPath, file)}${end}`
    }

    return `${start}../${importPath}${end}`
  })

  return SKIP
}

function addVersionToLink(link: string, file: VFile) {
  assert(file.data.version, 'A version must be provided to add a version to an Astro asset.')

  const base = file.data.base ?? ''
  const hasBase = file.data.base && link.startsWith(file.data.base)

  if (hasBase) {
    link = link.replace(base, '')
  }

  const segments = link.split('/')

  let slugVersionIndex = 1
  if (file.data.locale && segments[1] === file.data.locale) slugVersionIndex = 2

  segments.splice(slugVersionIndex, 0, file.data.version.slug)

  if (hasBase) {
    segments.splice(1, 0, stripLeadingSlash(base))
  }

  return segments.join('/')
}

function addVersionToAstroAsset(asset: string, file: VFile) {
  assert(file.data.version, 'A version must be provided to add a version to an Astro asset.')

  const source = new URL(asset, file.data.url)

  const segments = asset.split('/')
  segments.splice(-1, 0, file.data.version.slug)

  addVersionAsset(file, { source, dest: new URL(segments.join('/'), file.data.url) })

  segments.splice(0, 0, '..')

  return segments.join('/')
}

function addVersionToPublicAsset(asset: string, file: VFile) {
  assert(file.data.version, 'A version must be provided to add a version to an public asset.')

  const source = new URL(`.${asset}`, file.data.publicDir)

  const segments = asset.split('/')
  segments.splice(-1, 0, file.data.version.slug)

  addVersionAsset(file, { source, dest: new URL(`.${segments.join('/')}`, file.data.publicDir) })

  return segments.join('/')
}

function addVersionAsset(file: VFile, asset: VersionAsset) {
  file.data.assets?.push(asset)
}

function isAstroAsset(asset: string) {
  return astroAssetRegex.test(asset)
}

function isPublicAsset(asset: string) {
  return asset.startsWith('/')
}

export interface TransformContext {
  assets: VersionAsset[]
  base: string
  locale: string | undefined
  publicDir: URL
  slug: string
  url: URL
  version: Version
}

declare module 'vfile' {
  interface DataMap extends TransformContext {}
}
