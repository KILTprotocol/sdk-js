/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { resolver } from '@kiltprotocol/did'
import type { KiltKeyringPair, TransactionResult } from '@kiltprotocol/types'
import { Crypto } from '@kiltprotocol/utils'
import { SubmittableResult } from '@polkadot/api'
import {
  ApiMocks,
  createLocalDemoFullDidFromKeypair,
} from '../../../../tests/testUtils/index.js'
import { ConfigService } from '../index.js'
import { createDid } from './createDid.js'

const mockedApi = ApiMocks.createAugmentedApi()
jest.mock('@kiltprotocol/did', () => {
  return {
    ...jest.requireActual('@kiltprotocol/did'),
    resolver: { resolve: jest.fn() },
    authorizeTx: jest.fn(),
  }
})

describe('createDid', () => {
  let keypair: KiltKeyringPair
  beforeAll(async () => {
    ConfigService.set({ api: mockedApi })

    keypair = Crypto.makeKeypairFromUri('//Alice')
    const didDocument = await createLocalDemoFullDidFromKeypair(keypair)
    jest.mocked(resolver).resolve.mockImplementation((did) => {
      if (did === didDocument.id) {
        return { didDocument } as any
      }
      throw new Error()
    })
  })

  it('creates create did tx', async () => {
    const { txHex, checkResult } = await createDid({
      api: mockedApi,
      submitter: keypair,
      signers: [keypair],
      fromPublicKey: keypair,
    }).getSubmittable({ signSubmittable: false })

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
