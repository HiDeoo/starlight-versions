import { glob, type Loader } from 'astro/loaders'

import { docsVersionsSchema } from './schema'

const extensions = ['json', 'yml', 'yaml']

export function docsVersionsLoader(): Loader {
  return {
    name: 'starlight-versions-loader',
    load: (context) => {
      return glob({
        base: `${context.config.srcDir.pathname.replace(context.config.root.pathname, '')}content/versions`,
        pattern: `**/[^_]*.{${extensions.join(',')}}`,
      }).load(context)
    },
    schema: docsVersionsSchema(),
  }
}
