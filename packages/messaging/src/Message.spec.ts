/**
 * Copyright 2018-2021 BOTLabs GmbH.
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
  EncryptionKeyType,
  ICredential,
  IDidDetails,
  IDidResolver,
  IEncryptedMessage,
  IQuote,
  IRequestAttestation,
  ISubmitAttestation,
  ISubmitCredential,
  ResolvedDidKey,
  ResolvedDidServiceEndpoint,
} from '@kiltprotocol/types'
import { Quote, RequestForAttestation } from '@kiltprotocol/core'
import {
  DemoKeystore,
  LightDidDetails,
  Utils as DidUtils,
  EncryptionAlgorithms,
  SigningAlgorithms,
  FullDidDetails,
  DemoKeystoreUtils,
  LightDidSupportedVerificationKeyType,
} from '@kiltprotocol/did'
import { u8aToHex } from '@polkadot/util'
import { Crypto, SDKErrors } from '@kiltprotocol/utils'

import { Message } from './Message'

let keystore: DemoKeystore

let aliceLightDid: LightDidDetails
let aliceLightDidWithDetails: LightDidDetails
let aliceFullDid: FullDidDetails

let bobLightDid: LightDidDetails
let bobLightDidWithDetails: LightDidDetails
let bobFullDid: FullDidDetails

const resolveDoc = async (
  did: IDidDetails['uri']
): Promise<DidResolvedDetails | null> => {
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
  > => {
    return (
      (await resolveKey(didUri as DidResourceUri)) ||
      resolveDoc(didUri as DidUri)
    )
  },
} as IDidResolver

beforeAll(async () => {
  keystore = new DemoKeystore()

  const aliceAuthKey = await keystore.generateKeypair({
    seed: 'Alice//auth',
    alg: SigningAlgorithms.Ed25519,
  })
  const aliceEncKey = await keystore.generateKeypair({
    seed: 'Alice//enc',
    alg: EncryptionAlgorithms.NaclBox,
  })
  aliceLightDid = LightDidDetails.fromDetails({
    authenticationKey: {
      type: DidUtils.getVerificationKeyTypeForSigningAlgorithm(
        aliceAuthKey.alg
      ) as LightDidSupportedVerificationKeyType,
      ...aliceAuthKey,
    },
    encryptionKey: { type: EncryptionKeyType.X25519, ...aliceEncKey },
  })
  aliceLightDidWithDetails = LightDidDetails.fromDetails({
    authenticationKey: {
      type: DidUtils.getVerificationKeyTypeForSigningAlgorithm(
        aliceAuthKey.alg
      ) as LightDidSupportedVerificationKeyType,
      ...aliceAuthKey,
    },
    encryptionKey: { type: EncryptionKeyType.X25519, ...aliceEncKey },
    serviceEndpoints: [{ id: 'id-1', types: ['type-1'], urls: ['x:url-1'] }],
  })
  aliceFullDid = await DemoKeystoreUtils.createLocalDemoFullDidFromLightDid(
    aliceLightDid
  )

  const bobAuthKey = await keystore.generateKeypair({
    seed: 'Bob//auth',
    alg: SigningAlgorithms.Ed25519,
  })
  const bobEncKey = await keystore.generateKeypair({
    seed: 'Bob//enc',
    alg: EncryptionAlgorithms.NaclBox,
  })
  bobLightDid = LightDidDetails.fromDetails({
    authenticationKey: {
      type: DidUtils.getVerificationKeyTypeForSigningAlgorithm(
        aliceAuthKey.alg
      ) as LightDidSupportedVerificationKeyType,
      ...bobAuthKey,
    },
    encryptionKey: { type: EncryptionKeyType.X25519, ...bobEncKey },
  })
  bobLightDidWithDetails = LightDidDetails.fromDetails({
    authenticationKey: {
      type: DidUtils.getVerificationKeyTypeForSigningAlgorithm(
        aliceAuthKey.alg
      ) as LightDidSupportedVerificationKeyType,
      ...bobAuthKey,
    },
    encryptionKey: { type: EncryptionKeyType.X25519, ...bobEncKey },
    serviceEndpoints: [{ id: 'id-1', types: ['type-1'], urls: ['x:url-1'] }],
  })
  bobFullDid = await DemoKeystoreUtils.createLocalDemoFullDidFromLightDid(
    bobLightDid
  )
})

describe('Messaging', () => {
  it('verify message encryption and signing', async () => {
    const message = new Message(
      {
        type: Message.BodyType.REQUEST_CREDENTIAL,
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
      keystore,
      `${bobLightDid.uri}#encryption`,
      {
        resolver: mockResolver,
      }
    )

    const decryptedMessage = await Message.decrypt(
      encryptedMessage,
      keystore,
      bobLightDid,
      {
        resolver: mockResolver,
      }
    )
    expect(JSON.stringify(message.body)).toEqual(
      JSON.stringify(decryptedMessage.body)
    )

    const encryptedMessageWrongContent: IEncryptedMessage = JSON.parse(
      JSON.stringify(encryptedMessage)
    ) as IEncryptedMessage
    const messedUpContent = Crypto.coToUInt8(
      encryptedMessageWrongContent.ciphertext
    )
    messedUpContent.set(Crypto.hash('1234'), 10)
    encryptedMessageWrongContent.ciphertext = u8aToHex(messedUpContent)

    await expect(() =>
      Message.decrypt(encryptedMessageWrongContent, keystore, bobLightDid, {
        resolver: mockResolver,
      })
    ).rejects.toThrowError(SDKErrors.ERROR_DECODING_MESSAGE())

    const encryptedWrongBody = await keystore.encrypt({
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
      Message.decrypt(encryptedMessageWrongBody, keystore, bobLightDid, {
        resolver: mockResolver,
      })
    ).rejects.toThrowError(SDKErrors.ERROR_PARSING_MESSAGE())
  })

  it('verifies the message with sender is the owner (as full DID)', async () => {
    const content = RequestForAttestation.fromClaim({
      cTypeHash: `${Crypto.hashStr('0x12345678')}`,
      owner: aliceFullDid.uri,
      contents: {},
    })
    const date: string = new Date(2019, 11, 10).toISOString()

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
    const quoteAttesterSigned = await Quote.createAttesterSignature(
      quoteData,
      bobFullDid,
      keystore
    )
    const bothSigned = await Quote.createQuoteAgreement(
      quoteAttesterSigned,
      content.rootHash,
      bobFullDid.uri,
      aliceFullDid,
      keystore,
      {
        resolver: mockResolver,
      }
    )
    const requestAttestationBody: IRequestAttestation = {
      content: {
        requestForAttestation: content,
        quote: bothSigned,
      },
      type: Message.BodyType.REQUEST_ATTESTATION,
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
    ).toThrowError(SDKErrors.ERROR_IDENTITY_MISMATCH('Claim', 'Sender'))

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
      type: Message.BodyType.SUBMIT_ATTESTATION,
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
    ).toThrowError(SDKErrors.ERROR_IDENTITY_MISMATCH('Attestation', 'Sender'))

    const credential: ICredential = {
      request: content,
      attestation: submitAttestationBody.content.attestation,
    }

    const submitClaimsForCTypeBody: ISubmitCredential = {
      content: [credential],
      type: Message.BodyType.SUBMIT_CREDENTIAL,
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
    ).toThrowError(SDKErrors.ERROR_IDENTITY_MISMATCH('Claims', 'Sender'))
  })

  it('verifies the message with sender is the owner (as light DID)', async () => {
    // Create request for attestation to the light DID with no encoded details
    const content = RequestForAttestation.fromClaim({
      cTypeHash: `${Crypto.hashStr('0x12345678')}`,
      owner: aliceLightDid.uri,
      contents: {},
    })

    const date: string = new Date(2019, 11, 10).toISOString()
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
    const quoteAttesterSigned = await Quote.createAttesterSignature(
      quoteData,
      bobLightDid,
      keystore
    )
    const bothSigned = await Quote.createQuoteAgreement(
      quoteAttesterSigned,
      content.rootHash,
      bobLightDid.uri,
      aliceLightDid,
      keystore,
      {
        resolver: mockResolver,
      }
    )
    const requestAttestationBody: IRequestAttestation = {
      content: {
        requestForAttestation: content,
        quote: bothSigned,
      },
      type: Message.BodyType.REQUEST_ATTESTATION,
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
      await Quote.createAttesterSignature(
        quoteDataEncodedDetails,
        bobLightDidWithDetails,
        keystore
      )
    const bothSignedEncodedDetails = await Quote.createQuoteAgreement(
      quoteAttesterSignedEncodedDetails,
      content.rootHash,
      bobLightDidWithDetails.uri,
      aliceLightDidWithDetails,
      keystore,
      {
        resolver: mockResolver,
      }
    )
    const requestAttestationBodyWithEncodedDetails: IRequestAttestation = {
      content: {
        requestForAttestation: contentWithEncodedDetails,
        quote: bothSignedEncodedDetails,
      },
      type: Message.BodyType.REQUEST_ATTESTATION,
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
    ).toThrowError(SDKErrors.ERROR_IDENTITY_MISMATCH('Claim', 'Sender'))

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
      type: Message.BodyType.SUBMIT_ATTESTATION,
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
      type: Message.BodyType.SUBMIT_ATTESTATION,
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
    ).toThrowError(SDKErrors.ERROR_IDENTITY_MISMATCH('Attestation', 'Sender'))

    const credential: ICredential = {
      request: content,
      attestation: submitAttestationBody.content.attestation,
    }

    const submitClaimsForCTypeBody: ISubmitCredential = {
      content: [credential],
      type: Message.BodyType.SUBMIT_CREDENTIAL,
    }

    const credentialWithEncodedDetails: ICredential = {
      request: contentWithEncodedDetails,
      attestation: submitAttestationBody.content.attestation,
    }

    const submitClaimsForCTypeBodyWithEncodedDetails: ISubmitCredential = {
      content: [credentialWithEncodedDetails],
      type: Message.BodyType.SUBMIT_CREDENTIAL,
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
    ).toThrowError(SDKErrors.ERROR_IDENTITY_MISMATCH('Claims', 'Sender'))
  })
})
