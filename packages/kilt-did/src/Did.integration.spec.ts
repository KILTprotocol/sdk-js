/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group integration/did
 */

import { CType, disconnect, Identity, init } from '@kiltprotocol/core'
import type { IIdentity } from '@kiltprotocol/types'
import { BlockchainUtils } from '@kiltprotocol/chain-helpers'
import { UUID } from '@kiltprotocol/utils'
import { encodeAddress } from '@polkadot/keyring'
import {
  generateDeleteTx,
  generateUpdateTx,
  generateCreateTx,
  queryById,
  generateDidAuthenticatedTx,
} from './Did.chain'
import type { IDidRecord, IPublicKey, KeystoreSigner } from './types'
import { getDidFromIdentifier } from './Did.utils'
import { DemoKeystore } from './DemoKeystore/DemoKeystore'

let alice: IIdentity
const keystore = new DemoKeystore()

beforeAll(async () => {
  await init({ address: 'ws://localhost:9944' })
  alice = Identity.buildFromURI('//Alice')
})

describe('write and didDeleteTx', () => {
  let didIdentifier: string
  let key: IPublicKey & { id: string }
  beforeAll(async () => {
    const { keyId, publicKey, alg } = await keystore.generateKeypair({
      alg: 'ed25519',
    })
    didIdentifier = encodeAddress(publicKey)
    key = { publicKey, id: keyId, type: alg }
  })

  it('writes a new DID record to chain', async () => {
    const tx = await generateCreateTx({
      didIdentifier,
      keys: {
        authentication: key,
      },
      endpointUrl: 'https://example.com',
      signer: keystore as KeystoreSigner<string>,
      signingKeyId: key.id,
      alg: key.type,
    })

    await expect(
      BlockchainUtils.signAndSubmitTx(tx, alice, {
        resolveOn: BlockchainUtils.IS_IN_BLOCK,
      })
    ).resolves.not.toThrow()

    await expect(queryById(didIdentifier)).resolves.toMatchObject<
      Partial<IDidRecord>
    >({
      did: getDidFromIdentifier(didIdentifier),
    })
  }, 30_000)

  it('deletes DID from previous step', async () => {
    await expect(queryById(didIdentifier)).resolves.toMatchObject<
      Partial<IDidRecord>
    >({
      did: getDidFromIdentifier(didIdentifier),
    })

    const tx = await generateDeleteTx({
      didIdentifier,
      txCounter: 1,
      signer: keystore as KeystoreSigner<string>,
      signingKeyId: key.id,
      alg: key.type,
    })

    await expect(
      BlockchainUtils.signAndSubmitTx(tx, alice, {
        resolveOn: BlockchainUtils.IS_IN_BLOCK,
      })
    ).resolves.not.toThrow()

    await expect(queryById(didIdentifier)).resolves.toBe(null)
  }, 30_000)
})

it('creates and updates DID', async () => {
  const { keyId, publicKey, alg } = await keystore.generateKeypair({
    alg: 'ed25519',
  })
  const didIdentifier = encodeAddress(publicKey)
  const key: IPublicKey & { id: string } = { publicKey, id: keyId, type: alg }

  const tx = await generateCreateTx({
    didIdentifier,
    keys: {
      authentication: key,
    },
    endpointUrl: 'https://example.com',
    signer: keystore as KeystoreSigner<string>,
    signingKeyId: key.id,
    alg: key.type,
  })

  await expect(
    BlockchainUtils.signAndSubmitTx(tx, alice, {
      resolveOn: BlockchainUtils.IS_IN_BLOCK,
    })
  ).resolves.not.toThrow()

  await expect(queryById(didIdentifier)).resolves.toMatchObject<
    Partial<IDidRecord>
  >({
    did: getDidFromIdentifier(didIdentifier),
    endpointUrl: 'https://example.com',
  })

  const tx2 = await generateUpdateTx({
    didIdentifier,
    txCounter: 1,
    newEndpointUrl: 'ftp://example.com/abc',
    signer: keystore as KeystoreSigner<string>,
    signingKeyId: key.id,
    alg: key.type,
  })

  await expect(
    BlockchainUtils.signAndSubmitTx(tx2, alice, {
      resolveOn: BlockchainUtils.IS_IN_BLOCK,
    })
  ).resolves.not.toThrow()

  await expect(queryById(didIdentifier)).resolves.toMatchObject<
    Partial<IDidRecord>
  >({
    did: getDidFromIdentifier(didIdentifier),
    endpointUrl: 'ftp://example.com/abc',
  })
}, 40_000)

describe('DID authorization', () => {
  let didIdentifier: string
  let key: IPublicKey & { id: string }
  beforeAll(async () => {
    const { keyId, publicKey, alg } = await keystore.generateKeypair({
      alg: 'ed25519',
    })
    didIdentifier = encodeAddress(publicKey)
    key = { publicKey, id: keyId, type: alg }
    const tx = await generateCreateTx({
      didIdentifier,
      keys: {
        authentication: key,
        attestation: key,
        delegation: key,
      },
      endpointUrl: 'https://example.com',
      signer: keystore as KeystoreSigner<string>,
      signingKeyId: key.id,
      alg: key.type,
    })
    await expect(
      BlockchainUtils.signAndSubmitTx(tx, alice, {
        resolveOn: BlockchainUtils.IS_IN_BLOCK,
      })
    ).resolves.not.toThrow()

    await expect(queryById(didIdentifier)).resolves.toMatchObject<
      Partial<IDidRecord>
    >({
      did: getDidFromIdentifier(didIdentifier),
    })
  }, 30_000)

  it('authorizes ctype creation with DID signature', async () => {
    const ctype = CType.fromSchema({
      title: UUID.generate(),
      properties: {},
      type: 'object',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
    })
    const call = await ctype.store()
    const tx = await generateDidAuthenticatedTx({
      didIdentifier,
      txCounter: 1,
      call,
      signer: keystore as KeystoreSigner<string>,
      signingKeyId: key.id,
      alg: key.type,
    })
    await expect(
      BlockchainUtils.signAndSubmitTx(tx, alice, {
        resolveOn: BlockchainUtils.IS_IN_BLOCK,
      })
    ).resolves.not.toThrow()

    await expect(ctype.verifyStored()).resolves.toEqual(true)
  }, 30_000)

  it('no longer authorizes ctype creation after DID deletion', async () => {
    const tx = await generateDeleteTx({
      didIdentifier,
      txCounter: 2,
      signer: keystore as KeystoreSigner<string>,
      signingKeyId: key.id,
      alg: key.type,
    })

    await expect(
      BlockchainUtils.signAndSubmitTx(tx, alice, {
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
    const tx2 = await generateDidAuthenticatedTx({
      didIdentifier,
      txCounter: 1,
      call,
      signer: keystore as KeystoreSigner<string>,
      signingKeyId: key.id,
      alg: key.type,
    })
    await expect(
      BlockchainUtils.signAndSubmitTx(tx2, alice, {
        resolveOn: BlockchainUtils.IS_IN_BLOCK,
      })
    ).rejects.toThrow()

    await expect(ctype.verifyStored()).resolves.toEqual(false)
  }, 40_000)
})

afterAll(async () => disconnect())
