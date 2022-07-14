/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { BN } from '@polkadot/util'
import { randomAsHex } from '@polkadot/util-crypto'

import {
  DidDetails,
  DidIdentifier,
  DidServiceEndpoint,
  KiltKeyringPair,
  SignCallback,
} from '@kiltprotocol/types'
import {
  ApiMocks,
  createLocalDemoFullDidFromKeypair,
  makeSigningKeyTool,
} from '@kiltprotocol/testing'

import type { IDidChainRecord } from '../Did.chain'
import { getKiltDidFromIdentifier } from '../Did.utils'

import * as Did from './index.js'

/* eslint-disable @typescript-eslint/no-non-null-assertion */

/**
 * @group unit/did
 */

const mockApi = ApiMocks.createAugmentedApi()

const existingIdentifier = '4rp4rcDHP71YrBNvDhcH5iRoM3YzVoQVnCZvQPwPom9bjo2e'
const nonExistingIdentifier = '4pnAJ41mGHGDKCGBGY2zzu1hfvPasPkGAKDgPeprSkxnUmGM'

const existingDidDetails: IDidChainRecord = {
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
    owner: existingIdentifier,
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

jest.mock('../Did.chain.ts', () => ({
  queryDetails: jest.fn(
    async (didIdentifier: DidIdentifier): Promise<IDidChainRecord | null> => {
      if (didIdentifier === existingIdentifier) {
        return existingDidDetails
      }
      return null
    }
  ),
  queryServiceEndpoints: jest.fn(
    async (didIdentifier: DidIdentifier): Promise<DidServiceEndpoint[]> => {
      if (didIdentifier === existingIdentifier) {
        return existingServiceEndpoints
      }
      return []
    }
  ),
  generateDidAuthenticatedTx: jest.fn().mockResolvedValue({}),
}))

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
    const fullDidDetails = await Did.query(
      getKiltDidFromIdentifier(existingIdentifier, 'full')
    )

    expect(fullDidDetails).not.toBeNull()
    if (!fullDidDetails) throw new Error('Cannot load created DID')

    expect(fullDidDetails.identifier).toStrictEqual(existingIdentifier)

    const expectedDid = getKiltDidFromIdentifier(existingIdentifier, 'full')
    expect(fullDidDetails.uri).toStrictEqual(expectedDid)

    expect(fullDidDetails).toEqual(<DidDetails>{
      identifier: '4rp4rcDHP71YrBNvDhcH5iRoM3YzVoQVnCZvQPwPom9bjo2e',
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
      uri: 'did:kilt:4rp4rcDHP71YrBNvDhcH5iRoM3YzVoQVnCZvQPwPom9bjo2e',
    })
  })

  it('returns null if the identifier does not exist', async () => {
    const fullDidDetails = await Did.query(
      getKiltDidFromIdentifier(nonExistingIdentifier, 'full')
    )
    expect(fullDidDetails).toBeNull()
  })

  describe('authorizeBatch', () => {
    let keypair: KiltKeyringPair
    let sign: SignCallback
    let fullDid: DidDetails

    beforeAll(async () => {
      ;({ keypair, sign } = makeSigningKeyTool())
      fullDid = await createLocalDemoFullDidFromKeypair(keypair)
    })

    describe('.addSingleExtrinsic()', () => {
      it('fails if the extrinsic does not require a DID', async () => {
        const extrinsic = mockApi.tx.indices.claim(1)
        await expect(async () =>
          Did.authorizeBatch({
            did: fullDid,
            batchFunction: mockApi.tx.utility.batchAll,
            extrinsics: [extrinsic, extrinsic],
            sign,
            submitter: keypair.address,
          })
        ).rejects.toMatchInlineSnapshot(
          '[DidBuilderError: Can only batch extrinsics that require a DID signature]'
        )
      })

      it('fails if the extrinsic is a utility (batch) extrinsic containing valid extrinsics', async () => {
        const extrinsic = mockApi.tx.utility.batch([
          await mockApi.tx.ctype.add('test-ctype'),
        ])
        await expect(async () =>
          Did.authorizeBatch({
            did: fullDid,
            batchFunction: mockApi.tx.utility.batchAll,
            extrinsics: [extrinsic, extrinsic],
            sign,
            submitter: keypair.address,
          })
        ).rejects.toMatchInlineSnapshot(
          '[DidBuilderError: Can only batch extrinsics that require a DID signature]'
        )
      })

      it('fails if the DID does not have any key required to sign the batch', async () => {
        // Full DID with only an authentication key.
        const newFullDid: DidDetails = {
          uri: fullDid.uri,
          identifier: fullDid.identifier,
          authentication: [fullDid.authentication[0]],
        }
        const extrinsic = await mockApi.tx.ctype.add('test-ctype')

        await expect(async () =>
          Did.authorizeBatch({
            did: newFullDid,
            batchFunction: mockApi.tx.utility.batchAll,
            extrinsics: [extrinsic, extrinsic],
            nonce: new BN(0),
            sign,
            submitter: keypair.address,
          })
        ).rejects.toMatchInlineSnapshot(
          '[DidBuilderError: Found no key for relationship "assertionMethod"]'
        )
      })

      it('adds different batches requiring different keys', async () => {
        const ctype1Extrinsic = await mockApi.tx.ctype.add(randomAsHex(32))
        const ctype2Extrinsic = await mockApi.tx.ctype.add(randomAsHex(32))
        const delegationExtrinsic1 =
          await mockApi.tx.delegation.createHierarchy(
            randomAsHex(32),
            randomAsHex(32)
          )
        const delegationExtrinsic2 =
          await mockApi.tx.delegation.createHierarchy(
            randomAsHex(32),
            randomAsHex(32)
          )
        const ctype3Extrinsic = await mockApi.tx.ctype.add(randomAsHex(32))
        const ctype4Extrinsic = await mockApi.tx.ctype.add(randomAsHex(32))

        const batchFunction =
          jest.fn() as unknown as typeof mockApi.tx.utility.batchAll
        const extrinsics = [
          ctype1Extrinsic,
          ctype2Extrinsic,
          delegationExtrinsic1,
          delegationExtrinsic2,
          ctype3Extrinsic,
          ctype4Extrinsic,
        ]
        await Did.authorizeBatch({
          did: fullDid,
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
            did: fullDid,
            batchFunction: mockApi.tx.utility.batchAll,
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
