import { expect, test } from 'vitest'

import { docsVersionsSchema } from '../schema'

test('defaults missing excluded version metadata to an empty array', () => {
  expect(docsVersionsSchema().parse({}).excluded).toEqual([])
})
