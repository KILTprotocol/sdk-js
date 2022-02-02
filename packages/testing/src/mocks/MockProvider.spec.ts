/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group unit/mocks
 */

import { TypeRegistry } from '@polkadot/types'
import { ApiPromise } from '@polkadot/api'
import { encodeAddress, randomAsHex } from '@polkadot/util-crypto'
import { MockProvider } from './MockProvider'

let provider: MockProvider
let api: ApiPromise
let registry: TypeRegistry

beforeEach(async () => {
  registry = new TypeRegistry()
  provider = new MockProvider(registry)

  api = new ApiPromise({ provider })
  await api.isReady
})

it('mocks empty storage by default', async () => {
  const ctypeHash = randomAsHex(32)
  const result = await api.query.ctype.ctypes(ctypeHash)
  expect(result.toRawType()).toEqual('Option<AccountId32>')
  expect(result.isEmpty).toBe(true)
})

it('sets and unsets state', async () => {
  const ctypeHash = randomAsHex(32)
  const owner = registry.createType('AccountId32', randomAsHex(32))

  await expect(api.query.ctype.ctypes(ctypeHash)).resolves.toHaveProperty(
    'isSome',
    false
  )

  provider.setState(owner, api.query.ctype.ctypes.key(ctypeHash))
  await expect(api.query.ctype.ctypes(ctypeHash)).resolves.toHaveProperty(
    'isSome',
    true
  )
  await expect(
    api.query.ctype.ctypes(ctypeHash).then((r) => r.toHex())
  ).resolves.toEqual(owner.toHex())

  provider.unsetState(api.query.ctype.ctypes.key(ctypeHash))
  await expect(api.query.ctype.ctypes(ctypeHash)).resolves.toHaveProperty(
    'isSome',
    false
  )
})

it('sets state via helper', async () => {
  const ctypeHash = randomAsHex(32)
  const owner = randomAsHex(32)

  await expect(api.query.ctype.ctypes(ctypeHash)).resolves.toHaveProperty(
    'isSome',
    false
  )

  provider.setQueryState(owner, api.query.ctype.ctypes, ctypeHash)
  await expect(api.query.ctype.ctypes(ctypeHash)).resolves.toHaveProperty(
    'isSome',
    true
  )
  await expect(
    api.query.ctype.ctypes(ctypeHash).then((r) => r.toJSON())
  ).resolves.toEqual(encodeAddress(owner, 38))

  provider.unsetState(api.query.ctype.ctypes.key(ctypeHash))
  await expect(api.query.ctype.ctypes(ctypeHash)).resolves.toHaveProperty(
    'isSome',
    false
  )
})

it('allows simple extrinsic submission', async () => {
  const tx = api.tx.balances.transfer(randomAsHex(32), 1000)
  await expect(tx.send().then((r) => r.toHex())).resolves.toEqual(
    tx.hash.toHex()
  )
})

afterEach(async () => {
  await api.disconnect()
})
