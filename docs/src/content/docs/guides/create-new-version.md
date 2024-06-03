---
title: Create a New Version
description: Learn how to create a new version of your documentation using the Starlight Versions plugin.
sidebar:
  order: 1
---

The Starlight Versions plugin allows you to create multiple versions of your documentation pages.
This guide will walk you through the process of creating a new version of your documentation.

## Configure the new version

To create a new version of your documentation, you need to configure it in the plugin [configuration](/configuration/) in the `astro.config.mjs` file.

The following example shows how to add a new version `2.0` to your documentation:

```diff lang="js"
// astro.config.mjs
import starlight from '@astrojs/starlight'
import { defineConfig } from 'astro/config'
import starlightVersions from 'starlight-versions'

export default defineConfig({
  integrations: [
    starlight({
      plugins: [
        starlightVersions({
          versions: [
+            {
+              slug: '2.0',
+            },
            {
              slug: '1.0',
            },
          ],
        }),
      ],
      title: 'My Docs',
    }),
  ],
})
```

You can optionally configure the new version with a [`label`](/configuration/#label) and a [`redirect` strategy](/configuration/#redirect).

## Archive the current version

After configuring the new version, [start the development server](https://starlight.astro.build/getting-started/#start-the-development-server) in your project:

- The current version of your documentation will be archived as the newly configured `2.0` version.
- You can continue to work on the current version of your documentation.
