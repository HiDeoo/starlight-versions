import type { Root } from 'mdast'
import { remark } from 'remark'
import remarkFrontmatter from 'remark-frontmatter'
import type { VFile } from 'vfile'

import { stripLeadingSlash, stripTrailingSlash } from './path'
import { getFrontmatterNodeValue, parseFrontmatter } from './starlight'
import type { Version } from './versions'

const processor = remark().use(remarkFrontmatter).use(remarkStarlightVersions)

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

export interface TransformContext {
  slug: string
  version: Version
}

declare module 'vfile' {
  interface DataMap extends TransformContext {}
}
