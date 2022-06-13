/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group unit/did
 */

import {
  DidSignature,
  KeyRelationship,
  KeyringPair,
  KeystoreSigner,
  VerificationKeyType,
} from '@kiltprotocol/types'
import Keyring from '@polkadot/keyring'
import {
  mnemonicGenerate,
  randomAsHex,
  randomAsU8a,
} from '@polkadot/util-crypto'
import { SDKErrors } from '@kiltprotocol/utils'
import { FullDidDetails, LightDidDetails } from './DidDetails'
import {
  VerificationResult,
  verifyDidSignature,
  isDidSignature,
} from './Did.signature'
import { resolveDoc } from './DidResolver'

jest.mock('./DidResolver')

describe('light DID', () => {
  let keypair: KeyringPair
  let details: LightDidDetails
  let signer: KeystoreSigner
  beforeAll(() => {
    keypair = new Keyring({ type: 'sr25519', ss58Format: 38 }).addFromMnemonic(
      mnemonicGenerate()
    )
    details = LightDidDetails.fromIdentifier(
      keypair.address,
      VerificationKeyType.Sr25519
    )
    signer = {
      sign: async ({ data, alg }) => ({ data: keypair.sign(data), alg }),
    }
  })

  beforeEach(() => {
    jest
      .mocked(resolveDoc)
      .mockReset()
      .mockImplementation(async (did) =>
        did.includes(keypair.address)
          ? {
              details,
              metadata: {
                deactivated: false,
              },
            }
          : null
      )
  })

  it('verifies did signature over string', async () => {
    const SIGNED_STRING = 'signed string'
    const signature = await details.signPayload(
      SIGNED_STRING,
      signer,
      details.authenticationKey.id
    )
    await expect(
      verifyDidSignature({
        message: SIGNED_STRING,
        signature,
        expectedVerificationMethod: KeyRelationship.authentication,
      })
    ).resolves.toMatchObject<VerificationResult>({
      verified: true,
      didDetails: details,
      key: details.authenticationKey,
    })
  })

  it('verifies did signature over bytes', async () => {
    const SIGNED_BYTES = Uint8Array.from([1, 2, 3, 4, 5])
    const signature = await details.signPayload(
      SIGNED_BYTES,
      signer,
      details.authenticationKey.id
    )
    await expect(
      verifyDidSignature({
        message: SIGNED_BYTES,
        signature,
        expectedVerificationMethod: KeyRelationship.authentication,
      })
    ).resolves.toMatchObject<VerificationResult>({
      verified: true,
      didDetails: details,
      key: details.authenticationKey,
    })
  })

  it('fails if relationship does not match', async () => {
    const SIGNED_STRING = 'signed string'
    const signature = await details.signPayload(
      SIGNED_STRING,
      signer,
      details.authenticationKey.id
    )
    await expect(
      verifyDidSignature({
        message: SIGNED_STRING,
        signature,
        expectedVerificationMethod: KeyRelationship.assertionMethod,
      })
    ).resolves.toMatchObject<VerificationResult>({
      verified: false,
      reason: expect.stringMatching(/verification method/i),
    })
  })

  it('fails if key id does not match', async () => {
    const SIGNED_STRING = 'signed string'
    const signature = await details.signPayload(
      SIGNED_STRING,
      signer,
      details.authenticationKey.id
    )
    signature.keyUri += '1a'
    await expect(
      verifyDidSignature({
        message: SIGNED_STRING,
        signature,
        expectedVerificationMethod: KeyRelationship.authentication,
      })
    ).resolves.toMatchObject<VerificationResult>({
      verified: false,
      reason: expect.stringMatching(/no key with id/i),
    })
  })

  it('fails if signature does not match', async () => {
    const SIGNED_STRING = 'signed string'
    const signature = await details.signPayload(
      SIGNED_STRING,
      signer,
      details.authenticationKey.id
    )
    await expect(
      verifyDidSignature({
        message: SIGNED_STRING.substring(1),
        signature,
        expectedVerificationMethod: KeyRelationship.authentication,
      })
    ).resolves.toMatchObject<VerificationResult>({
      verified: false,
      reason: expect.stringMatching(/invalid signature/i),
    })
  })

  it('fails if key id malformed', async () => {
    const SIGNED_STRING = 'signed string'
    const signature = await details.signPayload(
      SIGNED_STRING,
      signer,
      details.authenticationKey.id
    )
    // @ts-expect-error
    signature.keyUri = signature.keyUri.replace('#', '?')
    await expect(
      verifyDidSignature({
        message: SIGNED_STRING,
        signature,
        expectedVerificationMethod: KeyRelationship.authentication,
      })
    ).resolves.toMatchObject<VerificationResult>({
      verified: false,
      reason: expect.stringMatching(/signature key id .+ invalid/i),
    })
  })

  it('does not verify if migrated to Full DID', async () => {
    jest.mocked(resolveDoc).mockResolvedValue({
      details,
      metadata: {
        canonicalId: `did:kilt:${keypair.address}`,
        deactivated: false,
      },
    })
    const SIGNED_STRING = 'signed string'
    const signature = await details.signPayload(
      SIGNED_STRING,
      signer,
      details.authenticationKey.id
    )
    await expect(
      verifyDidSignature({
        message: SIGNED_STRING,
        signature,
        expectedVerificationMethod: KeyRelationship.authentication,
      })
    ).resolves.toMatchObject<VerificationResult>({
      verified: false,
      reason: expect.stringMatching(/migrated/i),
    })
  })

  it('typeguard accepts legal signature objects', () => {
    const signature: DidSignature = {
      keyUri: details.assembleKeyUri(details.authenticationKey.id),
      signature: randomAsHex(32),
    }
    expect(isDidSignature(signature)).toBe(true)
  })
})

