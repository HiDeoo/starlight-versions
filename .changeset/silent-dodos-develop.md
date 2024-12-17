---
'starlight-versions': minor
---

Adds support for Astro v5, drops support for Astro v4.

⚠️ **BREAKING CHANGE:** The minimum supported version of Starlight is now `0.30.0`.

Please follow the [upgrade guide](https://github.com/withastro/starlight/releases/tag/%40astrojs/starlight%400.30.0) to update your project.

After upgrading, you will also need to update the `versions` collection in your `src/content.config.ts` file to use the new `docsVersionsLoader`:

```diff
 // src/content.config.ts
 import { defineCollection } from "astro:content";
 import { docsLoader } from "@astrojs/starlight/loaders";
 import { docsSchema } from "@astrojs/starlight/schema";
-import { docsVersionsSchema } from 'starlight-versions/schema'
+import { docsVersionsLoader } from 'starlight-versions/loader'

 export const collections = {
   docs: defineCollection({ loader: docsLoader(), schema: docsSchema() }),
-  versions: defineCollection({ type: 'data', schema: docsVersionsSchema() }),
+  versions: defineCollection({ loader: docsVersionsLoader() }),
 };
```

Note that the [`legacy.collections` flag](https://docs.astro.build/en/reference/legacy-flags/#collections) is not supported by this plugin and you should update your collections to use Astro's new Content Layer API.
