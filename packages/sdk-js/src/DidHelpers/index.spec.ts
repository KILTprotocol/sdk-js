/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { SubmittableResult } from '@polkadot/api'
import { authorizeTx, resolver } from '@kiltprotocol/did'
import type { DidDocument, KiltKeyringPair } from '@kiltprotocol/types'
import { Crypto } from '@kiltprotocol/utils'
import { ConfigService } from '../index.js'
import {
  ApiMocks,
  createLocalDemoFullDidFromKeypair,
} from '../../../../tests/testUtils/index.js'
import { transact } from './index.js'
import { TransactionResult } from './interfaces.js'
import { createDid } from './createDid.js'
import { makeAttestationCreatedEvents } from '../../../../tests/testUtils/testData.js'

jest.mock('@kiltprotocol/did', () => {
  return {
    ...jest.requireActual('@kiltprotocol/did'),
    resolver: { resolve: jest.fn() },
    authorizeTx: jest.fn(),
  }
})

const mockedApi = ApiMocks.createAugmentedApi()

describe('transact', () => {
  let didDocument: DidDocument
  let keypair: KiltKeyringPair
  beforeAll(async () => {
    ConfigService.set({ api: mockedApi })

    keypair = Crypto.makeKeypairFromUri('//Alice')
    const { id, verificationMethod, authentication } =
      await createLocalDemoFullDidFromKeypair(keypair, {
        verificationRelationships: new Set(['assertionMethod']),
      })
    didDocument = {
      id,
      authentication,
      assertionMethod: authentication,
      verificationMethod: verificationMethod?.filter(
        (vm) => vm.id === authentication![0]
      ),
    }
    jest
      .mocked(authorizeTx)
      .mockImplementation(async (did, ex, sig, sub, { txCounter } = {}) => {
        // if(!sig.find(i => i.id)) {}
        return mockedApi.tx.did.submitDidCall(
          {
            did: keypair.address,
            txCounter: txCounter ?? 0,
            call: ex,
            blockNumber: 0,
            submitter: sub,
          },
          { ed25519: new Uint8Array(64) }
        )
      })
    jest.mocked(resolver).resolve.mockImplementation((did) => {
      if (did === didDocument.id) {
        return { didDocument } as any
      }
      throw new Error()
    })
  }, 40000)

  it('creates a tx and checks status', async () => {
    const { txHex, checkResult } = await transact({
      didDocument,
      api: mockedApi,
      submitter: keypair,
      signers: [keypair],
      call: mockedApi.tx.attestation.add(
        new Uint8Array(32).fill(1),
        new Uint8Array(32).fill(1),
        null
      ),
      expectedEvents: [
        { section: 'attestation', method: 'AttestationCreated' },
      ],
    }).getSubmittable({ signSubmittable: false })

    expect(txHex).toContain('0x')
    const parsed = mockedApi.tx(txHex)
    expect(parsed.method).toMatchObject({
      section: 'attestation',
      method: 'add',
    })

    await expect(
      checkResult(
        new SubmittableResult({
          blockNumber: mockedApi.createType('BlockNumber', 1000),
          status: mockedApi.createType('ExtrinsicStatus', {
            inBlock: new Uint8Array(32).fill(2),
          }),
          txHash: parsed.hash,
          events: makeAttestationCreatedEvents([[]]),
        })
      )
    ).resolves.toMatchObject<Partial<TransactionResult>>({
      status: 'confirmed',
      asConfirmed: expect.objectContaining({
        txHash: parsed.hash.toHex(),
        block: {
          hash: mockedApi
            .createType('Hash', new Uint8Array(32).fill(2))
            .toHex(),
          number: 1000n,
        },
      }),
    })
  })

  it('create DID', async () => {
    const { txHex, checkResult } = await (
      await createDid({
        api: mockedApi,
        submitter: keypair,
        signers: [keypair],
        fromPublicKey: keypair,
      })
    ).getSubmittable({ signSubmittable: false })

    expect(txHex).toContain('0x')
    const parsed = mockedApi.tx(txHex)

    const result = await checkResult(
      new SubmittableResult({
        blockNumber: mockedApi.createType('BlockNumber', 1000),
        status: mockedApi.createType('ExtrinsicStatus', {
          inBlock: new Uint8Array(32).fill(2),
        }),
        txHash: parsed.hash,
        events: [
          {
            event: {
              method: 'didCreated',
              section: 'did',
            },
          } as any,
        ],
      })
    )

    expect(result).toMatchObject<Partial<TransactionResult>>({
      status: 'confirmed',
      asConfirmed: expect.objectContaining({
        txHash: parsed.hash.toHex(),
        block: {
          hash: mockedApi
            .createType('Hash', new Uint8Array(32).fill(2))
            .toHex(),
          number: 1000n,
        },
      }),
    })
  })
})
