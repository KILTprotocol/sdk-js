/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/* eslint-disable @typescript-eslint/no-non-null-assertion */

/**
 * @group unit/did
 */

import { TypeRegistry } from '@kiltprotocol/chain-helpers'
import {
  IDidServiceEndpoint,
  KeyRelationship,
  KeyringPair,
} from '@kiltprotocol/types'
import type { IDidResolvedDetails } from '@kiltprotocol/types'
import { Keyring } from '@kiltprotocol/utils'
import { hexToU8a, u8aToHex } from '@polkadot/util'
import { LightDidDetails } from '../DidDetails'
import type { INewPublicKey } from '../types'
import { IDidChainRecordJSON } from '../types'
import { DefaultResolver } from './DefaultResolver'
import { assembleDidFragment } from '../Did.utils'

jest.mock('../Did.chain', () => {
  const queryByDID = jest.fn(
    async (did: string): Promise<IDidChainRecordJSON | null> => ({
      did,
      authenticationKey: `${did}#auth`,
      keyAgreementKeys: [`${did}#x25519`],
      publicKeys: [
        {
          id: assembleDidFragment(did, 'auth'),
          type: 'ed25519',
          controller: did,
          publicKeyHex:
            '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          includedAt: 200,
        },
        {
          id: assembleDidFragment(did, 'x25519'),
          type: 'x25519',
          controller: did,
          publicKeyHex:
            '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
          includedAt: 250,
        },
      ],
      lastTxCounter: TypeRegistry.createType('u64', 10),
    })
  )
  const queryServiceEndpoint = jest.fn(
    async (
      did: string,
      serviceId: string
    ): Promise<IDidServiceEndpoint | null> => ({
      id: assembleDidFragment(did, serviceId),
      types: [`type-${serviceId}`],
      urls: [`url-${serviceId}`],
    })
  )
  const queryServiceEndpoints = jest.fn(
    async (did: string): Promise<IDidServiceEndpoint[]> => [
      (await queryServiceEndpoint(did, 'id-1')) as IDidServiceEndpoint,
      (await queryServiceEndpoint(did, 'id-2')) as IDidServiceEndpoint,
    ]
  )
  return {
    queryByDID,
    queryById: jest.fn(
      async (id: string): Promise<IDidChainRecordJSON | null> =>
        queryByDID(`did:kilt:${id}`)
    ),
    queryServiceEndpoint,
    queryServiceEndpoints,
  }
})

const identifier = '4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs'
const fullDid = `did:kilt:${identifier}`

it('resolves stuff', async () => {
  await expect(DefaultResolver.resolveDoc(fullDid)).resolves.toMatchObject({
    details: {
      did: fullDid,
      identifier,
    },
  })
})

