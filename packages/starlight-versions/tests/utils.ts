import { assert, expect } from 'vitest'

import type { VersionAsset } from '../libs/versions'

export function expectVersionAssetsToHaveLength(assets: VersionAsset[] | undefined, length: number) {
  expect(assets).toHaveLength(length)
}

export function expectVersionAssetToMatch(asset: VersionAsset | undefined, source: RegExp, dest: RegExp) {
  assert(asset, 'Expected an asset to be defined.')

  expect(asset.source.href).toMatch(source)
  expect(asset.dest.href).toMatch(dest)
}
