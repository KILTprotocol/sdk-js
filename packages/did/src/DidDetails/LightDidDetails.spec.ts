/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { DidDocument, Did, DidUrl } from '@kiltprotocol/types'

import { Crypto } from '@kiltprotocol/utils'

import type { NewService } from './DidDetails.js'
import type { CreateDocumentInput } from './LightDidDetails.js'

import { keypairToMultibaseKey, parse } from '../Did.utils.js'
import {
  createLightDidDocument,
  parseDocumentFromLightDid,
} from './LightDidDetails.js'

/*
 * Functions tested:
 * - createLightDidDocument
 * - parseDocumentFromLightDid
 *
 * Functions tested in integration tests:
 * - getKeysForExtrinsic
 * - authorizeExtrinsic
 */

describe('When creating an instance from the details', () => {
  it('correctly assign the right sr25519 authentication key, x25519 encryption key, and services', () => {
    const authKey = Crypto.makeKeypairFromSeed(undefined, 'sr25519')
    const encKey = Crypto.makeEncryptionKeypairFromSeed(
      new Uint8Array(32).fill(1)
    )
    const service: NewService[] = [
      {
        id: '#service-1',
        type: ['type-1'],
        serviceEndpoint: ['x:url-1'],
      },
      {
        id: '#service-2',
        type: ['type-21', 'type-22'],
        serviceEndpoint: ['x:url-21', 'x:url-22'],
      },
    ]

    const lightDid = createLightDidDocument({
      authentication: [authKey],
      keyAgreement: [encKey],
      service,
    })

    const did = `did:kilt:light:00${authKey.address}:z17GNCdxLqMYTMC5pnnDrPZGxLEFcXvDamtGNXeNkfSaFf8cktX6erFJiQy8S3ugL981NNys7Rz8DJiaNPZi98v1oeFVL7PjUGNTz1g3jgZo4VgQri2SYHBifZFX9foHZH4DreZXFN66k5dPrvAtBpFXaiG2WZkkxsnxNWxYpqWPPcxvbTE6pJbXxWKjRUd7rog1h9vjA93QA9jMDxm6BSGJHACFgSPUU3UTLk2kjNwT2bjZVvihVFu1zibxwHjowb7N6UQfieJ7ny9HnaQy64qJvGqh4NNtpwkhwm5DTYUoAeAhjt3a6TWyxmBgbFdZF7`
    expect(lightDid).toEqual(<DidDocument>{
      id: did,
      authentication: [`${did}#authentication`],
      keyAgreement: [`${did}#encryption`],
      verificationMethod: [
        {
          controller: did,
          id: `${did}#authentication`,
          publicKeyMultibase: keypairToMultibaseKey({
            publicKey: authKey.publicKey,
            type: 'sr25519',
          }),
          type: 'Multikey',
        },
        {
          controller: did,
          id: `${did}#encryption`,
          publicKeyMultibase: keypairToMultibaseKey({
            publicKey: encKey.publicKey,
            type: 'x25519',
          }),
          type: 'Multikey',
        },
      ],
      service: [
        {
          id: `${did}#service-1`,
          type: ['type-1'],
          serviceEndpoint: ['x:url-1'],
        },
        {
          id: `${did}#service-2`,
          type: ['type-21', 'type-22'],
          serviceEndpoint: ['x:url-21', 'x:url-22'],
        },
      ],
    })
  })

  it('correctly assign the right ed25519 authentication key and encryption key', () => {
    const authKey = Crypto.makeKeypairFromSeed()
    const encKey = Crypto.makeEncryptionKeypairFromSeed(
      new Uint8Array(32).fill(1)
    )

    const lightDid = createLightDidDocument({
      authentication: [authKey],
      keyAgreement: [encKey],
    })

    expect(parse(lightDid.id).address).toStrictEqual(authKey.address)

    const did = `did:kilt:light:01${authKey.address}:z15dZSRuzEPTFnBErPxqJie4CmmQH1gYKSQYxmwW5Qhgz5Sr7EYJA3J65KoC5YbgF3NGoBsTY2v6zwj1uDnZzgXzLy8R72Fhjmp8ujY81y2AJc8uQ6s2pVbAMZ6bnvaZ3GVe8bMjY5MiKFySS27qRi`
    expect(lightDid).toEqual(<DidDocument>{
      id: did,
      authentication: [`${did}#authentication`],
      keyAgreement: [`${did}#encryption`],
      verificationMethod: [
        {
          controller: did,
          id: `${did}#authentication`,
          publicKeyMultibase: keypairToMultibaseKey({
            publicKey: authKey.publicKey,
            type: 'ed25519',
          }),
          type: 'Multikey',
        },
        {
          controller: did,
          id: `${did}#encryption`,
          publicKeyMultibase: keypairToMultibaseKey({
            publicKey: encKey.publicKey,
            type: 'x25519',
          }),
          type: 'Multikey',
        },
      ],
    })
  })

  it('throws for unsupported authentication key type', () => {
    const authKey = Crypto.makeKeypairFromSeed(undefined, 'ecdsa')
    const invalidInput = {
      // Not an authentication key type
      authentication: [authKey],
    }
    expect(() =>
      createLightDidDocument(invalidInput as unknown as CreateDocumentInput)
    ).toThrowError()
  })

  it('throws for unsupported encryption key type', () => {
    const authKey = Crypto.makeKeypairFromSeed()
    const encKey = Crypto.makeEncryptionKeypairFromSeed()
    const invalidInput = {
      authentication: [authKey],
      // Not an encryption key type
      keyAgreement: [{ publicKey: encKey.publicKey, type: 'bls' }],
    }
    expect(() =>
      createLightDidDocument(invalidInput as unknown as CreateDocumentInput)
    ).toThrowError()
  })
})