it('has the right keys', async () => {
  const didRecord = await DefaultResolver.resolveDoc(fullDid)
  expect(didRecord?.details.getKeyIds()).toStrictEqual([
    `${fullDid}#auth`,
    `${fullDid}#x25519`,
  ])
  expect(
    didRecord?.details.getKeyIds(KeyRelationship.authentication)
  ).toStrictEqual([`${fullDid}#auth`])
  expect(
    didRecord?.details.getKeys(KeyRelationship.keyAgreement)
  ).toStrictEqual([
    {
      id: `${fullDid}#x25519`,
      controller: fullDid,
      includedAt: 250,
      type: 'x25519',
      publicKeyHex:
        '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    },
  ])
})

it('has the right service endpoints', async () => {
  const didRecord = await DefaultResolver.resolveDoc(fullDid)
  expect(didRecord?.details.getEndpoints()).toStrictEqual([
    {
      id: `${fullDid}#id-1`,
      types: ['type-id-1'],
      urls: ['url-id-1'],
    },
    {
      id: `${fullDid}#id-2`,
      types: ['type-id-2'],
      urls: ['url-id-2'],
    },
  ])
  expect(didRecord?.details.getEndpointById(`${fullDid}#id-1`)).toStrictEqual({
    id: `${fullDid}#id-1`,
    types: ['type-id-1'],
    urls: ['url-id-1'],
  })
})

const mnemonic = 'testMnemonic'

describe('Light DID tests', () => {
  const keyring: Keyring = new Keyring({ ss58Format: 38 })
  let keypair: KeyringPair
  let publicAuthKey: INewPublicKey
  let encryptionKey: INewPublicKey
  let serviceEndpoints: IDidServiceEndpoint[]

  it('Correctly resolves a light DID created with only an ed25519 authentication key', async () => {
    keypair = keyring.addFromMnemonic(mnemonic, undefined, 'ed25519')
    publicAuthKey = {
      publicKey: keypair.publicKey,
      type: 'ed25519',
    }
    const lightDID = new LightDidDetails({
      authenticationKey: publicAuthKey,
    })
    const resolutionResult = (await DefaultResolver.resolve(
      lightDID.did
    )) as IDidResolvedDetails
    const derivedAuthenticationPublicKey = resolutionResult.details.getKey(
      `${lightDID.did}#authentication`
    )
    expect(derivedAuthenticationPublicKey).toBeDefined()
    expect(derivedAuthenticationPublicKey!.publicKeyHex).toEqual(
      u8aToHex(publicAuthKey.publicKey)
    )
  })

  it('Correctly resolves a light DID created with only an sr25519 authentication key', async () => {
    keypair = keyring.addFromMnemonic(mnemonic, undefined, 'sr25519')
    publicAuthKey = {
      publicKey: keypair.publicKey,
      type: 'sr25519',
    }
    const lightDID = new LightDidDetails({
      authenticationKey: publicAuthKey,
    })
    const resolutionResult = (await DefaultResolver.resolve(
      lightDID.did
    )) as IDidResolvedDetails
    const derivedAuthenticationPublicKey = resolutionResult.details.getKey(
      `${lightDID.did}#authentication`
    )
    expect(derivedAuthenticationPublicKey).toBeDefined()
    expect(derivedAuthenticationPublicKey!.publicKeyHex).toEqual(
      u8aToHex(publicAuthKey.publicKey)
    )
  })

  it('Correctly resolves a light DID created with an authentication, an encryption key, and three service endpoints', async () => {
    keypair = keyring.addFromMnemonic(mnemonic, undefined, 'ed25519')
    publicAuthKey = {
      publicKey: keypair.publicKey,
      type: 'sr25519',
    }
    encryptionKey = {
      publicKey: hexToU8a(
        '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
      ),
      type: 'x25519',
    }
    serviceEndpoints = [
      {
        id: 'id-1',
        types: ['type-1'],
        urls: ['url-1'],
      },
      {
        id: 'id-2',
        types: ['type-2'],
        urls: ['url-2'],
      },
      {
        id: 'id-3',
        types: ['type-3'],
        urls: ['url-3'],
      },
    ]
    const lightDID = new LightDidDetails({
      authenticationKey: publicAuthKey,
      encryptionKey,
      serviceEndpoints,
    })
    const resolutionResult = (await DefaultResolver.resolve(
      lightDID.did
    )) as IDidResolvedDetails

    const derivedAuthenticationPublicKey = resolutionResult.details.getKey(
      `${lightDID.did}#authentication`
    )
    expect(derivedAuthenticationPublicKey).toBeDefined()
    expect(derivedAuthenticationPublicKey!.publicKeyHex).toEqual(
      u8aToHex(publicAuthKey.publicKey)
    )
    const derivedEncryptionPublicKey = resolutionResult.details.getKey(
      `${lightDID.did}#encryption`
    )
    expect(derivedEncryptionPublicKey).toBeDefined()
    expect(derivedEncryptionPublicKey!.publicKeyHex).toEqual(
      '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
    )
    const derivedServiceEndpoints = resolutionResult.details.getEndpoints()
    expect(derivedServiceEndpoints).toStrictEqual([
      {
        id: `${lightDID.did}#id-1`,
        types: ['type-1'],
        urls: ['url-1'],
      },
      {
        id: `${lightDID.did}#id-2`,
        types: ['type-2'],
        urls: ['url-2'],
      },
      {
        id: `${lightDID.did}#id-3`,
        types: ['type-3'],
        urls: ['url-3'],
      },
    ])
  })
})
