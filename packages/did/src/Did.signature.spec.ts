/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type {
  KiltKeyringPair,
  KeyringPair,
  DidDocument,
  SignCallback,
  DidUrl,
  DereferenceResult,
} from '@kiltprotocol/types'

import { Crypto, SDKErrors } from '@kiltprotocol/utils'
import { randomAsHex, randomAsU8a } from '@polkadot/util-crypto'

import type { DidSignature } from './Did.signature'
import type { NewLightDidVerificationKey } from './DidDetails'

import { makeSigningKeyTool } from '../../../tests/testUtils'
import {
  isDidSignature,
  signatureFromJson,
  signatureToJson,
  verifyDidSignature,
} from './Did.signature'
import { dereference, SupportedContentType } from './DidResolver/DidResolver'
import { keypairToMultibaseKey, multibaseKeyToDidKey, parse } from './Did.utils'
import { createLightDidDocument } from './DidDetails'

jest.mock('./DidResolver/DidResolver')
jest
  .mocked(dereference)
  .mockImplementation(jest.requireActual('./DidResolver').dereference)

describe('light DID', () => {
  let keypair: KiltKeyringPair
  let did: DidDocument
  let sign: SignCallback
  beforeAll(() => {
    const keyTool = makeSigningKeyTool()
    keypair = keyTool.keypair
    did = createLightDidDocument({
      authentication: keyTool.authentication,
    })
    sign = keyTool.getSignCallback(did)
  })

  beforeEach(() => {
    jest
      .mocked(dereference)
      .mockReset()
      .mockImplementation(
        async (didUrl): Promise<DereferenceResult<SupportedContentType>> => {
          const { address } = parse(didUrl)
          if (address === keypair.address) {
            return {
              contentMetadata: {},
              dereferencingMetadata: { contentType: 'application/did+json' },
              contentStream: did,
            }
          }
          return {
            contentMetadata: {},
            dereferencingMetadata: { error: 'notFound' },
          }
        }
      )
  })

  it('verifies did signature over string', async () => {
    const SIGNED_STRING = 'signed string'
    const { signature, verificationMethod } = await sign({
      data: Crypto.coToUInt8(SIGNED_STRING),
      did: did.id,
      verificationMethodRelationship: 'authentication',
    })
    await expect(
      verifyDidSignature({
        message: SIGNED_STRING,
        signature,
        signerUrl: `${verificationMethod.controller}${verificationMethod.id}`,
        expectedVerificationMethodRelationship: 'authentication',
      })
    ).resolves.not.toThrow()
  })

  it('deserializes old did signature (with `keyId` property) to new format', async () => {
    const SIGNED_STRING = 'signed string'
    const { signature, signerUrl } = signatureToJson(
      await sign({
        data: Crypto.coToUInt8(SIGNED_STRING),
        did: did.id,
        verificationMethodRelationship: 'authentication',
      })
    )
    const oldSignature = {
      signature,
      keyId: signerUrl,
    }

    const deserialized = signatureFromJson(oldSignature)
    expect(deserialized.signature).toBeInstanceOf(Uint8Array)
    expect(deserialized.signerUrl).toStrictEqual(signerUrl)
    expect(deserialized).not.toHaveProperty('keyId')
  })

  it('verifies did signature over bytes', async () => {
    const SIGNED_BYTES = Uint8Array.from([1, 2, 3, 4, 5])
    const { signature, verificationMethod } = await sign({
      data: SIGNED_BYTES,
      did: did.id,
      verificationMethodRelationship: 'authentication',
    })
    await expect(
      verifyDidSignature({
        message: SIGNED_BYTES,
        signature,
        signerUrl: `${verificationMethod.controller}${verificationMethod.id}`,
        expectedVerificationMethodRelationship: 'authentication',
      })
    ).resolves.not.toThrow()
  })

  it('fails if relationship does not match', async () => {
    const SIGNED_STRING = 'signed string'
    const { signature, verificationMethod } = await sign({
      data: Crypto.coToUInt8(SIGNED_STRING),
      did: did.id,
      verificationMethodRelationship: 'authentication',
    })
    await expect(
      verifyDidSignature({
        message: SIGNED_STRING,
        signature,
        signerUrl: `${did.id}${verificationMethod.id}`,
        expectedVerificationMethodRelationship: 'assertionMethod',
      })
    ).rejects.toThrow()
  })

  it('fails if key id does not match', async () => {
    const SIGNED_STRING = 'signed string'
    // eslint-disable-next-line prefer-const
    let { signature, verificationMethod } = await sign({
      data: Crypto.coToUInt8(SIGNED_STRING),
      did: did.id,
      verificationMethodRelationship: 'authentication',
    })
    const wrongVerificationMethodId = `${verificationMethod.id}1a`
    jest.mocked(dereference).mockResolvedValue({
      contentMetadata: {},
      dereferencingMetadata: { error: 'notFound' },
    })
    await expect(
      verifyDidSignature({
        message: SIGNED_STRING,
        signature,
        signerUrl: `${did.id}${wrongVerificationMethodId}` as DidUrl,
        expectedVerificationMethodRelationship: 'authentication',
      })
    ).rejects.toThrow()
  })

  it('fails if signature does not match', async () => {
    const SIGNED_STRING = 'signed string'
    const { signature, verificationMethod } = await sign({
      data: Crypto.coToUInt8(SIGNED_STRING),
      did: did.id,
      verificationMethodRelationship: 'authentication',
    })
    await expect(
      verifyDidSignature({
        message: SIGNED_STRING.substring(1),
        signature,
        signerUrl: `${did.id}${verificationMethod.id}`,
        expectedVerificationMethodRelationship: 'authentication',
      })
    ).rejects.toThrow()
  })

  it('fails if key id malformed', async () => {
    jest.mocked(dereference).mockRestore()
    const SIGNED_STRING = 'signed string'
    // eslint-disable-next-line prefer-const
    let { signature, verificationMethod } = await sign({
      data: Crypto.coToUInt8(SIGNED_STRING),
      did: did.id,
      verificationMethodRelationship: 'authentication',
    })
    const malformedVerificationId = verificationMethod.id.replace('#', '?')
    await expect(
      verifyDidSignature({
        message: SIGNED_STRING,
        signature,
        signerUrl: `${did.id}${malformedVerificationId}` as DidUrl,
        expectedVerificationMethodRelationship: 'authentication',
      })
    ).rejects.toThrow()
  })

  it('does not verify if migrated to Full DID', async () => {
    jest.mocked(dereference).mockResolvedValue({
      contentMetadata: {
        canonicalId: did.id,
      },
      dereferencingMetadata: { contentType: 'application/did+json' },
    })
    const SIGNED_STRING = 'signed string'
    const { signature, verificationMethod } = await sign({
      data: Crypto.coToUInt8(SIGNED_STRING),
      did: did.id,
      verificationMethodRelationship: 'authentication',
    })
    await expect(
      verifyDidSignature({
        message: SIGNED_STRING,
        signature,
        signerUrl: `${did.id}${verificationMethod.id}`,
        expectedVerificationMethodRelationship: 'authentication',
      })
    ).rejects.toThrow()
  })

  it('typeguard accepts legal signature objects', () => {
    const signature: DidSignature = {
      signerUrl: `${did.id}${did.authentication![0]}`,
      signature: randomAsHex(32),
    }
    expect(isDidSignature(signature)).toBe(true)
  })

  it('detects signer expectation mismatch if signature is by unrelated did', async () => {
    const SIGNED_STRING = 'signed string'
    const { signature, verificationMethod } = await sign({
      data: Crypto.coToUInt8(SIGNED_STRING),
      did: did.id,
      verificationMethodRelationship: 'authentication',
    })

    const expectedSigner = createLightDidDocument({
      authentication: makeSigningKeyTool().authentication,
    }).id

    await expect(
      verifyDidSignature({
        message: SIGNED_STRING,
        signature,
        signerUrl: `${did.id}${verificationMethod.id}`,
        expectedSigner,
        expectedVerificationMethodRelationship: 'authentication',
      })
    ).rejects.toThrow(SDKErrors.DidSubjectMismatchError)
  })

  it('allows variations of the same light did', async () => {
    const SIGNED_STRING = 'signed string'
    const { signature, verificationMethod } = await sign({
      data: Crypto.coToUInt8(SIGNED_STRING),
      did: did.id,
      verificationMethodRelationship: 'authentication',
    })

    const authKey = did.verificationMethod?.find(
      (vm) => vm.id === did.authentication?.[0]
    )
    const expectedSignerAuthKey = multibaseKeyToDidKey(
      authKey!.publicKeyMultibase
    )
    const expectedSigner = createLightDidDocument({
      authentication: [
        {
          publicKey: expectedSignerAuthKey.publicKey,
          type: expectedSignerAuthKey.keyType,
        },
      ] as [NewLightDidVerificationKey],
      keyAgreement: [{ type: 'x25519', publicKey: new Uint8Array(32).fill(1) }],
      service: [
        {
          id: '#service',
          type: ['servingService'],
          serviceEndpoint: ['http://example.com'],
        },
      ],
    }).id
    console.log('expectedSigner', expectedSigner)
    console.log('signer', verificationMethod)

    await expect(
      verifyDidSignature({
        message: SIGNED_STRING,
        signature,
        signerUrl: `${verificationMethod.controller}${verificationMethod.id}`,
        expectedSigner,
        expectedVerificationMethodRelationship: 'authentication',
      })
    ).resolves.not.toThrow()
  })
})

