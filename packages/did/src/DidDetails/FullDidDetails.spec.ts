/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { BN } from '@polkadot/util'

import {
  DidKey,
  DidServiceEndpoint,
  IDidIdentifier,
  KeyRelationship,
} from '@kiltprotocol/types'

import type { IDidChainRecordJSON } from '../Did.chain'
import { FullDidDetails } from '.'
import { getKiltDidFromIdentifier } from '../Did.utils'

/* eslint-disable @typescript-eslint/no-non-null-assertion */

/**
 * @group unit/did
 */

const existingIdentifier = '4rp4rcDHP71YrBNvDhcH5iRoM3YzVoQVnCZvQPwPom9bjo2e'
const nonExistingIdentifier = '4pnAJ41mGHGDKCGBGY2zzu1hfvPasPkGAKDgPeprSkxnUmGM'

const existingDidDetails: IDidChainRecordJSON = {
  authenticationKey: 'auth#1',
  keyAgreementKeys: ['enc#1', 'enc#2'],
  assertionMethodKey: 'att#1',
  capabilityDelegationKey: 'del#1',
  lastTxCounter: new BN('1'),
  publicKeys: [
    {
      id: 'auth#1',
      publicKey: new Uint8Array(32).fill(0),
      type: 'sr25519',
      includedAt: 0,
    },
    {
      id: 'enc#1',
      publicKey: new Uint8Array(32).fill(1),
      type: 'x25519',
      includedAt: 0,
    },
    {
      id: 'enc#2',
      publicKey: new Uint8Array(32).fill(2),
      type: 'x25519',
      includedAt: 0,
    },
    {
      id: 'att#1',
      publicKey: new Uint8Array(32).fill(3),
      type: 'ed25519',
      includedAt: 0,
    },
    {
      id: 'del#1',
      publicKey: new Uint8Array(32).fill(4),
      type: 'ecdsa',
      includedAt: 0,
    },
  ],
}

const existingServiceEndpoints: DidServiceEndpoint[] = [
  {
    id: 'service#1',
    types: ['type-1'],
    urls: ['url-1'],
  },
  {
    id: 'service#2',
    types: ['type-2'],
    urls: ['url-2'],
  },
]

jest.mock('../Did.chain.ts', () => {
  return {
    queryDetails: jest.fn(
      async (
        didIdentifier: IDidIdentifier
      ): Promise<IDidChainRecordJSON | null> => {
        if (didIdentifier === existingIdentifier) {
          return existingDidDetails
        }
        return null
      }
    ),
    queryServiceEndpoints: jest.fn(
      async (didIdentifier: IDidIdentifier): Promise<DidServiceEndpoint[]> => {
        if (didIdentifier === existingIdentifier) {
          return existingServiceEndpoints
        }
        return []
      }
    ),
  }
})

/*
 * Functions tested:
 * - fromChainInfo
 *
 * Functions tested in integration tests:
 * - getKeysForExtrinsic
 * - authorizeExtrinsic
 */

describe('When creating an instance from the chain', () => {
  it('correctly assign the right keys and the right service endpoints', async () => {
    const fullDidDetails: FullDidDetails | null =
      await FullDidDetails.fromChainInfo(existingIdentifier)

    expect(fullDidDetails).not.toBeNull()

    expect(fullDidDetails?.identifier).toStrictEqual(existingIdentifier)

    const expectedDid = getKiltDidFromIdentifier(existingIdentifier, 'full')
    expect(fullDidDetails?.did).toStrictEqual(expectedDid)

    expect(fullDidDetails?.getKey('auth#1')).toStrictEqual<DidKey>({
      id: 'auth#1',
      publicKey: new Uint8Array(32).fill(0),
      type: 'sr25519',
      includedAt: 0,
    })
    expect(
      fullDidDetails?.getKeys(KeyRelationship.authentication)
    ).toStrictEqual<DidKey[]>([
      {
        id: 'auth#1',
        publicKey: new Uint8Array(32).fill(0),
        type: 'sr25519',
        includedAt: 0,
      },
    ])
    expect(fullDidDetails?.authenticationKey.id).toStrictEqual('auth#1')

    expect(fullDidDetails?.getKey('enc#1')).toStrictEqual<DidKey>({
      id: 'enc#1',
      publicKey: new Uint8Array(32).fill(1),
      type: 'x25519',
      includedAt: 0,
    })
    expect(fullDidDetails?.getKey('enc#2')).toStrictEqual<DidKey>({
      id: 'enc#2',
      publicKey: new Uint8Array(32).fill(2),
      type: 'x25519',
      includedAt: 0,
    })
    expect(fullDidDetails?.getKeys(KeyRelationship.keyAgreement)).toStrictEqual<
      DidKey[]
    >([
      {
        id: 'enc#1',
        publicKey: new Uint8Array(32).fill(1),
        type: 'x25519',
        includedAt: 0,
      },
      {
        id: 'enc#2',
        publicKey: new Uint8Array(32).fill(2),
        type: 'x25519',
        includedAt: 0,
      },
    ])
    expect(fullDidDetails?.encryptionKey?.id).toStrictEqual('enc#1')

    expect(fullDidDetails?.getKey('att#1')).toStrictEqual<DidKey>({
      id: 'att#1',
      publicKey: new Uint8Array(32).fill(3),
      type: 'ed25519',
      includedAt: 0,
    })
    expect(
      fullDidDetails?.getKeys(KeyRelationship.assertionMethod)
    ).toStrictEqual<DidKey[]>([
      {
        id: 'att#1',
        publicKey: new Uint8Array(32).fill(3),
        type: 'ed25519',
        includedAt: 0,
      },
    ])
    expect(fullDidDetails?.attestationKey?.id).toStrictEqual('att#1')

    expect(fullDidDetails?.getKey('del#1')).toStrictEqual<DidKey>({
      id: 'del#1',
      publicKey: new Uint8Array(32).fill(4),
      type: 'ecdsa',
      includedAt: 0,
    })
    expect(
      fullDidDetails?.getKeys(KeyRelationship.capabilityDelegation)
    ).toStrictEqual<DidKey[]>([
      {
        id: 'del#1',
        publicKey: new Uint8Array(32).fill(4),
        type: 'ecdsa',
        includedAt: 0,
      },
    ])
    expect(fullDidDetails?.delegationKey?.id).toStrictEqual('del#1')

    expect(
      fullDidDetails?.getEndpoint('service#1')
    ).toStrictEqual<DidServiceEndpoint>({
      id: 'service#1',
      types: ['type-1'],
      urls: ['url-1'],
    })
    expect(fullDidDetails?.getEndpoints('type-1')).toStrictEqual<
      DidServiceEndpoint[]
    >([
      {
        id: 'service#1',
        types: ['type-1'],
        urls: ['url-1'],
      },
    ])

    expect(
      fullDidDetails?.getEndpoint('service#2')
    ).toStrictEqual<DidServiceEndpoint>({
      id: 'service#2',
      types: ['type-2'],
      urls: ['url-2'],
    })
    expect(fullDidDetails?.getEndpoints('type-2')).toStrictEqual<
      DidServiceEndpoint[]
    >([
      {
        id: 'service#2',
        types: ['type-2'],
        urls: ['url-2'],
      },
    ])
  })

  it('returns null if the identifier does not exist', async () => {
    const fullDidDetails: FullDidDetails | null =
      await FullDidDetails.fromChainInfo(nonExistingIdentifier)
    expect(fullDidDetails).toBeNull()
  })
})
