import assert from 'node:assert'

import type { Image, Link, Root } from 'mdast'
import type { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx-jsx'
import type { MdxjsEsm } from 'mdast-util-mdxjs-esm'
import { remark } from 'remark'
import remarkFrontmatter from 'remark-frontmatter'
import remarkMdx from 'remark-mdx'
import { CONTINUE, SKIP, visit } from 'unist-util-visit'
import type { VFile } from 'vfile'

import { isAbsoluteLink, stripLeadingSlash, stripTrailingSlash } from './path'
import { getFrontmatterNodeValue, parseFrontmatter } from './starlight'
import type { Version, VersionAsset } from './versions'

const importPathRegex = /(from ?["'])([^"']*)(["'];?\s?)$/gm
const astroAssetRegex = /\.(png|jpg|jpeg|tiff|webp|gif|svg|avif)$/i

const mediaElements = new Set(['img', 'source', 'Image', 'audio'])

const processor = remark().use(remarkMdx).use(remarkFrontmatter).use(remarkStarlightVersions)

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

    frontmatter.slug = stripLeadingSlash(
      stripTrailingSlash(`${file.data.version?.slug}/${stripTrailingSlash(frontmatter.slug ?? file.data.slug ?? '')}`),
    )

    node.value = getFrontmatterNodeValue(frontmatter)

    break
  }
}

function handleLinks(node: Link, file: VFile) {
  if (!isPublicAsset(node.url)) return SKIP

  node.url = addVersionToLink(node.url, file.data.version)

  return SKIP
}

function handleLinkElements(node: MdxJsxTextElement, file: VFile) {
  const href = node.attributes.find((attribute) => attribute.type === 'mdxJsxAttribute' && attribute.name === 'href')

  if (!href || typeof href.value !== 'string' || !isPublicAsset(href.value)) return CONTINUE

  href.value = addVersionToLink(href.value, file.data.version)

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

function addVersionToLink(link: string, version?: Version) {
  assert(version, 'A version must be provided to add a version to a link.')

  const segments = link.split('/')
  segments.splice(1, 0, version.slug)

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

  const source = new URL(asset, file.data.url)

  const segments = asset.split('/')
  segments.splice(-1, 0, file.data.version.slug)

  addVersionAsset(file, { source, dest: new URL(segments.join('/'), file.data.url) })

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
  slug: string
  url: URL
  version: Version
}

declare module 'vfile' {
  interface DataMap extends TransformContext {}
}
