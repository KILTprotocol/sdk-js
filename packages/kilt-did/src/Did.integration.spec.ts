/**
 * @group integration/did
 */

import { Did, disconnect, Identity, init } from '@kiltprotocol/core'
import type { IIdentity } from '@kiltprotocol/types'
import { TypeRegistry } from '@polkadot/types'
import {
  BlockchainApiConnection,
  BlockchainUtils,
} from '@kiltprotocol/chain-helpers'
import { didCreateTx, didUpdateTx, didDeleteTx, queryById } from './Did.chain'
import type { IDidRecord } from './types'
import {
  encodeDidCreate,
  encodeDidDelete,
  encodeDidUpdate,
  getDidFromIdentifier,
  signCodec,
} from './Did.utils'

let alice: IIdentity
let TYPE_REGISTRY: TypeRegistry

beforeAll(async () => {
  await init({ address: 'ws://localhost:9944' })
  TYPE_REGISTRY = new TypeRegistry()
  TYPE_REGISTRY.register(BlockchainApiConnection.CUSTOM_TYPES)

  alice = Identity.buildFromURI('//Alice')
})

describe('Did.chain', () => {
  describe('write and didDeleteTx', () => {
    let id: IIdentity
    let did: string
    beforeAll(() => {
      id = Identity.buildFromMnemonic('')
      did = getDidFromIdentifier(id.address)
    })

    it('writes a new did record to chain', async () => {
      const didCreate = encodeDidCreate(
        TYPE_REGISTRY,
        did,
        {
          authentication: id.signKeyringPair,
          encryption: { ...id.boxKeyPair, type: 'x25519' },
        },
        'https://example.com'
      )

      const signed = signCodec(didCreate, id.signKeyringPair)

      await expect(
        didCreateTx(signed).then(async (tx) => {
          await tx.signAsync(alice.signKeyringPair)
          return BlockchainUtils.submitTxWithReSign(tx, alice, {
            resolveOn: BlockchainUtils.IS_IN_BLOCK,
          })
        })
      ).resolves.not.toThrow()

      await expect(queryById(id.address)).resolves.toMatchObject<
        Partial<IDidRecord>
      >({
        did: Did.getIdentifierFromAddress(id.address),
      })
    }, 20_000)

    it('deactivates did from previous step', async () => {
      await expect(queryById(id.address)).resolves.toMatchObject<
        Partial<IDidRecord>
      >({
        did: Did.getIdentifierFromAddress(id.address),
      })

      const didDeactivate = encodeDidDelete(TYPE_REGISTRY, did, 1)

      const signed = signCodec(didDeactivate, id.signKeyringPair)

      await expect(
        didDeleteTx(signed).then(async (tx) => {
          await tx.signAsync(alice.signKeyringPair)
          return BlockchainUtils.submitTxWithReSign(tx, alice, {
            resolveOn: BlockchainUtils.IS_IN_BLOCK,
          })
        })
      ).resolves.not.toThrow()

      await expect(queryById(id.address)).resolves.toBe(null)
    }, 20_000)
  })

  it('creates and updates did', async () => {
    const id = Identity.buildFromMnemonic('')
    const did = getDidFromIdentifier(id.address)

    const didCreate = encodeDidCreate(
      TYPE_REGISTRY,
      did,
      {
        authentication: id.signKeyringPair,
        encryption: { ...id.boxKeyPair, type: 'x25519' },
      },
      'https://example.com'
    )

    const signed1 = signCodec(didCreate, id.signKeyringPair)

    await expect(
      didCreateTx(signed1).then(async (tx) => {
        await tx.signAsync(alice.signKeyringPair)
        return BlockchainUtils.submitTxWithReSign(tx, alice, {
          resolveOn: BlockchainUtils.IS_IN_BLOCK,
        })
      })
    ).resolves.not.toThrow()

    await expect(queryById(id.address)).resolves.toMatchObject<
      Partial<IDidRecord>
    >({
      did: Did.getIdentifierFromAddress(id.address),
      endpointUrl: 'https://example.com',
    })

    const didUpdate = encodeDidUpdate(
      TYPE_REGISTRY,
      did,
      1,
      {},
      [],
      'ftp://example.com/abc'
    )

    const signed2 = signCodec(didUpdate, id.signKeyringPair)

    await expect(
      didUpdateTx(signed2).then(async (tx) => {
        await tx.signAsync(alice.signKeyringPair)
        return BlockchainUtils.submitTxWithReSign(tx, alice, {
          resolveOn: BlockchainUtils.IS_IN_BLOCK,
        })
      })
    ).resolves.not.toThrow()

    await expect(queryById(id.address)).resolves.toMatchObject<
      Partial<IDidRecord>
    >({
      did: Did.getIdentifierFromAddress(id.address),
      endpointUrl: 'ftp://example.com/abc',
    })
  }, 20_000)
})

afterAll(async () => await disconnect())
