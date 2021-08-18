/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group integration/did
 */

import type { KeystoreSigner } from '@kiltprotocol/types'
import { Crypto, UUID } from '@kiltprotocol/utils'
import { encodeAddress } from '@polkadot/keyring'
import { DemoKeystore, DidChain, DidTypes, DidUtils } from '@kiltprotocol/did'
import {
  BlockchainUtils,
  BlockchainApiConnection,
} from '@kiltprotocol/chain-helpers'
import { KeyRelationship } from '@kiltprotocol/types'
import { KeyringPair } from '@polkadot/keyring/types'
import { disconnect, init } from '../kilt'

import { CType } from '../ctype'
import { devAlice } from './utils'

let paymentAccount: KeyringPair
const keystore = new DemoKeystore()

beforeAll(async () => {
  await init({ address: 'ws://localhost:9944' })
  paymentAccount = devAlice
})

describe('write and didDeleteTx', () => {
  let didIdentifier: string
  let key: DidTypes.INewPublicKey
  beforeAll(async () => {
    const { publicKey, alg } = await keystore.generateKeypair({
      alg: 'ed25519',
    })
    didIdentifier = encodeAddress(publicKey)
    key = { publicKey, type: alg }
  })

  it('writes a new DID record to chain', async () => {
    const tx = await DidChain.generateCreateTx({
      didIdentifier,
      endpointData: {
        urls: ['https://example.com'],
        contentHash: Crypto.hashStr('look I made you some content!'),
        contentType: 'application/json',
      },
      signer: keystore as KeystoreSigner<string>,
      signingPublicKey: key.publicKey,
      alg: key.type,
    })

    await expect(
      BlockchainUtils.signAndSubmitTx(tx, paymentAccount, {
        resolveOn: BlockchainUtils.IS_IN_BLOCK,
      })
    ).resolves.not.toThrow()

    await expect(DidChain.queryById(didIdentifier)).resolves.toMatchObject<
      Partial<DidTypes.IDidRecord>
    >({
      did: DidUtils.getKiltDidFromIdentifier(didIdentifier),
    })
  }, 30_000)

  it('deletes DID from previous step', async () => {
    await expect(DidChain.queryById(didIdentifier)).resolves.toMatchObject<
      Partial<DidTypes.IDidRecord>
    >({
      did: DidUtils.getKiltDidFromIdentifier(didIdentifier),
    })

    const call = await DidChain.getDeleteDidExtrinsic()

    const submittable = await DidChain.generateDidAuthenticatedTx({
      didIdentifier,
      txCounter: 1,
      call,
      signer: keystore as KeystoreSigner<string>,
      signingPublicKey: key.publicKey,
      alg: key.type,
    })

    await expect(
      BlockchainUtils.signAndSubmitTx(submittable, paymentAccount, {
        resolveOn: BlockchainUtils.IS_IN_BLOCK,
      })
    ).resolves.not.toThrow()

    await expect(DidChain.queryById(didIdentifier)).resolves.toBe(null)
  }, 30_000)
})

it('creates and updates DID', async () => {
  const { publicKey, alg } = await keystore.generateKeypair({
    alg: 'ed25519',
  })
  const didIdentifier = encodeAddress(publicKey)
  const key: DidTypes.INewPublicKey = { publicKey, type: alg }

  const tx = await DidChain.generateCreateTx({
    didIdentifier,
    endpointData: {
      urls: ['https://example.com'],
      contentHash: Crypto.hashStr('daddy made you your favorite, open wide'),
      contentType: 'application/json',
    },
    signer: keystore as KeystoreSigner<string>,
    signingPublicKey: key.publicKey,
    alg: key.type,
  })

  await expect(
    BlockchainUtils.signAndSubmitTx(tx, paymentAccount, {
      resolveOn: BlockchainUtils.IS_IN_BLOCK,
    })
  ).resolves.not.toThrow()

  await expect(DidChain.queryById(didIdentifier)).resolves.toMatchObject<
    Partial<DidTypes.IDidRecord>
  >({
    did: DidUtils.getKiltDidFromIdentifier(didIdentifier),
    endpointData: {
      urls: ['https://example.com'],
      contentType: 'application/json',
      contentHash: expect.any(String),
    },
  })

  const updateEndpointCall = await DidChain.getSetEndpointDataExtrinsic({
    urls: ['ftp://example.com/abc'],
    contentHash: Crypto.hashStr('here comes the content'),
    contentType: 'application/ld+json',
  })

  const tx2 = await DidChain.generateDidAuthenticatedTx({
    didIdentifier,
    txCounter: 1,
    call: updateEndpointCall,
    signer: keystore as KeystoreSigner<string>,
    signingPublicKey: key.publicKey,
    alg: key.type,
  })

  await expect(
    BlockchainUtils.signAndSubmitTx(tx2, paymentAccount, {
      resolveOn: BlockchainUtils.IS_IN_BLOCK,
    })
  ).resolves.not.toThrow()

  await expect(DidChain.queryById(didIdentifier)).resolves.toMatchObject<
    Partial<DidTypes.IDidRecord>
  >({
    did: DidUtils.getKiltDidFromIdentifier(didIdentifier),
    endpointData: {
      urls: ['ftp://example.com/abc'],
      contentType: 'application/ld+json',
      contentHash: expect.any(String),
    },
  })
}, 40_000)

