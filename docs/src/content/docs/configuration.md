---
title: Configuration
description: An overview of all the configuration options supported by the Starlight Versions plugin.
---

The Starlight Versions plugin can be configured inside the `astro.config.mjs` configuration file of your project:

```js {11}
// astro.config.mjs
import starlight from '@astrojs/starlight'
import { defineConfig } from 'astro/config'
import starlightVersions from 'starlight-versions'

export default defineConfig({
  integrations: [
    starlight({
      plugins: [
        starlightVersions({
          // Configuration options go here.
        }),
      ],
      title: 'My Docs',
    }),
  ],
})
```

## Configuration options

The Starlight Versions plugin accepts the following configuration options:

### `versions`

**Required**  
**Type:** <code><a href="#version-configuration">StarlightVersionConfig</a>[]</code>

A list of all archived versions of the documentation.
See the [version configuration](#version-configuration) section or the [“Create a New Version”](/guides/create-new-version/) guide for more details.

### `current`

**Type:** [`StarlightCurrentVersionConfig`](#current-version-configuration)

The configuration for the current version of the documentation.
See the [current version configuration](#version-configuration) section for more details.

## Version configuration

A version configuration object is used to define a version.

```js {7-10}
export default defineConfig({
  integrations: [
    starlight({
      plugins: [
        starlightVersions({
          versions: [
            {
              slug: '1.0',
              label: 'v1.0',
            },
          ],
        }),
      ],
    }),
  ],
})
```

The following properties are supported by a version configuration object:

### `slug`

**Required**  
**Type:** `string`

The version slug used in URLs to identify the version and its content, e.g. `1.0` or `2-1-0`.

### `label`

**Type:** `string`  
**Default:** the version [`slug`](#slug)

An optional label used in the UI when displaying the version, e.g. `v1.0`.
If not provided, the version slug is used.

### `redirect`

**Type:** `'same-page' | 'root'`  
**Default:** `'same-page'`

The version [redirect strategy](#redirect-strategies) used when navigating to this version.

## Current version configuration

The current version can be configured using the `current` option.

```js {6-8}
export default defineConfig({
  integrations: [
    starlight({
      plugins: [
        starlightVersions({
          current: {
            label: 'v3.0',
          },
        }),
      ],
    }),
  ],
})
```

The current version can be configured using the following properties:

### `label`

**Type:** `string`  
**Default:** `'Latest'`

An optional label used in the UI for the current version.

### `redirect`

**Type:** `'same-page' | 'root'`  
**Default:** `'same-page'`

The version [redirect strategy](#redirect-strategies) used when navigating to the current version.

## Redirect strategies

When navigating to a different version, the plugin supports two redirect strategies:

- `same-page`: Redirect to the same page when navigating to this version.
- `root`: Redirect to the root page of the documentation when navigating to this version.