describe('full DID', () => {
  let keypair: KeyringPair
  let details: FullDidDetails
  let signer: KeystoreSigner
  beforeAll(() => {
    keypair = new Keyring({ type: 'sr25519', ss58Format: 38 }).addFromMnemonic(
      mnemonicGenerate()
    )
    details = new FullDidDetails({
      identifier: keypair.address,
      uri: `did:kilt:${keypair.address}`,
      keys: {
        '0x12345': {
          type: VerificationKeyType.Sr25519,
          publicKey: keypair.publicKey,
        },
      },
      keyRelationships: { authentication: new Set(['0x12345']) },
    })
    signer = {
      sign: async ({ data, alg }) => ({ data: keypair.sign(data), alg }),
    }
  })

  beforeEach(() => {
    jest
      .mocked(resolveDoc)
      .mockReset()
      .mockImplementation(async (did) =>
        did.includes(keypair.address)
          ? {
              details,
              metadata: {
                deactivated: false,
              },
            }
          : null
      )
  })

  it('verifies did signature over string', async () => {
    const SIGNED_STRING = 'signed string'
    const signature = await details.signPayload(
      SIGNED_STRING,
      signer,
      details.authenticationKey.id
    )
    await expect(
      verifyDidSignature({
        message: SIGNED_STRING,
        signature,
        expectedVerificationMethod: KeyRelationship.authentication,
      })
    ).resolves.toMatchObject<VerificationResult>({
      verified: true,
      didDetails: details,
      key: details.authenticationKey,
    })
  })

  it('verifies did signature over bytes', async () => {
    const SIGNED_BYTES = Uint8Array.from([1, 2, 3, 4, 5])
    const signature = await details.signPayload(
      SIGNED_BYTES,
      signer,
      details.authenticationKey.id
    )
    await expect(
      verifyDidSignature({
        message: SIGNED_BYTES,
        signature,
        expectedVerificationMethod: KeyRelationship.authentication,
      })
    ).resolves.toMatchObject<VerificationResult>({
      verified: true,
      didDetails: details,
      key: details.authenticationKey,
    })
  })

  it('does not verify if deactivated', async () => {
    jest.mocked(resolveDoc).mockResolvedValue({
      details: undefined,
      metadata: {
        deactivated: true,
      },
    })
    const SIGNED_STRING = 'signed string'
    const signature = await details.signPayload(
      SIGNED_STRING,
      signer,
      details.authenticationKey.id
    )
    await expect(
      verifyDidSignature({
        message: SIGNED_STRING,
        signature,
        expectedVerificationMethod: KeyRelationship.authentication,
      })
    ).resolves.toMatchObject<VerificationResult>({
      verified: false,
      reason: expect.stringMatching(/deactivated/i),
    })
  })

  it('does not verify if not on chain', async () => {
    jest.mocked(resolveDoc).mockResolvedValue(null)
    const SIGNED_STRING = 'signed string'
    const signature = await details.signPayload(
      SIGNED_STRING,
      signer,
      details.authenticationKey.id
    )
    await expect(
      verifyDidSignature({
        message: SIGNED_STRING,
        signature,
        expectedVerificationMethod: KeyRelationship.authentication,
      })
    ).resolves.toMatchObject<VerificationResult>({
      verified: false,
      reason: expect.stringMatching(/no result/i),
    })
  })

  it('typeguard accepts legal signature objects', () => {
    const signature: DidSignature = {
      keyUri: details.assembleKeyUri(details.authenticationKey.id),
      signature: randomAsHex(32),
    }
    expect(isDidSignature(signature)).toBe(true)
  })
})