describe('DID authorization', () => {
  let didIdentifier: string
  let key: DidTypes.INewPublicKey
  let lastTxIndex = BigInt(0)
  beforeAll(async () => {
    const { publicKey, alg } = await keystore.generateKeypair({
      alg: 'ed25519',
    })
    didIdentifier = encodeAddress(publicKey)
    key = { publicKey, type: alg }
    const tx = await DidChain.generateCreateTx({
      didIdentifier,
      keys: {
        [KeyRelationship.assertionMethod]: key,
        [KeyRelationship.capabilityDelegation]: key,
      },
      signer: keystore as KeystoreSigner<string>,
      signingPublicKey: key.publicKey,
      alg: key.type,
    })
    await expect(
      BlockchainUtils.signAndSubmitTx(tx, paymentAccount, {
        resolveOn: BlockchainUtils.IS_IN_BLOCK,
      })
    ).resolves.not.toThrow()

    await expect(DidChain.queryById(didIdentifier)).resolves.toMatchObject<
      Partial<DidTypes.IDidRecord>
    >({
      did: DidUtils.getKiltDidFromIdentifier(didIdentifier),
    })
  }, 30_000)

  beforeEach(async () => {
    lastTxIndex = await DidChain.queryLastTxIndex(
      DidUtils.getKiltDidFromIdentifier(didIdentifier)
    )
  })

  it('authorizes ctype creation with DID signature', async () => {
    const ctype = CType.fromSchema({
      title: UUID.generate(),
      properties: {},
      type: 'object',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
    })
    const call = await ctype.store()
    const tx = await DidChain.generateDidAuthenticatedTx({
      didIdentifier,
      txCounter: lastTxIndex + BigInt(1),
      call,
      signer: keystore as KeystoreSigner<string>,
      signingPublicKey: key.publicKey,
      alg: key.type,
    })
    await expect(
      BlockchainUtils.signAndSubmitTx(tx, paymentAccount, {
        resolveOn: BlockchainUtils.IS_IN_BLOCK,
      })
    ).resolves.not.toThrow()

    await expect(ctype.verifyStored()).resolves.toEqual(true)
  }, 30_000)

  it.skip('authorizes batch with DID signature', async () => {
    const ctype1 = CType.fromSchema({
      title: UUID.generate(),
      properties: {},
      type: 'object',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
    })
    const ctype2 = CType.fromSchema({
      title: UUID.generate(),
      properties: {},
      type: 'object',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
    })
    const calls = await Promise.all([ctype1, ctype2].map((c) => c.store()))
    const batch = await BlockchainApiConnection.getConnectionOrConnect().then(
      ({ api }) => api.tx.utility.batch(calls)
    )
    const tx = await DidChain.generateDidAuthenticatedTx({
      didIdentifier,
      txCounter: lastTxIndex + BigInt(1),
      call: batch,
      signer: keystore as KeystoreSigner<string>,
      signingPublicKey: key.publicKey,
      alg: key.type,
    })
    await expect(
      BlockchainUtils.signAndSubmitTx(tx, paymentAccount, {
        resolveOn: BlockchainUtils.IS_IN_BLOCK,
      })
    ).resolves.not.toThrow()

    await expect(ctype1.verifyStored()).resolves.toEqual(true)
    await expect(ctype2.verifyStored()).resolves.toEqual(true)
  }, 30_000)

  it('no longer authorizes ctype creation after DID deletion', async () => {
    const deleteCall = await DidChain.getDeleteDidExtrinsic()
    const tx = await DidChain.generateDidAuthenticatedTx({
      didIdentifier,
      txCounter: lastTxIndex + BigInt(1),
      call: deleteCall,
      signer: keystore as KeystoreSigner<string>,
      signingPublicKey: key.publicKey,
      alg: key.type,
    })

    await expect(
      BlockchainUtils.signAndSubmitTx(tx, paymentAccount, {
        resolveOn: BlockchainUtils.IS_IN_BLOCK,
      })
    ).resolves.not.toThrow()

    const ctype = CType.fromSchema({
      title: UUID.generate(),
      properties: {},
      type: 'object',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
    })
    const call = await ctype.store()
    const tx2 = await DidChain.generateDidAuthenticatedTx({
      didIdentifier,
      txCounter: lastTxIndex + BigInt(2),
      call,
      signer: keystore as KeystoreSigner<string>,
      signingPublicKey: key.publicKey,
      alg: key.type,
    })
    await expect(
      BlockchainUtils.signAndSubmitTx(tx2, paymentAccount, {
        resolveOn: BlockchainUtils.IS_IN_BLOCK,
      })
    ).rejects.toThrow()

    await expect(ctype.verifyStored()).resolves.toEqual(false)
  }, 40_000)
})

afterAll(async () => disconnect())
