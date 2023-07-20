/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group unit/caip
 */

import { spiritnetGenesisHash } from '../constants'
import { chainIdFromGenesis, parse as parseCaip2 } from './caip2'
import { parse as parseCaip19 } from './caip19'

it('parses a CAIP-2 chain id', () => {
  const chainId = chainIdFromGenesis(spiritnetGenesisHash)
  expect(chainId).toMatchInlineSnapshot(
    `"polkadot:411f057b9107718c9624d6aa4a3f23c1"`
  )
  expect(parseCaip2(chainId)).toMatchInlineSnapshot(`
    {
      "chainNamespace": "polkadot",
      "chainReference": "411f057b9107718c9624d6aa4a3f23c1",
    }
  `)
})

it('throws if CAIP-2 identifier not valid', () => {
  expect(() =>
    parseCaip2('http://example.com')
  ).toThrowErrorMatchingInlineSnapshot(
    `"not a valid CAIP-2 identifier: http://example.com"`
  )
})

it('parses a CAIP-19 asset id', () => {
  expect(parseCaip19('polkadot:1234567890abcdef/jabba:dabba/asset10'))
    .toMatchInlineSnapshot(`
    {
      "assetId": "jabba:dabba/asset10",
      "assetInstance": "asset10",
      "assetNamespace": "jabba",
      "assetReference": "dabba",
      "chainId": "polkadot:1234567890abcdef",
      "chainNamespace": "polkadot",
      "chainReference": "1234567890abcdef",
    }
  `)
})

it('throws if CAIP-2 identifier not valid', () => {
  expect(() =>
    parseCaip19('polkadot:1234567890abcdef')
  ).toThrowErrorMatchingInlineSnapshot(
    `"not a valid CAIP-19 identifier: polkadot:1234567890abcdef"`
  )
})
