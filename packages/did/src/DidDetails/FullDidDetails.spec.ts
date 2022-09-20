/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { BN } from '@polkadot/util'
import { randomAsHex } from '@polkadot/util-crypto'

import type {
  DidDocument,
  DidServiceEndpoint,
  DidUri,
  KiltKeyringPair,
  SignCallback,
  SubmittableExtrinsic,
} from '@kiltprotocol/types'
import {
  ApiMocks,
  createLocalDemoFullDidFromKeypair,
  makeSigningKeyTool,
} from '@kiltprotocol/testing'
import { ConfigService } from '@kiltprotocol/config'

import type { EncodedDid } from '../Did.chain'
import {
  generateDidAuthenticatedTx,
  didFromChain,
  servicesFromChain,
} from '../Did.chain'

import * as Did from './index.js'

/* eslint-disable @typescript-eslint/no-non-null-assertion */

/**
 * @group unit/did
 */

const augmentedApi = ApiMocks.createAugmentedApi()
const mockedApi: any = ApiMocks.getMockedApi()
ConfigService.set({ api: mockedApi })

const existingAddress = '4rp4rcDHP71YrBNvDhcH5iRoM3YzVoQVnCZvQPwPom9bjo2e'
const existingDid: DidUri = `did:kilt:${existingAddress}`
const nonExistingDid: DidUri = `did:kilt:4pnAJ41mGHGDKCGBGY2zzu1hfvPasPkGAKDgPeprSkxnUmGM`

const existingDidRecord: EncodedDid = {
  authentication: [
    {
      id: '#auth1',
      publicKey: new Uint8Array(32).fill(0),
      type: 'sr25519',
      includedAt: new BN(0),
    },
  ],
  keyAgreement: [
    {
      id: '#enc1',
      publicKey: new Uint8Array(32).fill(1),
      type: 'x25519',
      includedAt: new BN(0),
    },
    {
      id: '#enc2',
      publicKey: new Uint8Array(32).fill(2),
      type: 'x25519',
      includedAt: new BN(0),
    },
  ],
  assertionMethod: [
    {
      id: '#att1',
      publicKey: new Uint8Array(32).fill(3),
      type: 'ed25519',
      includedAt: new BN(0),
    },
  ],
  capabilityDelegation: [
    {
      id: '#del1',
      publicKey: new Uint8Array(32).fill(4),
      type: 'ecdsa',
      includedAt: new BN(0),
    },
  ],
  lastTxCounter: new BN('1'),
  deposit: {
    amount: new BN(2),
    owner: existingAddress,
  },
}

const existingServiceEndpoints: DidServiceEndpoint[] = [
  {
    id: '#service1',
    type: ['type-1'],
    serviceEndpoint: ['url-1'],
  },
  {
    id: '#service2',
    type: ['type-2'],
    serviceEndpoint: ['url-2'],
  },
]

jest.mock('../Did.chain')
jest.mocked(didFromChain).mockReturnValue(existingDidRecord)
jest.mocked(servicesFromChain).mockReturnValue(existingServiceEndpoints)
jest
  .mocked(generateDidAuthenticatedTx)
  .mockResolvedValue({} as SubmittableExtrinsic)

mockedApi.query.did.did.mockReturnValue(
  ApiMocks.mockChainQueryReturn('did', 'did', [
    '01234567890123456789012345678901',
    [],
    undefined,
    undefined,
    [],
    '123',
    [existingAddress, '0'],
  ])
)

/*
 * Functions tested:
 * - query
 *
 * Functions tested in integration tests:
 * - getKeysForExtrinsic
 * - authorizeExtrinsic
 */

