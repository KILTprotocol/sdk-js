/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group unit/messaging
 */

import {
  DidKey,
  DidPublicKey,
  DidResolvedDetails,
  DidResourceUri,
  DidUri,
  ICredential,
  IDidResolver,
  IEncryptedMessage,
  IQuote,
  IRequestAttestation,
  ISubmitAttestation,
  ISubmitCredential,
  ResolvedDidKey,
  ResolvedDidServiceEndpoint,
  SignCallback,
} from '@kiltprotocol/types'
import { Quote, RequestForAttestation } from '@kiltprotocol/core'
import {
  FullDidDetails,
  LightDidDetails,
  Utils as DidUtils,
} from '@kiltprotocol/did'
import {
  createLocalDemoFullDidFromLightDid,
  makeEncryptionKeyTool,
  makeSigningKeyTool,
} from '@kiltprotocol/testing'
import { u8aToHex } from '@polkadot/util'
import { Crypto, SDKErrors } from '@kiltprotocol/utils'

import { Message } from './Message'

let aliceLightDid: LightDidDetails
let aliceLightDidWithDetails: LightDidDetails
let aliceFullDid: FullDidDetails
let aliceSign: SignCallback
const aliceEncKey = makeEncryptionKeyTool('Alice//enc')

let bobLightDid: LightDidDetails
let bobLightDidWithDetails: LightDidDetails
let bobFullDid: FullDidDetails
let bobSign: SignCallback
const bobEncKey = makeEncryptionKeyTool('Bob//enc')

const resolveDoc = async (did: DidUri): Promise<DidResolvedDetails | null> => {
  if (did.startsWith(aliceLightDidWithDetails.uri)) {
    return {
      details: aliceLightDidWithDetails,
      metadata: { deactivated: false, canonicalId: aliceFullDid.uri },
    }
  }
  if (did.startsWith(aliceLightDid.uri)) {
    return {
      details: aliceLightDid,
      metadata: { deactivated: false, canonicalId: aliceFullDid.uri },
    }
  }
  if (did.startsWith(aliceFullDid.uri)) {
    return { details: aliceFullDid, metadata: { deactivated: false } }
  }
  if (did.startsWith(bobLightDidWithDetails.uri)) {
    return {
      details: bobLightDidWithDetails,
      metadata: { deactivated: false, canonicalId: bobFullDid.uri },
    }
  }
  if (did.startsWith(bobLightDid.uri)) {
    return {
      details: bobLightDid,
      metadata: { deactivated: false, canonicalId: bobFullDid.uri },
    }
  }
  if (did.startsWith(bobFullDid.uri)) {
    return { details: bobFullDid, metadata: { deactivated: false } }
  }
  return null
}
const resolveKey = async (
  keyUri: DidPublicKey['uri']
): Promise<ResolvedDidKey | null> => {
  const { fragment, did } = DidUtils.parseDidUri(keyUri)
  const { details } = (await resolveDoc(did as DidUri)) as DidResolvedDetails
  const key = details?.getKey(fragment!) as DidKey
  return {
    controller: details!.uri,
    uri: keyUri,
    publicKey: key.publicKey,
    type: key.type,
  }
}

const mockResolver = {
  resolveDoc,
  resolveKey,
  resolve: async (
    didUri: string
  ): Promise<
    DidResolvedDetails | ResolvedDidKey | ResolvedDidServiceEndpoint | null
  > =>
    (await resolveKey(didUri as DidResourceUri)) ||
    resolveDoc(didUri as DidUri),
} as IDidResolver

