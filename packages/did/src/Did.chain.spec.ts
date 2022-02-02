/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group unit/did
 */

import { TypeRegistry } from '@polkadot/types'
import { ApiPromise } from '@polkadot/api'
import { encodeAddress, randomAsHex } from '@polkadot/util-crypto'
import { ApiMocks } from '@kiltprotocol/testing'
import {
  Blockchain,
  BlockchainApiConnection,
} from '@kiltprotocol/chain-helpers'
import { BN, hexToU8a } from '@polkadot/util'
import { queryDetails } from './Did.chain'

let provider: ApiMocks.MockProvider
let api: ApiPromise
let registry: TypeRegistry

beforeAll(async () => {
  registry = new TypeRegistry()
  provider = new ApiMocks.MockProvider(registry)

  api = new ApiPromise({ provider })
  BlockchainApiConnection.setConnection(
    api.isReady.then((a) => new Blockchain(a))
  )
})

afterEach(() => {
  provider.resetState()
})

it('resolves nonexistent dids to null', async () => {
  const address = encodeAddress(randomAsHex(32), 38)
  await expect(queryDetails(address)).resolves.toBe(null)
})

it('queries existing dids', async () => {
  const address = encodeAddress(randomAsHex(32), 38)
  const keyId = randomAsHex(32)
  const key = randomAsHex(32)
  const didInfos = {
    lastTxCounter: 0,
    authenticationKey: keyId,
    publicKeys: {
      [keyId]: {
        blockNumber: 1,
        key: { PublicVerificationKey: { sr25519: key } },
      },
    },
  }
  provider.setQueryState(didInfos, api.query.did.did, address)
  const queried = await queryDetails(address)
  expect(queried).toMatchObject({
    authenticationKey: keyId,
    publicKeys: [
      {
        id: keyId,
        type: 'sr25519',
        publicKey: hexToU8a(key),
        includedAt: new BN(1),
      },
    ],
  })
})

afterAll(async () => {
  await api.disconnect()
})
