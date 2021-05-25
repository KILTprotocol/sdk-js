/**
 * @group integration/did
 */

import { CType, disconnect, Identity, init } from '@kiltprotocol/core'
import type { IIdentity } from '@kiltprotocol/types'
import { BlockchainUtils } from '@kiltprotocol/chain-helpers'
import { UUID } from '@kiltprotocol/utils'
import {
  generateDeleteTx,
  generateUpdateTx,
  generateCreateTx,
  queryById,
  generateDidAuthenticatedTx,
} from './Did.chain'
import type { IDidRecord } from './types'
import { getDidFromIdentifier } from './Did.utils'

let alice: IIdentity

beforeAll(async () => {
  await init({ address: 'ws://localhost:9944' })

  alice = Identity.buildFromURI('//Alice')
})

describe('write and didDeleteTx', () => {
  let id: IIdentity
  let didIdentifier: string
  beforeAll(() => {
    id = Identity.buildFromMnemonic('')
    didIdentifier = id.address
  })

  it('writes a new DID record to chain', async () => {
    const tx = await generateCreateTx(
      {
        didIdentifier,
        keys: {
          authentication: id.signKeyringPair,
          encryption: { ...id.boxKeyPair, type: 'x25519' },
        },
        endpointUrl: 'https://example.com',
      },
      id.signKeyringPair
    )

    await expect(
      BlockchainUtils.signAndSubmitTx(tx, alice, {
        resolveOn: BlockchainUtils.IS_IN_BLOCK,
      })
    ).resolves.not.toThrow()

    await expect(queryById(id.address)).resolves.toMatchObject<
      Partial<IDidRecord>
    >({
      did: getDidFromIdentifier(id.address),
    })
  }, 30_000)

  it('deletes DID from previous step', async () => {
    await expect(queryById(id.address)).resolves.toMatchObject<
      Partial<IDidRecord>
    >({
      did: getDidFromIdentifier(id.address),
    })

    const tx = await generateDeleteTx(
      { didIdentifier, txCounter: 1 },
      id.signKeyringPair
    )

    await expect(
      BlockchainUtils.signAndSubmitTx(tx, alice, {
        resolveOn: BlockchainUtils.IS_IN_BLOCK,
      })
    ).resolves.not.toThrow()

    await expect(queryById(id.address)).resolves.toBe(null)
  }, 30_000)
})

it('creates and updates DID', async () => {
  const id = Identity.buildFromMnemonic('')

  const tx = await generateCreateTx(
    {
      didIdentifier: id.address,
      keys: {
        authentication: id.signKeyringPair,
        encryption: { ...id.boxKeyPair, type: 'x25519' },
      },
      endpointUrl: 'https://example.com',
    },
    id.signKeyringPair
  )

  await expect(
    BlockchainUtils.signAndSubmitTx(tx, alice, {
      resolveOn: BlockchainUtils.IS_IN_BLOCK,
    })
  ).resolves.not.toThrow()

  await expect(queryById(id.address)).resolves.toMatchObject<
    Partial<IDidRecord>
  >({
    did: getDidFromIdentifier(id.address),
    endpointUrl: 'https://example.com',
  })

  const tx2 = await generateUpdateTx(
    {
      didIdentifier: id.address,
      txCounter: 1,
      newEndpointUrl: 'ftp://example.com/abc',
    },
    id.signKeyringPair
  )

  await expect(
    BlockchainUtils.signAndSubmitTx(tx2, alice, {
      resolveOn: BlockchainUtils.IS_IN_BLOCK,
    })
  ).resolves.not.toThrow()

  await expect(queryById(id.address)).resolves.toMatchObject<
    Partial<IDidRecord>
  >({
    did: getDidFromIdentifier(id.address),
    endpointUrl: 'ftp://example.com/abc',
  })
}, 40_000)

describe('DID authorization', () => {
  let id: IIdentity
  beforeAll(async () => {
    id = Identity.buildFromMnemonic('')
    const tx = await generateCreateTx(
      {
        didIdentifier: id.address,
        keys: {
          authentication: id.signKeyringPair,
          encryption: { ...id.boxKeyPair, type: 'x25519' },
          attestation: id.signKeyringPair,
          delegation: id.signKeyringPair,
        },
        endpointUrl: 'https://example.com',
      },
      id.signKeyringPair
    )
    await expect(
      BlockchainUtils.signAndSubmitTx(tx, alice, {
        resolveOn: BlockchainUtils.IS_IN_BLOCK,
      })
    ).resolves.not.toThrow()

    await expect(queryById(id.address)).resolves.toMatchObject<
      Partial<IDidRecord>
    >({
      did: getDidFromIdentifier(id.address),
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
    const tx = await generateDidAuthenticatedTx(
      {
        didIdentifier: id.address,
        txCounter: 1,
        call,
      },
      id.signKeyringPair
    )
    await expect(
      BlockchainUtils.signAndSubmitTx(tx, alice, {
        resolveOn: BlockchainUtils.IS_IN_BLOCK,
      })
    ).resolves.not.toThrow()

    await expect(ctype.verifyStored()).resolves.toEqual(true)
  }, 30_000)

  it('no longer authorizes ctype creation after DID deletion', async () => {
    const tx = await generateDeleteTx(
      { didIdentifier: id.address, txCounter: 2 },
      id.signKeyringPair
    )

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
    const tx2 = await generateDidAuthenticatedTx(
      {
        didIdentifier: id.address,
        txCounter: 1,
        call,
      },
      id.signKeyringPair
    )
    await expect(
      BlockchainUtils.signAndSubmitTx(tx2, alice, {
        resolveOn: BlockchainUtils.IS_IN_BLOCK,
      })
    ).rejects.toThrow()

    await expect(ctype.verifyStored()).resolves.toEqual(false)
  }, 40_000)
})

afterAll(async () => disconnect())
