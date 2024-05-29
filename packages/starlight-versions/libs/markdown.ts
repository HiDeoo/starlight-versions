import type { Root } from 'mdast'
import { remark } from 'remark'
import remarkFrontmatter from 'remark-frontmatter'

import { getFrontmatterNodeValue, parseFrontmatter } from './starlight'

const processor = remark().use(remarkFrontmatter).use(remarkStarlightVersions)

export async function transformMarkdown(markdown: string) {
  const file = await processor.process({ value: markdown })

  return {
    content: String(file),
  }
}

export function remarkStarlightVersions() {
  return function transformer(tree: Root) {
    handleFrontmatter(tree)
  }
}

function handleFrontmatter(tree: Root) {
  // The frontmatter is always at the root of the tree.
  for (const node of tree.children) {
    if (node.type !== 'yaml') {
      continue
    }

    const frontmatter = parseFrontmatter(node.value)

    // TODO(HiDeoo) existing slug
    frontmatter.slug = '// TODO(HiDeoo)'

    node.value = getFrontmatterNodeValue(frontmatter)

    break
  }
}
