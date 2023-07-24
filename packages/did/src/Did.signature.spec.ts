/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group unit/did
 */

import { randomAsHex, randomAsU8a } from '@polkadot/util-crypto'

import type {
  DidDocument,
  DidResourceUri,
  DidSignature,
  KeyringPair,
  KiltKeyringPair,
  NewLightDidVerificationKey,
  SignCallback,
} from '@kiltprotocol/types'
import { Crypto, SDKErrors } from '@kiltprotocol/utils'

import { makeSigningKeyTool } from '../../../tests/testUtils'
import {
  isDidSignature,
  signatureFromJson,
  signatureToJson,
  verifyDidSignature,
} from './Did.signature'
import { keyToResolvedKey, resolveKey } from './DidResolver'
import * as Did from './index.js'

jest.mock('./DidResolver')
jest
  .mocked(keyToResolvedKey)
  .mockImplementation(jest.requireActual('./DidResolver').keyToResolvedKey)

describe('light DID', () => {
  let keypair: KiltKeyringPair
  let did: DidDocument
  let sign: SignCallback
  beforeAll(() => {
    const keyTool = makeSigningKeyTool()
    keypair = keyTool.keypair
    did = Did.createLightDidDocument({
      authentication: keyTool.authentication,
    })
    sign = keyTool.getSignCallback(did)
  })

  beforeEach(() => {
    jest
      .mocked(resolveKey)
      .mockReset()
      .mockImplementation(async (didUri, keyRelationship = 'authentication') =>
        didUri.includes(keypair.address)
          ? Did.keyToResolvedKey(did[keyRelationship]![0], did.uri)
          : Promise.reject()
      )
  })

  it('verifies did signature over string', async () => {
    const SIGNED_STRING = 'signed string'
    const { signature, keyUri } = await sign({
      data: Crypto.coToUInt8(SIGNED_STRING),
      did: did.uri,
      keyRelationship: 'authentication',
    })
    await expect(
      verifyDidSignature({
        message: SIGNED_STRING,
        signature,
        keyUri,
        expectedVerificationMethod: 'authentication',
      })
    ).resolves.not.toThrow()
  })

  it('deserializes old did signature (with `keyId` property) to new format', async () => {
    const SIGNED_STRING = 'signed string'
    const { signature, keyUri } = signatureToJson(
      await sign({
        data: Crypto.coToUInt8(SIGNED_STRING),
        did: did.uri,
        keyRelationship: 'authentication',
      })
    )
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
    const { signature, keyUri } = await sign({
      data: SIGNED_BYTES,
      did: did.uri,
      keyRelationship: 'authentication',
    })
    await expect(
      verifyDidSignature({
        message: SIGNED_BYTES,
        signature,
        keyUri,
        expectedVerificationMethod: 'authentication',
      })
    ).resolves.not.toThrow()
  })

  it('fails if relationship does not match', async () => {
    const SIGNED_STRING = 'signed string'
    const { signature, keyUri } = await sign({
      data: Crypto.coToUInt8(SIGNED_STRING),
      did: did.uri,
      keyRelationship: 'authentication',
    })
    await expect(
      verifyDidSignature({
        message: SIGNED_STRING,
        signature,
        keyUri,
        expectedVerificationMethod: 'assertionMethod',
      })
    ).rejects.toThrow()
  })

  it('fails if key id does not match', async () => {
    const SIGNED_STRING = 'signed string'
    // eslint-disable-next-line prefer-const
    let { signature, keyUri } = await sign({
      data: Crypto.coToUInt8(SIGNED_STRING),
      did: did.uri,
      keyRelationship: 'authentication',
    })
    keyUri = `${keyUri}1a`
    jest.mocked(resolveKey).mockRejectedValue(new Error('Key not found'))
    await expect(
      verifyDidSignature({
        message: SIGNED_STRING,
        signature,
        keyUri,
        expectedVerificationMethod: 'authentication',
      })
    ).rejects.toThrow()
  })

  it('fails if signature does not match', async () => {
    const SIGNED_STRING = 'signed string'
    const { signature, keyUri } = await sign({
      data: Crypto.coToUInt8(SIGNED_STRING),
      did: did.uri,
      keyRelationship: 'authentication',
    })
    await expect(
      verifyDidSignature({
        message: SIGNED_STRING.substring(1),
        signature,
        keyUri,
        expectedVerificationMethod: 'authentication',
      })
    ).rejects.toThrow()
  })

  it('fails if key id malformed', async () => {
    jest.mocked(resolveKey).mockRestore()
    const SIGNED_STRING = 'signed string'
    // eslint-disable-next-line prefer-const
    let { signature, keyUri } = await sign({
      data: Crypto.coToUInt8(SIGNED_STRING),
      did: did.uri,
      keyRelationship: 'authentication',
    })
    // @ts-expect-error
    keyUri = keyUri.replace('#', '?')
    await expect(
      verifyDidSignature({
        message: SIGNED_STRING,
        signature,
        keyUri,
        expectedVerificationMethod: 'authentication',
      })
    ).rejects.toThrow()
  })

  it('does not verify if migrated to Full DID', async () => {
    jest.mocked(resolveKey).mockRejectedValue(new Error('Migrated'))
    const SIGNED_STRING = 'signed string'
    const { signature, keyUri } = await sign({
      data: Crypto.coToUInt8(SIGNED_STRING),
      did: did.uri,
      keyRelationship: 'authentication',
    })
    await expect(
      verifyDidSignature({
        message: SIGNED_STRING,
        signature,
        keyUri,
        expectedVerificationMethod: 'authentication',
      })
    ).rejects.toThrow()
  })

  it('typeguard accepts legal signature objects', () => {
    const signature: DidSignature = {
      keyUri: `${did.uri}${did.authentication[0].id}`,
      signature: randomAsHex(32),
    }
    expect(isDidSignature(signature)).toBe(true)
  })

  it('detects signer expectation mismatch if signature is by unrelated did', async () => {
    const SIGNED_STRING = 'signed string'
    const { signature, keyUri } = await sign({
      data: Crypto.coToUInt8(SIGNED_STRING),
      did: did.uri,
      keyRelationship: 'authentication',
    })

    const expectedSigner = Did.createLightDidDocument({
      authentication: makeSigningKeyTool().authentication,
    }).uri

    await expect(
      verifyDidSignature({
        message: SIGNED_STRING,
        signature,
        keyUri,
        expectedSigner,
        expectedVerificationMethod: 'authentication',
      })
    ).rejects.toThrow(SDKErrors.DidSubjectMismatchError)
  })

  it('allows variations of the same light did', async () => {
    const SIGNED_STRING = 'signed string'
    const { signature, keyUri } = await sign({
      data: Crypto.coToUInt8(SIGNED_STRING),
      did: did.uri,
      keyRelationship: 'authentication',
    })

    const expectedSigner = Did.createLightDidDocument({
      authentication: did.authentication as [NewLightDidVerificationKey],
      keyAgreement: [{ type: 'x25519', publicKey: new Uint8Array(32).fill(1) }],
      service: [
        {
          id: '#service',
          type: ['servingService'],
          serviceEndpoint: ['http://example.com'],
        },
      ],
    }).uri

    await expect(
      verifyDidSignature({
        message: SIGNED_STRING,
        signature,
        keyUri,
        expectedSigner,
        expectedVerificationMethod: 'authentication',
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
      uri: `did:kilt:${keypair.address}`,
      authentication: [
        {
          id: '#0x12345',
          type: 'sr25519',
          publicKey: keypair.publicKey,
        },
      ],
    }
    sign = async ({ data }) => ({
      signature: keypair.sign(data),
      keyUri: `${did.uri}#0x12345`,
      keyType: 'sr25519',
    })
  })

  beforeEach(() => {
    jest
      .mocked(resolveKey)
      .mockReset()
      .mockImplementation(async (didUri) =>
        didUri.includes(keypair.address)
          ? Did.keyToResolvedKey(did.authentication[0], did.uri)
          : Promise.reject()
      )
  })

  it('verifies did signature over string', async () => {
    const SIGNED_STRING = 'signed string'
    const { signature, keyUri } = await sign({
      data: Crypto.coToUInt8(SIGNED_STRING),
      did: did.uri,
      keyRelationship: 'authentication',
    })
    await expect(
      verifyDidSignature({
        message: SIGNED_STRING,
        signature,
        keyUri,
        expectedVerificationMethod: 'authentication',
      })
    ).resolves.not.toThrow()
  })

  it('verifies did signature over bytes', async () => {
    const SIGNED_BYTES = Uint8Array.from([1, 2, 3, 4, 5])
    const { signature, keyUri } = await sign({
      data: SIGNED_BYTES,
      did: did.uri,
      keyRelationship: 'authentication',
    })
    await expect(
      verifyDidSignature({
        message: SIGNED_BYTES,
        signature,
        keyUri,
        expectedVerificationMethod: 'authentication',
      })
    ).resolves.not.toThrow()
  })

  it('does not verify if deactivated', async () => {
    jest.mocked(resolveKey).mockRejectedValue(new Error('Deactivated'))
    const SIGNED_STRING = 'signed string'
    const { signature, keyUri } = await sign({
      data: Crypto.coToUInt8(SIGNED_STRING),
      did: did.uri,
      keyRelationship: 'authentication',
    })
    await expect(
      verifyDidSignature({
        message: SIGNED_STRING,
        signature,
        keyUri,
        expectedVerificationMethod: 'authentication',
      })
    ).rejects.toThrow()
  })

  it('does not verify if not on chain', async () => {
    jest.mocked(resolveKey).mockRejectedValue(new Error('Not on chain'))
    const SIGNED_STRING = 'signed string'
    const { signature, keyUri } = await sign({
      data: Crypto.coToUInt8(SIGNED_STRING),
      did: did.uri,
      keyRelationship: 'authentication',
    })
    await expect(
      verifyDidSignature({
        message: SIGNED_STRING,
        signature,
        keyUri,
        expectedVerificationMethod: 'authentication',
      })
    ).rejects.toThrow()
  })

  it('accepts signature of full did for light did if enabled', async () => {
    const SIGNED_STRING = 'signed string'
    const { signature, keyUri } = await sign({
      data: Crypto.coToUInt8(SIGNED_STRING),
      did: did.uri,
      keyRelationship: 'authentication',
    })

    const expectedSigner = Did.createLightDidDocument({
      authentication: did.authentication as [NewLightDidVerificationKey],
    }).uri

    await expect(
      verifyDidSignature({
        message: SIGNED_STRING,
        signature,
        keyUri,
        expectedSigner,
        expectedVerificationMethod: 'authentication',
      })
    ).rejects.toThrow(SDKErrors.DidSubjectMismatchError)

    await expect(
      verifyDidSignature({
        message: SIGNED_STRING,
        signature,
        keyUri,
        expectedSigner,
        allowUpgraded: true,
        expectedVerificationMethod: 'authentication',
      })
    ).resolves.not.toThrow()
  })

  it('typeguard accepts legal signature objects', () => {
    const signature: DidSignature = {
      keyUri: `${did.uri}${did.authentication[0].id}`,
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
      keyUri: `did:kilt:${keypair.address}#mykey` as DidResourceUri,
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
      keyUri: `did:kilt:${keypair.address}#mykey` as DidResourceUri,
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
    // @ts-expect-error
    signature = {
      keyUri: `did:kilt:${keypair.address}#mykey` as DidResourceUri,
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
