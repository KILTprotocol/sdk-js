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
import { KeyRelationship, KeyringPair } from '@kiltprotocol/types'
import type { IDidResolvedDetails } from '@kiltprotocol/types'
import { Keyring } from '@kiltprotocol/utils'
import { hexToU8a, u8aToHex } from '@polkadot/util'
import { LightDidDetails } from '../DidDetails'
import type { INewPublicKey } from '../types'
import { IDidChainRecordJSON } from '../types'
import { DefaultResolver } from './DefaultResolver'

jest.mock('../Did.chain', () => {
  const queryByDID = jest.fn(
    async (did: string): Promise<IDidChainRecordJSON | null> => ({
      did,
      authenticationKey: `${did}#auth`,
      keyAgreementKeys: [`${did}#x25519`],
      publicKeys: [
        {
          id: `${did}#auth`,
          type: 'ed25519',
          controller: did,
          publicKeyHex:
            '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          includedAt: 200,
        },
        {
          id: `${did}#x25519`,
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
  return {
    queryByDID,
    queryById: jest.fn(
      async (id: string): Promise<IDidChainRecordJSON | null> =>
        queryByDID(`did:kilt:${id}`)
    ),
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

const mnemonic = 'testMnemonic'

describe('Light DID tests', () => {
  const keyring: Keyring = new Keyring({ ss58Format: 38 })
  let keypair: KeyringPair
  let publicAuthKey: INewPublicKey
  let encryptionKey: INewPublicKey

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

  it('Correctly resolves a light DID created with only an authentication and an encryption key', async () => {
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
    const lightDID = new LightDidDetails({
      authenticationKey: publicAuthKey,
      encryptionKey,
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
  })
})