describe('When creating an instance from the chain', () => {
  it('correctly assign the right keys and the right service endpoints', async () => {
    const fullDid = await Did.query(existingDid)

    expect(fullDid).not.toBeNull()
    if (!fullDid) throw new Error('Cannot load created DID')

    expect(fullDid).toEqual(<DidDocument>{
      uri: 'did:kilt:4rp4rcDHP71YrBNvDhcH5iRoM3YzVoQVnCZvQPwPom9bjo2e',
      authentication: [
        {
          id: '#auth1',
          publicKey: new Uint8Array(32).fill(0),
          type: 'sr25519',
          includedAt: new BN(0),
        },
      ],
      keyAgreement: [
        {
          id: '#enc1',
          publicKey: new Uint8Array(32).fill(1),
          type: 'x25519',
          includedAt: new BN(0),
        },
        {
          id: '#enc2',
          publicKey: new Uint8Array(32).fill(2),
          type: 'x25519',
          includedAt: new BN(0),
        },
      ],
      assertionMethod: [
        {
          id: '#att1',
          publicKey: new Uint8Array(32).fill(3),
          type: 'ed25519',
          includedAt: new BN(0),
        },
      ],
      capabilityDelegation: [
        {
          id: '#del1',
          publicKey: new Uint8Array(32).fill(4),
          type: 'ecdsa',
          includedAt: new BN(0),
        },
      ],
      service: [
        {
          id: '#service1',
          type: ['type-1'],
          serviceEndpoint: ['url-1'],
        },
        {
          id: '#service2',
          type: ['type-2'],
          serviceEndpoint: ['url-2'],
        },
      ],
    })
  })

  it('returns null if the DID does not exist', async () => {
    mockedApi.query.did.did.mockReturnValueOnce(
      ApiMocks.mockChainQueryReturn('did', 'did')
    )

    const fullDid = await Did.query(nonExistingDid)
    expect(fullDid).toBeNull()
  })

  describe('authorizeBatch', () => {
    let keypair: KiltKeyringPair
    let sign: SignCallback
    let fullDid: DidDocument

    beforeAll(async () => {
      const keyTool = makeSigningKeyTool()
      keypair = keyTool.keypair
      fullDid = await createLocalDemoFullDidFromKeypair(keyTool.keypair)
      sign = keyTool.sign(fullDid)
    })

    describe('.addSingleExtrinsic()', () => {
      it('fails if the extrinsic does not require a DID', async () => {
        const extrinsic = augmentedApi.tx.indices.claim(1)
        await expect(async () =>
          Did.authorizeBatch({
            did: fullDid.uri,
            batchFunction: augmentedApi.tx.utility.batchAll,
            extrinsics: [extrinsic, extrinsic],
            sign,
            submitter: keypair.address,
          })
        ).rejects.toMatchInlineSnapshot(
          '[DidBuilderError: Can only batch extrinsics that require a DID signature]'
        )
      })

      it('fails if the extrinsic is a utility (batch) extrinsic containing valid extrinsics', async () => {
        const extrinsic = augmentedApi.tx.utility.batch([
          await augmentedApi.tx.ctype.add('test-ctype'),
        ])
        const batchFunction =
          jest.fn() as unknown as typeof mockedApi.tx.utility.batchAll
        await Did.authorizeBatch({
          did: fullDid.uri,
          batchFunction,
          extrinsics: [extrinsic, extrinsic],
          sign,
          submitter: keypair.address,
        })

        expect(batchFunction).toHaveBeenCalledWith([extrinsic, extrinsic])
      })

      it('adds different batches requiring different keys', async () => {
        const ctype1Extrinsic = await augmentedApi.tx.ctype.add(randomAsHex(32))
        const ctype2Extrinsic = await augmentedApi.tx.ctype.add(randomAsHex(32))
        const delegationExtrinsic1 =
          await augmentedApi.tx.delegation.createHierarchy(
            randomAsHex(32),
            randomAsHex(32)
          )
        const delegationExtrinsic2 =
          await augmentedApi.tx.delegation.createHierarchy(
            randomAsHex(32),
            randomAsHex(32)
          )
        const ctype3Extrinsic = await augmentedApi.tx.ctype.add(randomAsHex(32))
        const ctype4Extrinsic = await augmentedApi.tx.ctype.add(randomAsHex(32))

        const batchFunction =
          jest.fn() as unknown as typeof augmentedApi.tx.utility.batchAll
        const extrinsics = [
          ctype1Extrinsic,
          ctype2Extrinsic,
          delegationExtrinsic1,
          delegationExtrinsic2,
          ctype3Extrinsic,
          ctype4Extrinsic,
        ]
        await Did.authorizeBatch({
          did: fullDid.uri,
          batchFunction,
          extrinsics,
          nonce: new BN(0),
          sign,
          submitter: keypair.address,
        })

        expect(batchFunction).toHaveBeenCalledWith([
          ctype1Extrinsic,
          ctype2Extrinsic,
        ])
        expect(batchFunction).toHaveBeenCalledWith([
          delegationExtrinsic1,
          delegationExtrinsic2,
        ])
        expect(batchFunction).toHaveBeenCalledWith([
          ctype3Extrinsic,
          ctype4Extrinsic,
        ])
      })
    })

    // TODO: complete these tests once SDK has been refactored to work with generic api object
    describe('.build()', () => {
      it('throws if batch is empty', async () => {
        await expect(async () =>
          Did.authorizeBatch({
            did: fullDid.uri,
            batchFunction: augmentedApi.tx.utility.batchAll,
            extrinsics: [],
            sign,
            submitter: keypair.address,
          })
        ).rejects.toMatchInlineSnapshot(
          '[DidBuilderError: Cannot build a batch with no transactions]'
        )
      })
      it.todo('successfully create a batch with only 1 extrinsic')
      it.todo('successfully create a batch with 1 extrinsic per required key')
      it.todo('successfully create a batch with 2 extrinsics per required key')
      it.todo(
        'successfully create a batch with 1 extrinsic per required key, repeated two times'
      )
    })
  })
})