beforeAll(async () => {
  const aliceAuthKey = makeSigningKeyTool('ed25519')
  aliceSign = aliceAuthKey.sign
  aliceLightDid = LightDidDetails.fromDetails({
    authenticationKey: aliceAuthKey.authenticationKey,
    encryptionKey: aliceEncKey.keypair,
  })
  aliceLightDidWithDetails = LightDidDetails.fromDetails({
    authenticationKey: aliceAuthKey.authenticationKey,
    encryptionKey: aliceEncKey.keypair,
    serviceEndpoints: [{ id: 'id-1', types: ['type-1'], urls: ['x:url-1'] }],
  })
  aliceFullDid = await createLocalDemoFullDidFromLightDid(aliceLightDid)

  const bobAuthKey = makeSigningKeyTool('ed25519')
  bobSign = bobAuthKey.sign
  bobLightDid = LightDidDetails.fromDetails({
    authenticationKey: bobAuthKey.authenticationKey,
    encryptionKey: bobEncKey.keypair,
  })
  bobLightDidWithDetails = LightDidDetails.fromDetails({
    authenticationKey: bobAuthKey.authenticationKey,
    encryptionKey: bobEncKey.keypair,
    serviceEndpoints: [{ id: 'id-1', types: ['type-1'], urls: ['x:url-1'] }],
  })
  bobFullDid = await createLocalDemoFullDidFromLightDid(bobLightDid)
})