describe('type guard', () => {
  let keypair: KeyringPair
  beforeAll(() => {
    keypair = new Keyring({ type: 'sr25519', ss58Format: 38 }).addFromMnemonic(
      mnemonicGenerate()
    )
  })

  it('rejects malformed key uri', () => {
    let signature: DidSignature = {
      // @ts-expect-error
      keyUri: `did:kilt:${keypair.address}?mykey`,
      signature: randomAsHex(32),
    }
    expect(() => isDidSignature(signature)).toThrow(
      SDKErrors.ERROR_SIGNATURE_DATA_TYPE
    )
    signature = {
      // @ts-expect-error
      keyUri: `kilt:did:${keypair.address}#mykey`,
      signature: randomAsHex(32),
    }
    expect(() => isDidSignature(signature)).toThrow(
      SDKErrors.ERROR_SIGNATURE_DATA_TYPE
    )
    signature = {
      // @ts-expect-error
      keyUri: `kilt:did:${keypair.address}`,
      signature: randomAsHex(32),
    }
    expect(() => isDidSignature(signature)).toThrow(
      SDKErrors.ERROR_SIGNATURE_DATA_TYPE
    )
    signature = {
      // @ts-expect-error
      keyUri: keypair.address,
      signature: randomAsHex(32),
    }
    expect(() => isDidSignature(signature)).toThrow(
      SDKErrors.ERROR_SIGNATURE_DATA_TYPE
    )
    signature = {
      // @ts-expect-error
      keyUri: '',
      signature: randomAsHex(32),
    }
    expect(() => isDidSignature(signature)).toThrow(
      SDKErrors.ERROR_SIGNATURE_DATA_TYPE
    )
  })

  it('rejects unexpected signature type', () => {
    const signature: DidSignature = {
      keyUri: `did:kilt:${keypair.address}#mykey`,
      signature: '',
    }
    expect(() => isDidSignature(signature)).toThrow(
      SDKErrors.ERROR_SIGNATURE_DATA_TYPE
    )
    signature.signature = randomAsHex(32).substring(2)
    expect(() => isDidSignature(signature)).toThrow(
      SDKErrors.ERROR_SIGNATURE_DATA_TYPE
    )
    // @ts-expect-error
    signature.signature = randomAsU8a(32)
    expect(() => isDidSignature(signature)).toThrow(
      SDKErrors.ERROR_SIGNATURE_DATA_TYPE
    )
  })

  it('rejects incomplete objects', () => {
    let signature: DidSignature = {
      keyUri: `did:kilt:${keypair.address}#mykey`,
      // @ts-expect-error
      signature: undefined,
    }
    expect(() => isDidSignature(signature)).toThrow(
      SDKErrors.ERROR_SIGNATURE_DATA_TYPE
    )
    signature = {
      // @ts-expect-error
      keyUri: undefined,
      signature: randomAsHex(32),
    }
    expect(() => isDidSignature(signature)).toThrow(
      SDKErrors.ERROR_SIGNATURE_DATA_TYPE
    )
    // @ts-expect-error
    signature = {
      signature: randomAsHex(32),
    }
    expect(() => isDidSignature(signature)).toThrow(
      SDKErrors.ERROR_SIGNATURE_DATA_TYPE
    )
    // @ts-expect-error
    signature = {
      keyUri: `did:kilt:${keypair.address}#mykey`,
    }
    expect(() => isDidSignature(signature)).toThrow(
      SDKErrors.ERROR_SIGNATURE_DATA_TYPE
    )
    // @ts-expect-error
    signature = {}
    expect(() => isDidSignature(signature)).toThrow(
      SDKErrors.ERROR_SIGNATURE_DATA_TYPE
    )
    // @ts-expect-error
    signature = { keyUri: null, signature: null }
    expect(() => isDidSignature(signature)).toThrow(
      SDKErrors.ERROR_SIGNATURE_DATA_TYPE
    )
  })
})
