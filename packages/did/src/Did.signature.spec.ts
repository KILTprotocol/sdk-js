/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type {
  KiltKeyringPair,
  KeyringPair,
  DidDocument,
  DidUrl,
  DidSignature,
  DereferenceResult,
  SignerInterface,
} from '@kiltprotocol/types'

import { Crypto, SDKErrors, Signers } from '@kiltprotocol/utils'
import { randomAsHex, randomAsU8a } from '@polkadot/util-crypto'

import type { NewLightDidVerificationKey } from './DidDetails'

import { makeSigningKeyTool } from '../../../tests/testUtils'
import {
  isDidSignature,
  signatureFromJson,
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
  let authenticationSigner: SignerInterface<string, DidUrl>
  beforeAll(async () => {
    const keyTool = await makeSigningKeyTool()
    keypair = keyTool.keypair
    did = createLightDidDocument({
      authentication: keyTool.authentication,
    })
    authenticationSigner = (await keyTool.getSigners(did)).find(
      ({ id }) => id === did.id + did.authentication?.[0]
    )!
    expect(authenticationSigner).toBeDefined()
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
    const signature = await authenticationSigner.sign({
      data: Crypto.coToUInt8(SIGNED_STRING),
    })
    expect(signature).toBeInstanceOf(Uint8Array)
    await expect(
      verifyDidSignature({
        message: SIGNED_STRING,
        signature,
        signerUrl: authenticationSigner.id as DidUrl,
        expectedVerificationRelationship: 'authentication',
      })
    ).resolves.not.toThrow()
  })

  it('deserializes old did signature (with `keyId` property) to new format', async () => {
    const SIGNED_STRING = 'signed string'
    const signature = Crypto.u8aToHex(
      await authenticationSigner.sign({
        data: Crypto.coToUInt8(SIGNED_STRING),
      })
    )
    const keyUri = authenticationSigner.id as DidUrl

    const oldSignature = {
      signature,
      keyId: keyUri,
    }

    const deserialized = signatureFromJson(oldSignature)
    expect(deserialized.signature).toBeInstanceOf(Uint8Array)
    expect(deserialized.keyUri).toStrictEqual(keyUri)
    expect(deserialized).not.toHaveProperty('keyId')
  })

  it('verifies did signature over bytes', async () => {
    const SIGNED_BYTES = Uint8Array.from([1, 2, 3, 4, 5])
    const signature = await authenticationSigner.sign({
      data: SIGNED_BYTES,
    })
    await expect(
      verifyDidSignature({
        message: SIGNED_BYTES,
        signature,
        signerUrl: authenticationSigner.id as DidUrl,
        expectedVerificationRelationship: 'authentication',
      })
    ).resolves.not.toThrow()
  })

  it('fails if relationship does not match', async () => {
    const SIGNED_STRING = 'signed string'
    const signature = await authenticationSigner.sign({
      data: Crypto.coToUInt8(SIGNED_STRING),
    })
    await expect(
      verifyDidSignature({
        message: SIGNED_STRING,
        signature,
        signerUrl: authenticationSigner.id as DidUrl,
        expectedVerificationRelationship: 'assertionMethod',
      })
    ).rejects.toThrow()
  })

  it('fails if verification method id does not match', async () => {
    const SIGNED_STRING = 'signed string'
    const signature = await authenticationSigner.sign({
      data: Crypto.coToUInt8(SIGNED_STRING),
    })
    jest.mocked(dereference).mockResolvedValue({
      contentMetadata: {},
      dereferencingMetadata: { error: 'notFound' },
    })
    await expect(
      verifyDidSignature({
        message: SIGNED_STRING,
        signature,
        signerUrl: `${authenticationSigner.id}1a` as DidUrl,
        expectedVerificationRelationship: 'authentication',
      })
    ).rejects.toThrow()
  })

  it('fails if signature does not match', async () => {
    const SIGNED_STRING = 'signed string'
    const signature = await authenticationSigner.sign({
      data: Crypto.coToUInt8(SIGNED_STRING),
    })
    await expect(
      verifyDidSignature({
        message: SIGNED_STRING.substring(1),
        signature,
        signerUrl: authenticationSigner.id as DidUrl,
        expectedVerificationRelationship: 'authentication',
      })
    ).rejects.toThrow()
  })

  it('fails if verification method id malformed', async () => {
    jest.mocked(dereference).mockRestore()
    const SIGNED_STRING = 'signed string'

    const signature = await authenticationSigner.sign({
      data: Crypto.coToUInt8(SIGNED_STRING),
    })
    await expect(
      verifyDidSignature({
        message: SIGNED_STRING,
        signature,
        signerUrl: authenticationSigner.id as DidUrl,
        expectedVerificationRelationship: 'authentication',
      })
    ).rejects.toThrow()
  })

  it('does not verify if migrated to Full DID', async () => {
    jest.mocked(dereference).mockResolvedValue({
      contentMetadata: {
        canonicalId: did.id,
      },
      dereferencingMetadata: { contentType: 'application/did+json' },
      contentStream: { id: did.id },
    })
    const SIGNED_STRING = 'signed string'
    const signature = await authenticationSigner.sign({
      data: Crypto.coToUInt8(SIGNED_STRING),
    })
    await expect(
      verifyDidSignature({
        message: SIGNED_STRING,
        signature,
        signerUrl: authenticationSigner.id as DidUrl,
        expectedVerificationRelationship: 'authentication',
      })
    ).rejects.toThrow()
  })

  it('typeguard accepts legal signature objects', () => {
    const signature: DidSignature = {
      keyUri: `${did.id}${did.authentication![0]}`,
      signature: randomAsHex(32),
    }
    expect(isDidSignature(signature)).toBe(true)
  })

  it('detects signer expectation mismatch if signature is by unrelated did', async () => {
    const SIGNED_STRING = 'signed string'
    const signature = await authenticationSigner.sign({
      data: Crypto.coToUInt8(SIGNED_STRING),
    })

    const expectedSigner = createLightDidDocument({
      authentication: (await makeSigningKeyTool()).authentication,
    }).id

    await expect(
      verifyDidSignature({
        message: SIGNED_STRING,
        signature,
        signerUrl: authenticationSigner.id as DidUrl,
        expectedSigner,
        expectedVerificationRelationship: 'authentication',
      })
    ).rejects.toThrow(SDKErrors.DidSubjectMismatchError)
  })

  it('allows variations of the same light did', async () => {
    const SIGNED_STRING = 'signed string'
    const signature = await authenticationSigner.sign({
      data: Crypto.coToUInt8(SIGNED_STRING),
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

    await expect(
      verifyDidSignature({
        message: SIGNED_STRING,
        signature,
        signerUrl: authenticationSigner.id as DidUrl,
        expectedSigner,
        expectedVerificationRelationship: 'authentication',
      })
    ).resolves.not.toThrow()
  })
})

describe('full DID', () => {
  let keypair: KiltKeyringPair
  let did: DidDocument
  let signer: SignerInterface<string, DidUrl>
  beforeAll(async () => {
    keypair = Crypto.makeKeypairFromSeed()
    did = {
      id: `did:kilt:${keypair.address}`,
      authentication: ['#0x12345'],
      verificationMethod: [
        {
          controller: `did:kilt:${keypair.address}`,
          id: '#0x12345',
          publicKeyMultibase: keypairToMultibaseKey(keypair),
          type: 'Multikey',
        },
      ],
    }
    signer = await Signers.signerFromKeypair({
      keypair,
      id: `${did.id}#0x12345`,
      algorithm: 'Ed25519',
    })
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
    const signature = await signer.sign({
      data: Crypto.coToUInt8(SIGNED_STRING),
    })
    await expect(
      verifyDidSignature({
        message: SIGNED_STRING,
        signature,
        signerUrl: signer.id,
        expectedVerificationRelationship: 'authentication',
      })
    ).resolves.not.toThrow()
  })

  it('verifies did signature over bytes', async () => {
    const SIGNED_BYTES = Uint8Array.from([1, 2, 3, 4, 5])
    const signature = await signer.sign({
      data: SIGNED_BYTES,
    })
    await expect(
      verifyDidSignature({
        message: SIGNED_BYTES,
        signature,
        signerUrl: signer.id,
        expectedVerificationRelationship: 'authentication',
      })
    ).resolves.not.toThrow()
  })

  it('does not verify if deactivated', async () => {
    jest.mocked(dereference).mockResolvedValue({
      contentMetadata: { deactivated: true },
      dereferencingMetadata: { contentType: 'application/did+json' },
      contentStream: { id: did.id },
    })
    const SIGNED_STRING = 'signed string'
    const signature = await signer.sign({
      data: Crypto.coToUInt8(SIGNED_STRING),
    })
    await expect(
      verifyDidSignature({
        message: SIGNED_STRING,
        signature,
        signerUrl: signer.id,
        expectedVerificationRelationship: 'authentication',
      })
    ).rejects.toThrow()
  })

  it('does not verify if not on chain', async () => {
    jest.mocked(dereference).mockResolvedValue({
      contentMetadata: {},
      dereferencingMetadata: { error: 'notFound' },
    })
    const SIGNED_STRING = 'signed string'
    const signature = await signer.sign({
      data: Crypto.coToUInt8(SIGNED_STRING),
    })
    await expect(
      verifyDidSignature({
        message: SIGNED_STRING,
        signature,
        signerUrl: signer.id,
        expectedVerificationRelationship: 'authentication',
      })
    ).rejects.toThrow()
  })

  it('accepts signature of full did for light did if enabled', async () => {
    const SIGNED_STRING = 'signed string'
    const signature = await signer.sign({
      data: Crypto.coToUInt8(SIGNED_STRING),
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

    await expect(
      verifyDidSignature({
        message: SIGNED_STRING,
        signature,
        signerUrl: signer.id,
        expectedSigner,
        expectedVerificationRelationship: 'authentication',
      })
    ).rejects.toThrow(SDKErrors.DidSubjectMismatchError)

    await expect(
      verifyDidSignature({
        message: SIGNED_STRING,
        signature,
        signerUrl: signer.id,
        expectedSigner,
        allowUpgraded: true,
        expectedVerificationRelationship: 'authentication',
      })
    ).resolves.not.toThrow()
  })

  it('typeguard accepts legal signature objects', () => {
    const signature: DidSignature = {
      keyUri: `${did.id}${did.authentication![0]}`,
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

  it('rejects malformed signer URL', () => {
    let signature: DidSignature = {
      // @ts-expect-error
      keyUri: `did:kilt:${keypair.address}?mykey`,
      signature: randomAsHex(32),
    }
    expect(isDidSignature(signature)).toBe(false)
    signature = {
      // @ts-expect-error
      keyUri: `kilt:did:${keypair.address}#mykey`,
      signature: randomAsHex(32),
    }
    expect(isDidSignature(signature)).toBe(false)
    signature = {
      // @ts-expect-error
      keyUri: `kilt:did:${keypair.address}`,
      signature: randomAsHex(32),
    }
    expect(isDidSignature(signature)).toBe(false)
    signature = {
      // @ts-expect-error
      keyUri: keypair.address,
      signature: randomAsHex(32),
    }
    expect(isDidSignature(signature)).toBe(false)
    signature = {
      // @ts-expect-error
      keyUri: '',
      signature: randomAsHex(32),
    }
    expect(isDidSignature(signature)).toBe(false)
  })

  it('rejects unexpected signature type', () => {
    const signature: DidSignature = {
      keyUri: `did:kilt:${keypair.address}#mykey` as DidUrl,
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
      keyUri: `did:kilt:${keypair.address}#mykey` as DidUrl,
      // @ts-expect-error
      signature: undefined,
    }
    expect(isDidSignature(signature)).toBe(false)
    signature = {
      // @ts-expect-error
      keyUri: undefined,
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
      keyUri: `did:kilt:${keypair.address}#mykey`,
    }
    expect(isDidSignature(signature)).toBe(false)
    // @ts-expect-error
    signature = {}
    expect(isDidSignature(signature)).toBe(false)
    // @ts-expect-error
    signature = { keyUri: null, signature: null }
    expect(isDidSignature(signature)).toBe(false)
  })
})