describe('full DID', () => {
  let keypair: KiltKeyringPair
  let did: DidDocument
  let sign: SignCallback
  beforeAll(() => {
    keypair = Crypto.makeKeypairFromSeed()
    did = {
      id: `did:kilt:${keypair.address}`,
      authentication: ['#0x12345'],
      verificationMethod: [
        {
          controller: `did:kilt:${keypair.address}`,
          id: '#0x12345',
          publicKeyMultibase: keypairToMultibaseKey(keypair),
          type: 'MultiKey',
        },
      ],
    }
    sign = async ({ data, did: signingDid }) => ({
      signature: keypair.sign(data),
      verificationMethod: {
        id: '#0x12345',
        controller: signingDid,
        type: 'MultiKey',
        publicKeyMultibase: keypairToMultibaseKey(keypair),
      },
    })
  })

  beforeEach(() => {
    jest
      .mocked(dereference)
      .mockReset()
      .mockImplementation(
        async (didUrl): Promise<DereferenceResult<SupportedContentType>> => {
          const { address } = parse(didUrl)
          console.log('address', address)
          console.log('didUrl', didUrl)
          console.log(address === keypair.address)
          console.log('did', did)
          if (address === keypair.address) {
            return {
              contentMetadata: {},
              dereferencingMetadata: { contentType: 'application/did+json' },
              contentStream: did,
            }
          }
          return {
            contentMetadata: {},
            dereferencingMetadata: { error: 'notFound' },
          }
        }
      )
  })

  it('verifies did signature over string', async () => {
    const SIGNED_STRING = 'signed string'
    const { signature, verificationMethod } = await sign({
      data: Crypto.coToUInt8(SIGNED_STRING),
      did: did.id,
      verificationMethodRelationship: 'authentication',
    })
    await expect(
      verifyDidSignature({
        message: SIGNED_STRING,
        signature,
        signerUrl: `${did.id}${verificationMethod.id}`,
        expectedVerificationMethodRelationship: 'authentication',
      })
    ).resolves.not.toThrow()
  })

  it('verifies did signature over bytes', async () => {
    const SIGNED_BYTES = Uint8Array.from([1, 2, 3, 4, 5])
    const { signature, verificationMethod } = await sign({
      data: SIGNED_BYTES,
      did: did.id,
      verificationMethodRelationship: 'authentication',
    })
    console.log('verificationMethod', verificationMethod)
    console.log('signerUrl', `${did.id}${verificationMethod.id}`)
    await expect(
      verifyDidSignature({
        message: SIGNED_BYTES,
        signature,
        signerUrl: `${did.id}${verificationMethod.id}`,
        expectedVerificationMethodRelationship: 'authentication',
      })
    ).resolves.not.toThrow()
  })

  it('does not verify if deactivated', async () => {
    jest.mocked(dereference).mockResolvedValue({
      contentMetadata: { deactivated: true },
      dereferencingMetadata: { contentType: 'application/did+json' },
    })
    const SIGNED_STRING = 'signed string'
    const { signature, verificationMethod } = await sign({
      data: Crypto.coToUInt8(SIGNED_STRING),
      did: did.id,
      verificationMethodRelationship: 'authentication',
    })
    await expect(
      verifyDidSignature({
        message: SIGNED_STRING,
        signature,
        signerUrl: `${did.id}${verificationMethod.id}`,
        expectedVerificationMethodRelationship: 'authentication',
      })
    ).rejects.toThrow()
  })

  it('does not verify if not on chain', async () => {
    jest.mocked(dereference).mockResolvedValue({
      contentMetadata: {},
      dereferencingMetadata: { error: 'notFound' },
    })
    const SIGNED_STRING = 'signed string'
    const { signature, verificationMethod } = await sign({
      data: Crypto.coToUInt8(SIGNED_STRING),
      did: did.id,
      verificationMethodRelationship: 'authentication',
    })
    await expect(
      verifyDidSignature({
        message: SIGNED_STRING,
        signature,
        signerUrl: `${did.id}${verificationMethod.id}`,
        expectedVerificationMethodRelationship: 'authentication',
      })
    ).rejects.toThrow()
  })

  it('accepts signature of full did for light did if enabled', async () => {
    const SIGNED_STRING = 'signed string'
    const { signature, verificationMethod } = await sign({
      data: Crypto.coToUInt8(SIGNED_STRING),
      did: did.id,
      verificationMethodRelationship: 'authentication',
    })

    const authKey = did.verificationMethod?.find(
      (vm) => vm.id === did.authentication?.[0]
    )
    const expectedSignerAuthKey = multibaseKeyToDidKey(
      authKey!.publicKeyMultibase
    )
    const expectedSigner = createLightDidDocument({
      authentication: [
        {
          publicKey: expectedSignerAuthKey.publicKey,
          type: expectedSignerAuthKey.keyType,
        },
      ] as [NewLightDidVerificationKey],
    }).id
    console.log(expectedSigner)
    console.log(did)

    await expect(
      verifyDidSignature({
        message: SIGNED_STRING,
        signature,
        signerUrl: `${did.id}${verificationMethod.id}`,
        expectedSigner,
        expectedVerificationMethodRelationship: 'authentication',
      })
    ).rejects.toThrow(SDKErrors.DidSubjectMismatchError)

    await expect(
      verifyDidSignature({
        message: SIGNED_STRING,
        signature,
        signerUrl: `${did.id}${verificationMethod.id}`,
        expectedSigner,
        allowUpgraded: true,
        expectedVerificationMethodRelationship: 'authentication',
      })
    ).resolves.not.toThrow()
  })

  it('typeguard accepts legal signature objects', () => {
    const signature: DidSignature = {
      signerUrl: `${did.id}${did.authentication![0]}`,
      signature: randomAsHex(32),
    }
    expect(isDidSignature(signature)).toBe(true)
  })
})

