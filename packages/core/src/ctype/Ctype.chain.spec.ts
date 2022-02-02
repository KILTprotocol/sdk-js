/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group unit/ctype
 */

import { TypeRegistry } from '@polkadot/types'
import { ApiPromise } from '@polkadot/api'
import { encodeAddress, randomAsHex } from '@polkadot/util-crypto'
import { ApiMocks } from '@kiltprotocol/testing'
import {
  Blockchain,
  BlockchainApiConnection,
} from '@kiltprotocol/chain-helpers'
import { DidUtils } from '@kiltprotocol/did'
import { Keyring } from '@polkadot/keyring'
import { isStored, getOwner } from './CType.chain'

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

it('resolves nonexistent ctypes to null', async () => {
  const hash = randomAsHex(32)
  await expect(isStored(hash)).resolves.toBe(false)
})

it('queries existing ctypes', async () => {
  const owner = encodeAddress(randomAsHex(32), 38)
  const hash = randomAsHex(32)
  provider.setQueryState(owner, api.query.ctype.ctypes, hash)
  await expect(isStored(hash)).resolves.toBe(true)
  await expect(getOwner(hash)).resolves.toBe(
    DidUtils.getKiltDidFromIdentifier(owner, 'full')
  )
})

it('submits request for storing ctype', (done) => {
  const hash = randomAsHex(32)
  provider.onSubmitExtrinsic = (_, extrinsic) => {
    try {
      expect(extrinsic.args[0].toHex()).toStrictEqual(hash)
      done()
    } catch (e) {
      done(e)
    }
  }
  api.tx.ctype.add(hash).send()
})

it('stores ctype (round trip)', async () => {
  const hash = randomAsHex(32)
  const alice = new Keyring({ ss58Format: 38 }).addFromUri('//Alice')
  provider.onSubmitExtrinsic = (_, extrinsic) => {
    provider.setQueryState(
      extrinsic.signer.toString(),
      api.query.ctype.ctypes,
      extrinsic.args[0]
    )
  }
  await api.tx.ctype.add(hash).signAndSend(alice)
  await expect(getOwner(hash)).resolves.toBe(
    DidUtils.getKiltDidFromIdentifier(alice.address, 'full')
  )
})

afterAll(async () => {
  await api.disconnect()
})