describe('When creating an instance from a light DID', () => {
  it('correctly assign the right authentication key, encryption key, and services', () => {
    const authKey = Crypto.makeKeypairFromSeed(undefined, 'sr25519')
    const encKey = Crypto.makeEncryptionKeypairFromSeed(
      new Uint8Array(32).fill(1)
    )
    const endpoints: NewService[] = [
      {
        id: '#service-1',
        type: ['type-1'],
        serviceEndpoint: ['x:url-1'],
      },
      {
        id: '#service-2',
        type: ['type-21', 'type-22'],
        serviceEndpoint: ['x:url-21', 'x:url-22'],
      },
    ]
    // We are sure this is correct because of the described case above
    const expectedLightDid = createLightDidDocument({
      authentication: [authKey],
      keyAgreement: [encKey],
      service: endpoints,
    })

    const builtLightDid = parseDocumentFromLightDid(expectedLightDid.id)

    expect(builtLightDid).toStrictEqual(expectedLightDid)
    const { address } = parse(expectedLightDid.id)
    const did = `did:kilt:light:00${address}:z17GNCdxLqMYTMC5pnnDrPZGxLEFcXvDamtGNXeNkfSaFf8cktX6erFJiQy8S3ugL981NNys7Rz8DJiaNPZi98v1oeFVL7PjUGNTz1g3jgZo4VgQri2SYHBifZFX9foHZH4DreZXFN66k5dPrvAtBpFXaiG2WZkkxsnxNWxYpqWPPcxvbTE6pJbXxWKjRUd7rog1h9vjA93QA9jMDxm6BSGJHACFgSPUU3UTLk2kjNwT2bjZVvihVFu1zibxwHjowb7N6UQfieJ7ny9HnaQy64qJvGqh4NNtpwkhwm5DTYUoAeAhjt3a6TWyxmBgbFdZF7`
    expect(builtLightDid).toStrictEqual(<DidDocument>{
      id: did,
      authentication: [`${did}#authentication`],
      keyAgreement: [`${did}#encryption`],
      verificationMethod: [
        {
          controller: did,
          id: `${did}#authentication`,
          publicKeyMultibase: keypairToMultibaseKey({
            publicKey: authKey.publicKey,
            type: 'sr25519',
          }),
          type: 'Multikey',
        },
        {
          controller: did,
          id: `${did}#encryption`,
          publicKeyMultibase: keypairToMultibaseKey({
            publicKey: encKey.publicKey,
            type: 'x25519',
          }),
          type: 'Multikey',
        },
      ],
      service: [
        {
          id: `${did}#service-1`,
          type: ['type-1'],
          serviceEndpoint: ['x:url-1'],
        },
        {
          id: `${did}#service-2`,
          type: ['type-21', 'type-22'],
          serviceEndpoint: ['x:url-21', 'x:url-22'],
        },
      ],
    })
  })

  it('fail if a fragment is present according to the options', () => {
    const authKey = Crypto.makeKeypairFromSeed()
    const encKey = Crypto.makeEncryptionKeypairFromSeed()
    const service: NewService[] = [
      {
        id: '#service-1',
        type: ['type-1'],
        serviceEndpoint: ['x:url-1'],
      },
      {
        id: '#service-2',
        type: ['type-21', 'type-22'],
        serviceEndpoint: ['x:url-21', 'x:url-22'],
      },
    ]

    // We are sure this is correct because of the described case above
    const expectedLightDid = createLightDidDocument({
      authentication: [authKey],
      keyAgreement: [encKey],
      service,
    })

    const didWithFragment: DidUrl = `${expectedLightDid.id}#authentication`

    expect(() => parseDocumentFromLightDid(didWithFragment, true)).toThrow()
    expect(() =>
      parseDocumentFromLightDid(didWithFragment, false)
    ).not.toThrow()
  })

  it('fail if the DID is not correct', () => {
    const validKiltAddress = Crypto.makeKeypairFromSeed()
    const incorrectDIDs = [
      'did:kilt:light:sdasdsadas',
      // @ts-ignore not a valid DID
      'random-uri',
      'did:kilt:light',
      'did:kilt:light:',
      // Wrong auth key encoding
      `did:kilt:light:11${validKiltAddress}`,
      // Full DID
      `did:kilt:${validKiltAddress}`,
      // Random encoded details
      `did:kilt:light:00${validKiltAddress}:randomdetails`,
    ]
    incorrectDIDs.forEach((did) => {
      expect(() => parseDocumentFromLightDid(did as Did)).toThrow()
    })
  })
})