describe('type guard', () => {
  let keypair: KeyringPair
  beforeAll(() => {
    keypair = Crypto.makeKeypairFromSeed()
  })

  it('rejects malformed key uri', () => {
    let signature: DidSignature = {
      // @ts-expect-error
      signerUrl: `did:kilt:${keypair.address}?mykey`,
      signature: randomAsHex(32),
    }
    expect(isDidSignature(signature)).toBe(false)
    signature = {
      // @ts-expect-error
      signerUrl: `kilt:did:${keypair.address}#mykey`,
      signature: randomAsHex(32),
    }
    expect(isDidSignature(signature)).toBe(false)
    signature = {
      // @ts-expect-error
      signerUrl: `did:kilt:${keypair.address}`,
      signature: randomAsHex(32),
    }
    expect(isDidSignature(signature)).toBe(false)
    signature = {
      // @ts-expect-error
      signerUrl: keypair.address,
      signature: randomAsHex(32),
    }
    expect(isDidSignature(signature)).toBe(false)
    signature = {
      // @ts-expect-error
      signerUrl: '',
      signature: randomAsHex(32),
    }
    expect(isDidSignature(signature)).toBe(false)
  })

  it('rejects unexpected signature type', () => {
    const signature: DidSignature = {
      signerUrl: `did:kilt:${keypair.address}#mykey` as DidUrl,
      signature: '',
    }
    expect(isDidSignature(signature)).toBe(false)
    signature.signature = randomAsHex(32).substring(2)
    expect(isDidSignature(signature)).toBe(false)
    // @ts-expect-error
    signature.signature = randomAsU8a(32)
    expect(isDidSignature(signature)).toBe(false)
  })

  it('rejects incomplete objects', () => {
    let signature: DidSignature = {
      signerUrl: `did:kilt:${keypair.address}#mykey` as DidUrl,
      // @ts-expect-error
      signature: undefined,
    }
    expect(isDidSignature(signature)).toBe(false)
    signature = {
      // @ts-expect-error
      signerUrl: undefined,
      signature: randomAsHex(32),
    }
    expect(isDidSignature(signature)).toBe(false)
    // @ts-expect-error
    signature = {
      signature: randomAsHex(32),
    }
    expect(isDidSignature(signature)).toBe(false)
    signature = {
      // @ts-expect-error
      signerUrl: `did:kilt:${keypair.address}#mykey`,
    }
    expect(isDidSignature(signature)).toBe(false)
    // @ts-expect-error
    signature = {}
    expect(isDidSignature(signature)).toBe(false)
    // @ts-expect-error
    signature = { signerUrl: null, signature: null }
    expect(isDidSignature(signature)).toBe(false)
  })
})
