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
  DidDocument,
  DidResourceUri,
  DidSignature,
  KeyringPair,
  KiltKeyringPair,
  SignCallback,
} from '@kiltprotocol/types'
import Keyring from '@polkadot/keyring'
import {
  mnemonicGenerate,
  randomAsHex,
  randomAsU8a,
} from '@polkadot/util-crypto'
import { ss58Format } from '@kiltprotocol/utils'
import { makeSigningKeyTool } from '@kiltprotocol/testing'
import * as Did from './index.js'
import {
  VerificationResult,
  verifyDidSignature,
  isDidSignature,
} from './Did.signature'
import { resolve } from './DidResolver'

jest.mock('./DidResolver')

describe('light DID', () => {
  let keypair: KiltKeyringPair
  let did: DidDocument
  let sign: SignCallback
  beforeAll(() => {
    const keyTool = makeSigningKeyTool()
    keypair = keyTool.keypair
    sign = keyTool.sign
    did = Did.createLightDidDocument({
      authentication: keyTool.authentication,
    })
  })

  beforeEach(() => {
    jest
      .mocked(resolve)
      .mockReset()
      .mockImplementation(async (didUri) =>
        didUri.includes(keypair.address)
          ? {
              document: did,
              metadata: {
                deactivated: false,
              },
            }
          : null
      )
  })

  it('verifies did signature over string', async () => {
    const SIGNED_STRING = 'signed string'
    const signature = await Did.signPayload(
      did,
      SIGNED_STRING,
      sign,
      did.authentication[0].id
    )
    expect(
      await verifyDidSignature({
        message: SIGNED_STRING,
        signature,
        expectedVerificationMethod: 'authentication',
      })
    ).toMatchObject<VerificationResult>({
      verified: true,
      did,
      key: did.authentication[0],
    })
  })

  it('verifies old did signature (with `keyId` property) over string', async () => {
    const SIGNED_STRING = 'signed string'
    const signature = await Did.signPayload(
      did,
      SIGNED_STRING,
      sign,
      did.authentication[0].id
    )
    const oldSignature: any = {
      ...signature,
      keyId: signature.keyUri,
    }
    delete oldSignature.keyUri

    // Test the old signature is correctly crafted
    expect(oldSignature.signature).toBeDefined()
    expect(oldSignature.keyId).toBeDefined()
    expect(oldSignature.keyUri).toBeUndefined()

    await expect(
      verifyDidSignature({
        message: SIGNED_STRING,
        signature,
        expectedVerificationMethod: 'authentication',
      })
    ).resolves.toMatchObject<VerificationResult>({
      verified: true,
      did,
      key: did.authentication[0],
    })
  })

  it('verifies did signature over bytes', async () => {
    const SIGNED_BYTES = Uint8Array.from([1, 2, 3, 4, 5])
    const signature = await Did.signPayload(
      did,
      SIGNED_BYTES,
      sign,
      did.authentication[0].id
    )
    expect(
      await verifyDidSignature({
        message: SIGNED_BYTES,
        signature,
        expectedVerificationMethod: 'authentication',
      })
    ).toMatchObject<VerificationResult>({
      verified: true,
      did,
      key: did.authentication[0],
    })
  })

  it('fails if relationship does not match', async () => {
    const SIGNED_STRING = 'signed string'
    const signature = await Did.signPayload(
      did,
      SIGNED_STRING,
      sign,
      did.authentication[0].id
    )
    expect(
      await verifyDidSignature({
        message: SIGNED_STRING,
        signature,
        expectedVerificationMethod: 'assertionMethod',
      })
    ).toMatchObject<VerificationResult>({
      verified: false,
      reason: expect.stringMatching(/verification method/i),
    })
  })

  it('fails if key id does not match', async () => {
    const SIGNED_STRING = 'signed string'
    const signature = await Did.signPayload(
      did,
      SIGNED_STRING,
      sign,
      did.authentication[0].id
    )
    signature.keyUri += '1a'
    expect(
      await verifyDidSignature({
        message: SIGNED_STRING,
        signature,
        expectedVerificationMethod: 'authentication',
      })
    ).toMatchObject<VerificationResult>({
      verified: false,
      reason: expect.stringMatching(/no key with id/i),
    })
  })

  it('fails if signature does not match', async () => {
    const SIGNED_STRING = 'signed string'
    const signature = await Did.signPayload(
      did,
      SIGNED_STRING,
      sign,
      did.authentication[0].id
    )
    expect(
      await verifyDidSignature({
        message: SIGNED_STRING.substring(1),
        signature,
        expectedVerificationMethod: 'authentication',
      })
    ).toMatchObject<VerificationResult>({
      verified: false,
      reason: expect.stringMatching(/invalid signature/i),
    })
  })

  it('fails if key id malformed', async () => {
    const SIGNED_STRING = 'signed string'
    const signature = await Did.signPayload(
      did,
      SIGNED_STRING,
      sign,
      did.authentication[0].id
    )
    // @ts-expect-error
    signature.keyUri = signature.keyUri.replace('#', '?')
    expect(
      await verifyDidSignature({
        message: SIGNED_STRING,
        signature,
        expectedVerificationMethod: 'authentication',
      })
    ).toMatchObject<VerificationResult>({
      verified: false,
      reason: expect.stringMatching(/Signature key URI .+ invalid/i),
    })
  })

  it('does not verify if migrated to Full DID', async () => {
    jest.mocked(resolve).mockResolvedValue({
      document: did,
      metadata: {
        canonicalId: Did.Utils.getFullDidUri(did.uri),
        deactivated: false,
      },
    })
    const SIGNED_STRING = 'signed string'
    const signature = await Did.signPayload(
      did,
      SIGNED_STRING,
      sign,
      did.authentication[0].id
    )
    expect(
      await verifyDidSignature({
        message: SIGNED_STRING,
        signature,
        expectedVerificationMethod: 'authentication',
      })
    ).toMatchObject<VerificationResult>({
      verified: false,
      reason: expect.stringMatching(/migrated/i),
    })
  })

  it('typeguard accepts legal signature objects', () => {
    const signature: DidSignature = {
      keyUri: `${did.uri}${did.authentication[0].id}`,
      signature: randomAsHex(32),
    }
    expect(isDidSignature(signature)).toBe(true)
  })
})

