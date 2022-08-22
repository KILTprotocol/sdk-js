/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group unit/messaging
 */

import type {
  DidDetails,
  DidKey,
  DidResolvedDetails,
  DidResourceUri,
  DidUri,
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
import { Quote, Credential } from '@kiltprotocol/core'
import * as Did from '@kiltprotocol/did'
import {
  createLocalDemoFullDidFromLightDid,
  makeEncryptionKeyTool,
  makeSigningKeyTool,
} from '@kiltprotocol/testing'
import { u8aToHex } from '@polkadot/util'
import { Crypto, SDKErrors } from '@kiltprotocol/utils'

import { Message } from './Message'

let aliceLightDid: DidDetails
let aliceLightDidWithDetails: DidDetails
let aliceFullDid: DidDetails
let aliceSign: SignCallback
const aliceEncKey = makeEncryptionKeyTool('Alice//enc')

let bobLightDid: DidDetails
let bobLightDidWithDetails: DidDetails
let bobFullDid: DidDetails
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
  keyUri: DidResourceUri
): Promise<ResolvedDidKey | null> => {
  const { fragment, did } = Did.Utils.parseDidUri(keyUri)
  const { details } = (await resolveDoc(did as DidUri)) as DidResolvedDetails
  if (!details) throw new Error('Could not resolve details')
  const key = Did.getKey(details, fragment!) as DidKey
  return {
    controller: details!.uri,
    id: keyUri,
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
  aliceLightDid = Did.createLightDidDetails({
    authentication: aliceAuthKey.authentication,
    keyAgreement: aliceEncKey.keyAgreement,
  })
  aliceLightDidWithDetails = Did.createLightDidDetails({
    authentication: aliceAuthKey.authentication,
    keyAgreement: aliceEncKey.keyAgreement,
    service: [{ id: '#id-1', type: ['type-1'], serviceEndpoint: ['x:url-1'] }],
  })
  aliceFullDid = await createLocalDemoFullDidFromLightDid(aliceLightDid)

  const bobAuthKey = makeSigningKeyTool('ed25519')
  bobSign = bobAuthKey.sign
  bobLightDid = Did.createLightDidDetails({
    authentication: bobAuthKey.authentication,
    keyAgreement: bobEncKey.keyAgreement,
  })
  bobLightDidWithDetails = Did.createLightDidDetails({
    authentication: bobAuthKey.authentication,
    keyAgreement: bobEncKey.keyAgreement,
    service: [{ id: '#id-1', type: ['type-1'], serviceEndpoint: ['x:url-1'] }],
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
      '#encryption',
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
    ).rejects.toThrowError(SDKErrors.DecodingMessageError)

    const encryptedWrongBody = await aliceEncKey.encrypt({
      alg: 'x25519-xsalsa20-poly1305',
      data: Crypto.coToUInt8('{ wrong JSON'),
      publicKey: aliceLightDid.keyAgreement![0].publicKey,
      peerPublicKey: bobLightDid.keyAgreement![0].publicKey,
    })
    const encryptedMessageWrongBody: IEncryptedMessage = {
      ciphertext: u8aToHex(encryptedWrongBody.data),
      nonce: u8aToHex(encryptedWrongBody.nonce),
      senderKeyUri: `${aliceLightDid.uri}${aliceLightDid.keyAgreement![0].id}`,
      receiverKeyUri: `${bobLightDid.uri}${bobLightDid.keyAgreement![0].id}`,
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
    ).rejects.toThrowError(SDKErrors.ParsingMessageError)
  })

  it('verifies the message with sender is the owner (as full DID)', async () => {
    const content = Credential.fromClaim({
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
        credential: content,
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
    ).toThrowError(SDKErrors.IdentityMismatchError)

    const attestation = {
      delegationId: null,
      claimHash: requestAttestationBody.content.credential.rootHash,
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
    ).toThrowError(SDKErrors.IdentityMismatchError)

    const submitClaimsForCTypeBody: ISubmitCredential = {
      content: [content],
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
    ).toThrowError(SDKErrors.IdentityMismatchError)
  })

  it('verifies the message with sender is the owner (as light DID)', async () => {
    // Create request for attestation to the light DID with no encoded details
    const content = Credential.fromClaim({
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
        credential: content,
        quote: bothSigned,
      },
      type: 'request-attestation',
    }

    // Create request for attestation to the light DID with encoded details
    const contentWithEncodedDetails = Credential.fromClaim({
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
        credential: contentWithEncodedDetails,
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
    ).toThrowError(SDKErrors.IdentityMismatchError)

    const attestation = {
      delegationId: null,
      claimHash: requestAttestationBody.content.credential.rootHash,
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
      claimHash: requestAttestationBody.content.credential.rootHash,
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
    ).toThrowError(SDKErrors.IdentityMismatchError)

    const submitClaimsForCTypeBody: ISubmitCredential = {
      content: [content],
      type: 'submit-credential',
    }

    const submitClaimsForCTypeBodyWithEncodedDetails: ISubmitCredential = {
      content: [contentWithEncodedDetails],
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
    ).toThrowError(SDKErrors.IdentityMismatchError)
  })
})
