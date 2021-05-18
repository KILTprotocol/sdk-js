/**
 * @group integration/did
 */

import { disconnect, Identity, init } from '@kiltprotocol/core'
import type { IIdentity } from '@kiltprotocol/types'
import { BlockchainUtils } from '@kiltprotocol/chain-helpers'
import {
  createDeleteTx,
  createUpdateTx,
  createCreateTx,
  queryById,
} from './Did.chain'
import type { IDidRecord } from './types'
import { getDidFromIdentifier } from './Did.utils'

let alice: IIdentity

beforeAll(async () => {
  await init({ address: 'ws://localhost:9944' })

  alice = Identity.buildFromURI('//Alice')
})

describe('Did.chain', () => {
  describe('write and didDeleteTx', () => {
    let id: IIdentity
    let didIdentifier: string
    beforeAll(() => {
      id = Identity.buildFromMnemonic('')
      didIdentifier = id.address
    })

    it('writes a new did record to chain', async () => {
      const tx = await createCreateTx(
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
    }, 20_000)

    it('deactivates did from previous step', async () => {
      await expect(queryById(id.address)).resolves.toMatchObject<
        Partial<IDidRecord>
      >({
        did: getDidFromIdentifier(id.address),
      })

      const tx = await createDeleteTx(
        { didIdentifier, txCounter: 1 },
        id.signKeyringPair
      )

      await expect(
        BlockchainUtils.signAndSubmitTx(tx, alice, {
          resolveOn: BlockchainUtils.IS_IN_BLOCK,
        })
      ).resolves.not.toThrow()

      await expect(queryById(id.address)).resolves.toBe(null)
    }, 20_000)
  })

  it('creates and updates did', async () => {
    const id = Identity.buildFromMnemonic('')

    const tx = await createCreateTx(
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

    const tx2 = await createUpdateTx(
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
  }, 20_000)
})

afterAll(async () => disconnect())