describe('full DID', () => {
  let keypair: KiltKeyringPair
  let did: DidDocument
  let sign: SignCallback
  beforeAll(() => {
    keypair = new Keyring({ type: 'sr25519', ss58Format }).addFromMnemonic(
      mnemonicGenerate()
    ) as KiltKeyringPair
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
    sign = async ({ data, alg }) => ({ data: keypair.sign(data), alg })
  })

  beforeEach(() => {
    jest
      .mocked(resolve)
      .mockReset()
      .mockImplementation(async (didUri) =>
        didUri.includes(keypair.address)
          ? {
              document: did,
              metadata: {
                deactivated: false,
              },
            }
          : null
      )
  })

  it('verifies did signature over string', async () => {
    const SIGNED_STRING = 'signed string'
    const signature = await Did.signPayload(
      did,
      SIGNED_STRING,
      sign,
      did.authentication[0].id
    )
    expect(
      await verifyDidSignature({
        message: SIGNED_STRING,
        signature,
        expectedVerificationMethod: 'authentication',
      })
    ).toMatchObject<VerificationResult>({
      verified: true,
      did,
      key: did.authentication[0],
    })
  })

  it('verifies did signature over bytes', async () => {
    const SIGNED_BYTES = Uint8Array.from([1, 2, 3, 4, 5])
    const signature = await Did.signPayload(
      did,
      SIGNED_BYTES,
      sign,
      did.authentication[0].id
    )
    expect(
      await verifyDidSignature({
        message: SIGNED_BYTES,
        signature,
        expectedVerificationMethod: 'authentication',
      })
    ).toMatchObject<VerificationResult>({
      verified: true,
      did,
      key: did.authentication[0],
    })
  })

  it('does not verify if deactivated', async () => {
    jest.mocked(resolve).mockResolvedValue({
      document: undefined,
      metadata: {
        deactivated: true,
      },
    })
    const SIGNED_STRING = 'signed string'
    const signature = await Did.signPayload(
      did,
      SIGNED_STRING,
      sign,
      did.authentication[0].id
    )
    expect(
      await verifyDidSignature({
        message: SIGNED_STRING,
        signature,
        expectedVerificationMethod: 'authentication',
      })
    ).toMatchObject<VerificationResult>({
      verified: false,
      reason: expect.stringMatching(/deactivated/i),
    })
  })

  it('does not verify if not on chain', async () => {
    jest.mocked(resolve).mockResolvedValue(null)
    const SIGNED_STRING = 'signed string'
    const signature = await Did.signPayload(
      did,
      SIGNED_STRING,
      sign,
      did.authentication[0].id
    )
    expect(
      await verifyDidSignature({
        message: SIGNED_STRING,
        signature,
        expectedVerificationMethod: 'authentication',
      })
    ).toMatchObject<VerificationResult>({
      verified: false,
      reason: expect.stringMatching(/no result/i),
    })
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
    keypair = new Keyring({ type: 'sr25519', ss58Format }).addFromMnemonic(
      mnemonicGenerate()
    )
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