describe('Messaging', () => {
  it('verify message encryption and signing', async () => {
    const message = new Message(
      {
        type: 'request-credential',
        content: {
          cTypes: [{ cTypeHash: `${Crypto.hashStr('0x12345678')}` }],
        },
      },
      aliceLightDid.uri,
      bobLightDid.uri
    )
    const encryptedMessage = await message.encrypt(
      'encryption',
      aliceLightDid,
      aliceEncKey.encrypt,
      `${bobLightDid.uri}#encryption`,
      {
        resolver: mockResolver,
      }
    )

    const decryptedMessage = await Message.decrypt(
      encryptedMessage,
      bobEncKey.decrypt,
      bobLightDid,
      {
        resolver: mockResolver,
      }
    )
    expect(JSON.stringify(message.body)).toEqual(
      JSON.stringify(decryptedMessage.body)
    )

    const encryptedMessageWrongContent = JSON.parse(
      JSON.stringify(encryptedMessage)
    ) as IEncryptedMessage
    const messedUpContent = Crypto.coToUInt8(
      encryptedMessageWrongContent.ciphertext
    )
    messedUpContent.set(Crypto.hash('1234'), 10)
    encryptedMessageWrongContent.ciphertext = u8aToHex(messedUpContent)

    await expect(() =>
      Message.decrypt(
        encryptedMessageWrongContent,
        bobEncKey.decrypt,
        bobLightDid,
        {
          resolver: mockResolver,
        }
      )
    ).rejects.toThrowError(SDKErrors.ERROR_DECODING_MESSAGE)

    const encryptedWrongBody = await aliceEncKey.encrypt({
      alg: 'x25519-xsalsa20-poly1305',
      data: Crypto.coToUInt8('{ wrong JSON'),
      publicKey: aliceLightDid.encryptionKey!.publicKey,
      peerPublicKey: bobLightDid.encryptionKey!.publicKey,
    })
    const encryptedMessageWrongBody: IEncryptedMessage = {
      ciphertext: u8aToHex(encryptedWrongBody.data),
      nonce: u8aToHex(encryptedWrongBody.nonce),
      senderKeyUri: aliceLightDid.assembleKeyUri(
        aliceLightDid.encryptionKey!.id
      ),
      receiverKeyUri: bobLightDid.assembleKeyUri(bobLightDid.encryptionKey!.id),
    }
    await expect(() =>
      Message.decrypt(
        encryptedMessageWrongBody,
        bobEncKey.decrypt,
        bobLightDid,
        {
          resolver: mockResolver,
        }
      )
    ).rejects.toThrowError(SDKErrors.ERROR_PARSING_MESSAGE)
  })

  it('verifies the message with sender is the owner (as full DID)', async () => {
    const content = RequestForAttestation.fromClaim({
      cTypeHash: `${Crypto.hashStr('0x12345678')}`,
      owner: aliceFullDid.uri,
      contents: {},
    })
    const date = new Date(2019, 11, 10).toISOString()

    const quoteData: IQuote = {
      attesterDid: bobFullDid.uri,
      cTypeHash: `${Crypto.hashStr('0x12345678')}`,
      cost: {
        tax: { vat: 3.3 },
        net: 23.4,
        gross: 23.5,
      },
      currency: 'Euro',
      termsAndConditions: 'https://coolcompany.io/terms.pdf',
      timeframe: date,
    }
    const quoteAttesterSigned = await Quote.createAttesterSignedQuote(
      quoteData,
      bobFullDid,
      bobSign
    )
    const bothSigned = await Quote.createQuoteAgreement(
      quoteAttesterSigned,
      content.rootHash,
      bobFullDid.uri,
      aliceFullDid,
      aliceSign,
      {
        resolver: mockResolver,
      }
    )
    const requestAttestationBody: IRequestAttestation = {
      content: {
        requestForAttestation: content,
        quote: bothSigned,
      },
      type: 'request-attestation',
    }

    // Should not throw if the owner and sender DID is the same.
    expect(() =>
      Message.ensureOwnerIsSender(
        new Message(requestAttestationBody, aliceFullDid.uri, bobFullDid.uri)
      )
    ).not.toThrow()

    // Should not throw if the sender is the light DID version of the owner.
    // This is technically not to be allowed but message verification is not concerned with that.
    expect(() =>
      Message.ensureOwnerIsSender(
        new Message(requestAttestationBody, aliceLightDid.uri, bobFullDid.uri)
      )
    ).not.toThrow()

    // Should throw if the sender and the owner are two different entities.
    expect(() =>
      Message.ensureOwnerIsSender(
        new Message(requestAttestationBody, bobFullDid.uri, aliceFullDid.uri)
      )
    ).toThrowError(SDKErrors.ERROR_IDENTITY_MISMATCH)

    const attestation = {
      delegationId: null,
      claimHash: requestAttestationBody.content.requestForAttestation.rootHash,
      cTypeHash: Crypto.hashStr('0x12345678'),
      owner: bobFullDid.uri,
      revoked: false,
    }

    const submitAttestationBody: ISubmitAttestation = {
      content: {
        attestation,
      },
      type: 'submit-attestation',
    }

    // Should not throw if the owner and sender DID is the same.
    expect(() =>
      Message.ensureOwnerIsSender(
        new Message(submitAttestationBody, bobFullDid.uri, aliceFullDid.uri)
      )
    ).not.toThrow()

    // Should not throw if the sender is the light DID version of the owner.
    // This is technically not to be allowed but message verification is not concerned with that.
    expect(() =>
      Message.ensureOwnerIsSender(
        new Message(submitAttestationBody, bobLightDid.uri, aliceFullDid.uri)
      )
    ).not.toThrow()

    // Should throw if the sender and the owner are two different entities.
    expect(() =>
      Message.ensureOwnerIsSender(
        new Message(submitAttestationBody, aliceFullDid.uri, bobFullDid.uri)
      )
    ).toThrowError(SDKErrors.ERROR_IDENTITY_MISMATCH)

    const credential: ICredential = {
      request: content,
      attestation: submitAttestationBody.content.attestation,
    }

    const submitClaimsForCTypeBody: ISubmitCredential = {
      content: [credential],
      type: 'submit-credential',
    }

    // Should not throw if the owner and sender DID is the same.
    expect(() =>
      Message.ensureOwnerIsSender(
        new Message(submitClaimsForCTypeBody, aliceFullDid.uri, bobFullDid.uri)
      )
    ).not.toThrow()

    // Should not throw if the sender is the light DID version of the owner.
    // This is technically not to be allowed but message verification is not concerned with that.
    expect(() =>
      Message.ensureOwnerIsSender(
        new Message(submitClaimsForCTypeBody, aliceLightDid.uri, bobFullDid.uri)
      )
    ).not.toThrow()

    // Should throw if the sender and the owner are two different entities.
    expect(() =>
      Message.ensureOwnerIsSender(
        new Message(submitClaimsForCTypeBody, bobFullDid.uri, aliceFullDid.uri)
      )
    ).toThrowError(SDKErrors.ERROR_IDENTITY_MISMATCH)
  })

  it('verifies the message with sender is the owner (as light DID)', async () => {
    // Create request for attestation to the light DID with no encoded details
    const content = RequestForAttestation.fromClaim({
      cTypeHash: `${Crypto.hashStr('0x12345678')}`,
      owner: aliceLightDid.uri,
      contents: {},
    })

    const date = new Date(2019, 11, 10).toISOString()
    const quoteData: IQuote = {
      attesterDid: bobLightDid.uri,
      cTypeHash: `${Crypto.hashStr('0x12345678')}`,
      cost: {
        tax: { vat: 3.3 },
        net: 23.4,
        gross: 23.5,
      },
      currency: 'Euro',
      termsAndConditions: 'https://coolcompany.io/terms.pdf',
      timeframe: date,
    }
    const quoteAttesterSigned = await Quote.createAttesterSignedQuote(
      quoteData,
      bobLightDid,
      bobSign
    )
    const bothSigned = await Quote.createQuoteAgreement(
      quoteAttesterSigned,
      content.rootHash,
      bobLightDid.uri,
      aliceLightDid,
      aliceSign,
      {
        resolver: mockResolver,
      }
    )
    const requestAttestationBody: IRequestAttestation = {
      content: {
        requestForAttestation: content,
        quote: bothSigned,
      },
      type: 'request-attestation',
    }

    // Create request for attestation to the light DID with encoded details
    const contentWithEncodedDetails = RequestForAttestation.fromClaim({
      cTypeHash: `${Crypto.hashStr('0x12345678')}`,
      owner: aliceLightDidWithDetails.uri,
      contents: {},
    })

    const quoteDataEncodedDetails: IQuote = {
      attesterDid: bobLightDidWithDetails.uri,
      cTypeHash: `${Crypto.hashStr('0x12345678')}`,
      cost: {
        tax: { vat: 3.3 },
        net: 23.4,
        gross: 23.5,
      },
      currency: 'Euro',
      termsAndConditions: 'https://coolcompany.io/terms.pdf',
      timeframe: date,
    }
    const quoteAttesterSignedEncodedDetails =
      await Quote.createAttesterSignedQuote(
        quoteDataEncodedDetails,
        bobLightDidWithDetails,
        bobSign
      )
    const bothSignedEncodedDetails = await Quote.createQuoteAgreement(
      quoteAttesterSignedEncodedDetails,
      content.rootHash,
      bobLightDidWithDetails.uri,
      aliceLightDidWithDetails,
      aliceSign,
      {
        resolver: mockResolver,
      }
    )
    const requestAttestationBodyWithEncodedDetails: IRequestAttestation = {
      content: {
        requestForAttestation: contentWithEncodedDetails,
        quote: bothSignedEncodedDetails,
      },
      type: 'request-attestation',
    }

    // Should not throw if the owner and sender DID is the same.
    expect(() =>
      Message.ensureOwnerIsSender(
        new Message(requestAttestationBody, aliceLightDid.uri, bobLightDid.uri)
      )
    ).not.toThrow()

    // Should not throw if the owner has no additional details and the sender does.
    expect(() =>
      Message.ensureOwnerIsSender(
        new Message(
          requestAttestationBodyWithEncodedDetails,
          aliceLightDidWithDetails.uri,
          bobLightDid.uri
        )
      )
    ).not.toThrow()

    // Should not throw if the owner has additional details and the sender does not.
    expect(() =>
      Message.ensureOwnerIsSender(
        new Message(
          requestAttestationBodyWithEncodedDetails,
          aliceLightDid.uri,
          bobLightDid.uri
        )
      )
    ).not.toThrow()

    // Should not throw if the sender is the full DID version of the owner.
    expect(() =>
      Message.ensureOwnerIsSender(
        new Message(requestAttestationBody, aliceFullDid.uri, bobLightDid.uri)
      )
    ).not.toThrow()

    // Should throw if the sender and the owner are two different entities.
    expect(() =>
      Message.ensureOwnerIsSender(
        new Message(requestAttestationBody, bobLightDid.uri, aliceLightDid.uri)
      )
    ).toThrowError(SDKErrors.ERROR_IDENTITY_MISMATCH)

    const attestation = {
      delegationId: null,
      claimHash: requestAttestationBody.content.requestForAttestation.rootHash,
      cTypeHash: Crypto.hashStr('0x12345678'),
      owner: bobLightDid.uri,
      revoked: false,
    }

    const submitAttestationBody: ISubmitAttestation = {
      content: {
        attestation,
      },
      type: 'submit-attestation',
    }

    const attestationWithEncodedDetails = {
      delegationId: null,
      claimHash: requestAttestationBody.content.requestForAttestation.rootHash,
      cTypeHash: Crypto.hashStr('0x12345678'),
      owner: bobLightDidWithDetails.uri,
      revoked: false,
    }

    const submitAttestationBodyWithEncodedDetails: ISubmitAttestation = {
      content: {
        attestation: attestationWithEncodedDetails,
      },
      type: 'submit-attestation',
    }

    // Should not throw if the owner and sender DID is the same.
    expect(() =>
      Message.ensureOwnerIsSender(
        new Message(submitAttestationBody, bobLightDid.uri, aliceLightDid.uri)
      )
    ).not.toThrow()

    // Should not throw if the owner has no additional details and the sender does.
    expect(() =>
      Message.ensureOwnerIsSender(
        new Message(
          submitAttestationBody,
          bobLightDidWithDetails.uri,
          aliceLightDid.uri
        )
      )
    ).not.toThrow()

    // Should not throw if the owner has additional details and the sender does not.
    expect(() =>
      Message.ensureOwnerIsSender(
        new Message(
          submitAttestationBodyWithEncodedDetails,
          bobLightDid.uri,
          aliceLightDid.uri
        )
      )
    ).not.toThrow()

    // Should not throw if the sender is the full DID version of the owner.
    expect(() =>
      Message.ensureOwnerIsSender(
        new Message(submitAttestationBody, bobFullDid.uri, aliceLightDid.uri)
      )
    ).not.toThrow()

    // Should throw if the sender and the owner are two different entities.
    expect(() =>
      Message.ensureOwnerIsSender(
        new Message(submitAttestationBody, aliceLightDid.uri, bobLightDid.uri)
      )
    ).toThrowError(SDKErrors.ERROR_IDENTITY_MISMATCH)

    const credential: ICredential = {
      request: content,
      attestation: submitAttestationBody.content.attestation,
    }

    const submitClaimsForCTypeBody: ISubmitCredential = {
      content: [credential],
      type: 'submit-credential',
    }

    const credentialWithEncodedDetails: ICredential = {
      request: contentWithEncodedDetails,
      attestation: submitAttestationBody.content.attestation,
    }

    const submitClaimsForCTypeBodyWithEncodedDetails: ISubmitCredential = {
      content: [credentialWithEncodedDetails],
      type: 'submit-credential',
    }

    // Should not throw if the owner and sender DID is the same.
    expect(() =>
      Message.ensureOwnerIsSender(
        new Message(
          submitClaimsForCTypeBody,
          aliceLightDid.uri,
          bobLightDid.uri
        )
      )
    ).not.toThrow()

    // Should not throw if the owner has no additional details and the sender does.
    expect(() =>
      Message.ensureOwnerIsSender(
        new Message(
          submitClaimsForCTypeBody,
          aliceLightDidWithDetails.uri,
          bobLightDid.uri
        )
      )
    ).not.toThrow()

    // Should not throw if the owner has additional details and the sender does not.
    expect(() =>
      Message.ensureOwnerIsSender(
        new Message(
          submitClaimsForCTypeBodyWithEncodedDetails,
          aliceLightDid.uri,
          bobLightDid.uri
        )
      )
    ).not.toThrow()

    // Should not throw if the sender is the full DID version of the owner.
    expect(() =>
      Message.ensureOwnerIsSender(
        new Message(submitClaimsForCTypeBody, aliceFullDid.uri, bobLightDid.uri)
      )
    ).not.toThrow()

    // Should throw if the sender and the owner are two different entities.
    expect(() =>
      Message.ensureOwnerIsSender(
        new Message(
          submitClaimsForCTypeBody,
          bobLightDid.uri,
          aliceLightDid.uri
        )
      )
    ).toThrowError(SDKErrors.ERROR_IDENTITY_MISMATCH)
  })
})
