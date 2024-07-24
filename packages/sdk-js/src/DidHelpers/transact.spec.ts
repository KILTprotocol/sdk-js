/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { authorizeTx, resolver } from '@kiltprotocol/did'
import type {
  DidDocument,
  KiltKeyringPair,
  TransactionResult,
} from '@kiltprotocol/types'
import { Crypto } from '@kiltprotocol/utils'
import { SubmittableResult } from '@polkadot/api'

import {
  ApiMocks,
  createLocalDemoFullDidFromKeypair,
} from '../../../../tests/testUtils/index.js'
import { makeAttestationCreatedEvents } from '../../../../tests/testUtils/testData.js'
import { ConfigService } from '../index.js'
import { transact } from './transact.js'

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
    didDocument = await createLocalDemoFullDidFromKeypair(keypair)
    jest
      .mocked(authorizeTx)
      .mockImplementation(async (_did, ex, _sig, sub, { txCounter } = {}) => {
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
    expect(parsed.method).toHaveProperty('section', 'did')
    expect(parsed.method).toHaveProperty('method', 'submitDidCall')

    const result = await checkResult(
      new SubmittableResult({
        blockNumber: mockedApi.createType('BlockNumber', 1000),
        status: mockedApi.createType('ExtrinsicStatus', {
          inBlock: new Uint8Array(32).fill(2),
        }),
        txHash: parsed.hash,
        events: makeAttestationCreatedEvents([[]]),
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
    // TODO move serialzation test to `checkResult.spec.ts` once created and
    // test the `asFailed` case.
    const confirmed = result.asConfirmed
    expect(typeof confirmed.block.number).toBe('bigint')
    const resultStringified = JSON.stringify(confirmed)
    const resultRebuiltObj = JSON.parse(resultStringified)
    expect(BigInt(resultRebuiltObj.block.number)).toBe(BigInt(1000))
    expect(typeof confirmed.block.number).toBe('bigint')
    expect(result.toJSON()).toStrictEqual({
      status: 'confirmed',
      value: confirmed.toJSON(),
    })
  })
})
