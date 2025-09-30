# starlight-versions

## 0.5.5

### Patch Changes

- [#42](https://github.com/HiDeoo/starlight-versions/pull/42) [`3b68fbc`](https://github.com/HiDeoo/starlight-versions/commit/3b68fbc511dbe80c7d4b79ebe5ebc0b9f8d06c9d) Thanks [@mkurapov](https://github.com/mkurapov)! - Fixes potential issue with link generation in multilingual projects.

## 0.5.4

### Patch Changes

- [#37](https://github.com/HiDeoo/starlight-versions/pull/37) [`7812488`](https://github.com/HiDeoo/starlight-versions/commit/7812488c665786bcfb6256cc9d3e342f9090cbcb) Thanks [@HiDeoo](https://github.com/HiDeoo)! - Fix an issue where public assets could fail to be versioned correctly.

- [#35](https://github.com/HiDeoo/starlight-versions/pull/35) [`6014403`](https://github.com/HiDeoo/starlight-versions/commit/60144036971ee871c3195bc2a6567b6aa33734b7) Thanks [@HiDeoo](https://github.com/HiDeoo)! - Fixes an issue with asides using custom titles not being rendered correctly when versioned.

## 0.5.3

### Patch Changes

- [#29](https://github.com/HiDeoo/starlight-versions/pull/29) [`3cc3e30`](https://github.com/HiDeoo/starlight-versions/commit/3cc3e30d6b778c7615cee9c2fcb01f6225b6cb84) Thanks [@HiDeoo](https://github.com/HiDeoo)! - Fixes an issue with versioned sidebars including a link to the homepage.

## 0.5.2

### Patch Changes

- [#24](https://github.com/HiDeoo/starlight-versions/pull/24) [`113cb97`](https://github.com/HiDeoo/starlight-versions/commit/113cb975b6acc3dc3dc6d1c252048e62248dc9ed) Thanks [@HiDeoo](https://github.com/HiDeoo)! - Fixes an issue with symlinked version directories.

## 0.5.1

### Patch Changes

- [#21](https://github.com/HiDeoo/starlight-versions/pull/21) [`42be6e3`](https://github.com/HiDeoo/starlight-versions/commit/42be6e30a54fcdd5bec0959b7f354a1bc3954c14) Thanks [@HiDeoo](https://github.com/HiDeoo)! - Fixes a potential link generation issue when using the Astro [`base`](https://docs.astro.build/en/reference/configuration-reference/#base) option.

## 0.5.0

### Minor Changes

- [#18](https://github.com/HiDeoo/starlight-versions/pull/18) [`a68d559`](https://github.com/HiDeoo/starlight-versions/commit/a68d55958731e03d6c3b6ddf04eb5775a75a6862) Thanks [@HiDeoo](https://github.com/HiDeoo)! - ⚠️ **BREAKING CHANGE:** The Starlight Versions plugin no longer [overrides](https://starlight.astro.build/guides/overriding-components/) the [`<Sidebar>`](https://starlight.astro.build/reference/overrides/#sidebar) and [`<Pagination>`](https://starlight.astro.build/reference/overrides/#pagination) components. If you were manually rendering `starlight-versions/components/VersionSidebar.astro` or `starlight-versions/components/VersionPagination.astro` in a custom override, you can now remove them.

- [#18](https://github.com/HiDeoo/starlight-versions/pull/18) [`a68d559`](https://github.com/HiDeoo/starlight-versions/commit/a68d55958731e03d6c3b6ddf04eb5775a75a6862) Thanks [@HiDeoo](https://github.com/HiDeoo)! - ⚠️ **BREAKING CHANGE:** The minimum supported version of Starlight is now version `0.32.0`.

  Please use the `@astrojs/upgrade` command to upgrade your project:

  ```sh
  npx @astrojs/upgrade
  ```

## 0.4.0

### Minor Changes

- [#15](https://github.com/HiDeoo/starlight-versions/pull/15) [`ecd96ed`](https://github.com/HiDeoo/starlight-versions/commit/ecd96ed4aa4474bb418669e8113bb9e1af0f7536) Thanks [@HiDeoo](https://github.com/HiDeoo)! - Adds support for Astro v5, drops support for Astro v4.

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
