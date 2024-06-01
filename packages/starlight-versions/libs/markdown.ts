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

const importPathRegex = /(from ?["'])([^"']*)(["']\s?)$/gm
const astroAssetRegex = /\.(png|jpg|jpeg|tiff|webp|gif|svg|avif)$/i

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
          if (node.name === 'img' || node.name === 'Image') {
            return handleImageElements(node, file)
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
  if (!node.url.startsWith('/')) return SKIP

  node.url = addVersionToLink(node.url, file.data.version)

  return SKIP
}

function handleLinkElements(node: MdxJsxTextElement, file: VFile) {
  const href = node.attributes.find((attribute) => attribute.type === 'mdxJsxAttribute' && attribute.name === 'href')

  if (!href || typeof href.value !== 'string' || !href.value.startsWith('/')) return CONTINUE

  href.value = addVersionToLink(href.value, file.data.version)

  return CONTINUE
}

function handleImages(node: Image, file: VFile) {
  if (isAbsoluteLink(node.url)) return SKIP

  const isPublicAsset = node.url.startsWith('/')

  const { source, dest, url } = (isPublicAsset ? addVersionToPublicAsset : addVersionToAstroAsset)(node.url, file)
  node.url = url
  file.data.assets?.push({ source, dest })

  return SKIP
}

function handleImageElements(node: MdxJsxFlowElement, file: VFile) {
  const src = node.attributes.find((attribute) => attribute.type === 'mdxJsxAttribute' && attribute.name === 'src')

  if (!src || typeof src.value !== 'string' || !src.value.startsWith('/')) return SKIP

  const { source, dest, url } = addVersionToPublicAsset(src.value, file)
  src.value = url
  file.data.assets?.push({ source, dest })

  return SKIP
}

function handleImports(node: MdxjsEsm, file: VFile) {
  node.value = node.value.replaceAll(importPathRegex, (match, start, importPath: string, end) => {
    if (!importPath.startsWith('../')) return match

    if (isAstroAsset(importPath)) {
      const { source, dest, url } = addVersionToAstroAsset(importPath, file)
      file.data.assets?.push({ source, dest })
      return `${start}${url}${end}`
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

  const dest = new URL(segments.join('/'), file.data.url)

  segments.splice(0, 0, '..')

  return { source, dest, url: segments.join('/') }
}

function addVersionToPublicAsset(asset: string, file: VFile) {
  assert(file.data.version, 'A version must be provided to add a version to an public asset.')

  const source = new URL(asset, file.data.url)

  const segments = asset.split('/')
  segments.splice(-1, 0, file.data.version.slug)

  const dest = new URL(segments.join('/'), file.data.url)

  return { source, dest, url: segments.join('/') }
}

function isAstroAsset(asset: string) {
  return astroAssetRegex.test(asset)
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
