import type { Link, Root } from 'mdast'
import type { MdxJsxTextElement } from 'mdast-util-mdx-jsx'
import { remark } from 'remark'
import remarkFrontmatter from 'remark-frontmatter'
import remarkMdx from 'remark-mdx'
import { CONTINUE, SKIP, visit } from 'unist-util-visit'
import type { VFile } from 'vfile'

import { stripLeadingSlash, stripTrailingSlash } from './path'
import { getFrontmatterNodeValue, parseFrontmatter } from './starlight'
import type { Version } from './versions'

const processor = remark().use(remarkMdx).use(remarkFrontmatter).use(remarkStarlightVersions)

export async function transformMarkdown(markdown: string, context: TransformContext) {
  const file = await processor.process({
    data: { ...context },
    value: markdown,
  })

  return {
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

  node.url = addVersionSlugToLink(node.url, file.data.version?.slug)

  return SKIP
}

function handleLinkElements(node: MdxJsxTextElement, file: VFile) {
  const href = node.attributes.find((attribute) => attribute.type === 'mdxJsxAttribute' && attribute.name === 'href')

  if (!href || typeof href.value !== 'string' || !href.value.startsWith('/')) return CONTINUE

  href.value = addVersionSlugToLink(href.value, file.data.version?.slug)

  return CONTINUE
}

function addVersionSlugToLink(link: string, versionSlug?: string) {
  if (!versionSlug) return link

  const segments = link.split('/')
  segments.splice(1, 0, versionSlug)

  return segments.join('/')
}

export interface TransformContext {
  slug: string
  version: Version
}

declare module 'vfile' {
  interface DataMap extends TransformContext {}
}
