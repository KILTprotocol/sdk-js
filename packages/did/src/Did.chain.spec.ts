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
import { kiltMetadata, MockProvider } from '@kiltprotocol/testing'
import {
  Blockchain,
  BlockchainApiConnection,
} from '@kiltprotocol/chain-helpers'
import { queryById } from './Did.chain'

let provider: MockProvider
let api: ApiPromise
let registry: TypeRegistry

beforeEach(async () => {
  registry = new TypeRegistry()
  provider = new MockProvider(registry, kiltMetadata)

  api = new ApiPromise({ provider })
  BlockchainApiConnection.setConnection(
    api.isReady.then((a) => new Blockchain(a))
  )
})

it('resolves nonexistent dids to null', async () => {
  const address = encodeAddress(randomAsHex(32), 38)
  await expect(queryById(address)).resolves.toBe(null)
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
  const queried = await queryById(address)
  expect(queried).toMatchObject({
    did: `did:kilt:${address}`,
    authenticationKey: `did:kilt:${address}#${keyId}`,
    publicKeys: [
      {
        id: `did:kilt:${address}#${keyId}`,
        type: 'sr25519',
        controller: `did:kilt:${address}`,
        publicKeyHex: key,
        includedAt: 1,
      },
    ],
  })
})

afterEach(async () => {
  await api.disconnect()
})
