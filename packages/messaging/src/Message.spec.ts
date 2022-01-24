/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group unit/messaging
 */

import { hexToU8a } from '@polkadot/util'

import type {
  ICredential,
  IEncryptedMessage,
  IQuote,
  IDidResolvedDetails,
  IDidKeyDetails,
  IRequestAttestation,
  ISubmitAttestation,
  ISubmitCredential,
  IDidDetails,
  IDidResolver,
} from '@kiltprotocol/types'
import { KeyRelationship } from '@kiltprotocol/types'

import { Crypto, SDKErrors } from '@kiltprotocol/utils'
import { Quote, RequestForAttestation } from '@kiltprotocol/core'
import {
  createLocalDemoDidFromSeed,
  createLightDidFromSeed,
  DemoKeystore,
  DidUtils,
  LightDidDetails,
  newFullDidDetailsfromKeys,
} from '@kiltprotocol/did'
import { Message } from './Message'

describe('Messaging', () => {
  let mockResolver: IDidResolver
  let keystore: DemoKeystore
  let identityAlice: IDidDetails
  let identityBob: IDidDetails
  let date: string

  beforeAll(async () => {
    date = new Date(2019, 11, 10).toISOString()
    keystore = new DemoKeystore()
    identityAlice = await createLocalDemoDidFromSeed(keystore, '//Alice')
    identityBob = await createLocalDemoDidFromSeed(keystore, '//Bob')

    const resolveDoc = async (
      did: string
    ): Promise<IDidResolvedDetails | null> => {
      if (did.startsWith(identityAlice.did)) {
        return { details: identityAlice, metadata: { deactivated: false } }
      }
      if (did.startsWith(identityBob.did)) {
        return { details: identityBob, metadata: { deactivated: false } }
      }
      return null
    }
    const resolveKey = async (did: string): Promise<IDidKeyDetails | null> => {
      const details = await resolveDoc(did)
      return details?.details?.getKey(did) || null
    }
    mockResolver = {
      resolve: async (did) => {
        return (await resolveKey(did)) || resolveDoc(did)
      },
      resolveKey,
      resolveDoc,
    } as IDidResolver
  })

  it('verify message encryption and signing', async () => {
    const message = new Message(
      {
        type: Message.BodyType.REQUEST_CREDENTIAL,
        content: {
          cTypes: [{ cTypeHash: `kilt:ctype:${Crypto.hashStr('0x12345678')}` }],
        },
      },
      identityAlice.did,
      identityBob.did
    )
    const encryptedMessage = await message.encrypt(
      identityAlice.getKeys(KeyRelationship.keyAgreement)[0],
      identityBob.getKeys(KeyRelationship.keyAgreement)[0],
      keystore
    )

    const decryptedMessage = await Message.decrypt(encryptedMessage, keystore, {
      resolver: mockResolver,
    })
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
    encryptedMessageWrongContent.ciphertext = Crypto.u8aToHex(messedUpContent)

    await expect(() =>
      Message.decrypt(encryptedMessageWrongContent, keystore, {
        resolver: mockResolver,
      })
    ).rejects.toThrowError(SDKErrors.ERROR_DECODING_MESSAGE())

    const encryptedWrongBody = await keystore.encrypt({
      alg: 'x25519-xsalsa20-poly1305',
      data: Crypto.coToUInt8('{ wrong JSON'),
      publicKey: Crypto.coToUInt8(
        identityAlice.getKeys(KeyRelationship.keyAgreement)[0].publicKeyHex
      ),
      peerPublicKey: Crypto.coToUInt8(
        identityBob.getKeys(KeyRelationship.keyAgreement)[0].publicKeyHex
      ),
    })
    const encryptedMessageWrongBody: IEncryptedMessage = {
      ciphertext: Crypto.u8aToHex(encryptedWrongBody.data),
      nonce: Crypto.u8aToHex(encryptedWrongBody.nonce),
      senderKeyId: identityAlice.getKeys(KeyRelationship.keyAgreement)[0].id,
      receiverKeyId: identityBob.getKeys(KeyRelationship.keyAgreement)[0].id,
    }
    await expect(() =>
      Message.decrypt(encryptedMessageWrongBody, keystore, {
        resolver: mockResolver,
      })
    ).rejects.toThrowError(SDKErrors.ERROR_PARSING_MESSAGE())
  })

  it('verifies the sender is the sender key owner', async () => {
    const wrongSender = `did:kilt:${Crypto.encodeAddress(
      new Uint8Array(32),
      38
    )}`

    const message = new Message(
      {
        type: Message.BodyType.REQUEST_CREDENTIAL,
        content: {
          cTypes: [{ cTypeHash: `kilt:ctype:${Crypto.hashStr('0x12345678')}` }],
        },
      },
      wrongSender,
      identityBob.did
    )

    const forgedAliceKey = {
      ...identityAlice.getKeys(KeyRelationship.keyAgreement)[0],
    }
    forgedAliceKey.controller = wrongSender

    const encryptedMessage = await message.encrypt(
      forgedAliceKey,
      identityBob.getKeys(KeyRelationship.keyAgreement)[0],
      keystore
    )
    await expect(
      Message.decrypt(encryptedMessage, keystore, {
        resolver: mockResolver,
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"Error parsing message body"`)
  })

  it('verifies the message with sender is the owner (as full DID)', async () => {
    const lightDidOwner = await createLightDidFromSeed(keystore, '//Owner')
    const lightDidOwnerIdentifier = DidUtils.getIdentifierFromKiltDid(
      lightDidOwner.did
    ).substring(2)
    const lightDidOwnerAuthKey = lightDidOwner
      .getKeys(KeyRelationship.authentication)
      .pop()!
    const fullDidOwner = newFullDidDetailsfromKeys({
      authentication: {
        id: `did:kilt:${lightDidOwnerIdentifier}#auth-key`,
        controller: `did:kilt:${lightDidOwnerIdentifier}`,
        publicKeyHex: lightDidOwnerAuthKey.publicKeyHex,
        type: lightDidOwnerAuthKey.type,
      },
    })

    const lightDidAttester = await createLightDidFromSeed(
      keystore,
      '//Attester'
    )
    const lightDidAttesterIdentifier = DidUtils.getIdentifierFromKiltDid(
      lightDidAttester.did
    ).substring(2)
    const lightDidAttesterAuthKey = lightDidAttester
      .getKeys(KeyRelationship.authentication)
      .pop()!
    const fullDidAttester = newFullDidDetailsfromKeys({
      authentication: {
        id: `did:kilt:${lightDidAttesterIdentifier}#auth-key`,
        controller: `did:kilt:${lightDidAttesterIdentifier}`,
        publicKeyHex: lightDidAttesterAuthKey.publicKeyHex,
        type: lightDidAttesterAuthKey.type,
      },
    })

    const content = RequestForAttestation.fromClaim({
      cTypeHash: `kilt:ctype:${Crypto.hashStr('0x12345678')}`,
      owner: fullDidOwner.did,
      contents: {},
    })

    const quoteData: IQuote = {
      attesterDid: fullDidAttester.did,
      cTypeHash: `kilt:ctype:${Crypto.hashStr('0x12345678')}`,
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
      fullDidAttester,
      keystore
    )
    const bothSigned = await Quote.createQuoteAgreement(
      quoteAttesterSigned,
      content.rootHash,
      fullDidAttester.did,
      fullDidOwner,
      keystore,
      mockResolver
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
        new Message(requestAttestationBody, fullDidOwner.did, identityBob.did)
      )
    ).not.toThrow()

    // Should not throw if the sender is the light DID version of the owner.
    // This is technically not to be allowed but message verification is not concerned with that.
    expect(() =>
      Message.ensureOwnerIsSender(
        new Message(requestAttestationBody, lightDidOwner.did, identityBob.did)
      )
    ).not.toThrow()

    // Should throw if the sender and the owner are two different entities.
    expect(() =>
      Message.ensureOwnerIsSender(
        new Message(
          requestAttestationBody,
          fullDidAttester.did,
          identityAlice.did
        )
      )
    ).toThrowError(SDKErrors.ERROR_IDENTITY_MISMATCH('Claim', 'Sender'))

    const attestation = {
      delegationId: null,
      claimHash: requestAttestationBody.content.requestForAttestation.rootHash,
      cTypeHash: `kilt:ctype:${Crypto.hashStr('0x12345678')}`,
      owner: fullDidAttester.did,
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
        new Message(
          submitAttestationBody,
          fullDidAttester.did,
          identityAlice.did
        )
      )
    ).not.toThrow()

    // Should not throw if the sender is the light DID version of the owner.
    // This is technically not to be allowed but message verification is not concerned with that.
    expect(() =>
      Message.ensureOwnerIsSender(
        new Message(
          submitAttestationBody,
          lightDidAttester.did,
          identityAlice.did
        )
      )
    ).not.toThrow()

    // Should throw if the sender and the owner are two different entities.
    expect(() =>
      Message.ensureOwnerIsSender(
        new Message(submitAttestationBody, fullDidOwner.did, identityBob.did)
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
        new Message(submitClaimsForCTypeBody, fullDidOwner.did, identityBob.did)
      )
    ).not.toThrow()

    // Should not throw if the sender is the light DID version of the owner.
    // This is technically not to be allowed but message verification is not concerned with that.
    expect(() =>
      Message.ensureOwnerIsSender(
        new Message(
          submitClaimsForCTypeBody,
          lightDidOwner.did,
          identityBob.did
        )
      )
    ).not.toThrow()

    // Should throw if the sender and the owner are two different entities.
    expect(() =>
      Message.ensureOwnerIsSender(
        new Message(
          submitClaimsForCTypeBody,
          fullDidAttester.did,
          identityAlice.did
        )
      )
    ).toThrowError(SDKErrors.ERROR_IDENTITY_MISMATCH('Claims', 'Sender'))
  })

  it('verifies the message with sender is the owner (as light DID)', async () => {
    const lightDidOwner = await createLightDidFromSeed(keystore, '//Owner')
    const lightDidOwnerIdentifier = DidUtils.getIdentifierFromKiltDid(
      lightDidOwner.did
    ).substring(2)
    const lightDidOwnerAuthKey = lightDidOwner
      .getKeys(KeyRelationship.authentication)
      .pop()!
    const lightDidOwnerWithEncodedDetails = new LightDidDetails({
      authenticationKey: {
        publicKey: hexToU8a(lightDidOwnerAuthKey.publicKeyHex),
        type: lightDidOwnerAuthKey.type,
      },
      serviceEndpoints: [
        {
          id: 'id-1',
          types: ['type-1'],
          urls: ['url-1'],
        },
      ],
    })
    const fullDidOwner = newFullDidDetailsfromKeys({
      authentication: {
        id: `did:kilt:${lightDidOwnerIdentifier}#auth-key`,
        controller: `did:kilt:${lightDidOwnerIdentifier}`,
        publicKeyHex: lightDidOwnerAuthKey.publicKeyHex,
        type: lightDidOwnerAuthKey.type,
      },
    })

    const lightDidAttester = await createLightDidFromSeed(
      keystore,
      '//Attester'
    )
    const lightDidAttesterIdentifier = DidUtils.getIdentifierFromKiltDid(
      lightDidAttester.did
    ).substring(2)
    const lightDidAttesterAuthKey = lightDidAttester
      .getKeys(KeyRelationship.authentication)
      .pop()!
    const lightDidAttesterWithEncodedDetails = new LightDidDetails({
      authenticationKey: {
        publicKey: hexToU8a(lightDidAttesterAuthKey.publicKeyHex),
        type: lightDidAttesterAuthKey.type,
      },
      serviceEndpoints: [
        {
          id: 'id-1',
          types: ['type-1'],
          urls: ['url-1'],
        },
      ],
    })
    const fullDidAttester = newFullDidDetailsfromKeys({
      authentication: {
        id: `did:kilt:${lightDidAttesterIdentifier}#auth-key`,
        controller: `did:kilt:${lightDidAttesterIdentifier}`,
        publicKeyHex: lightDidAttesterAuthKey.publicKeyHex,
        type: lightDidAttesterAuthKey.type,
      },
    })

    // Create request for attestation to the light DID with no encoded details
    const content = RequestForAttestation.fromClaim({
      cTypeHash: `kilt:ctype:${Crypto.hashStr('0x12345678')}`,
      owner: lightDidOwner.did,
      contents: {},
    })

    const quoteData: IQuote = {
      attesterDid: lightDidAttester.did,
      cTypeHash: `kilt:ctype:${Crypto.hashStr('0x12345678')}`,
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
      lightDidAttester,
      keystore
    )
    const bothSigned = await Quote.createQuoteAgreement(
      quoteAttesterSigned,
      content.rootHash,
      lightDidAttester.did,
      lightDidOwner,
      keystore,
      mockResolver
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
      cTypeHash: `kilt:ctype:${Crypto.hashStr('0x12345678')}`,
      owner: lightDidOwnerWithEncodedDetails.did,
      contents: {},
    })

    const quoteDataEncodedDetails: IQuote = {
      attesterDid: lightDidAttesterWithEncodedDetails.did,
      cTypeHash: `kilt:ctype:${Crypto.hashStr('0x12345678')}`,
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
        lightDidAttesterWithEncodedDetails,
        keystore
      )
    const bothSignedEncodedDetails = await Quote.createQuoteAgreement(
      quoteAttesterSignedEncodedDetails,
      content.rootHash,
      lightDidAttesterWithEncodedDetails.did,
      lightDidOwnerWithEncodedDetails,
      keystore,
      mockResolver
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
        new Message(requestAttestationBody, lightDidOwner.did, identityBob.did)
      )
    ).not.toThrow()

    // Should not throw if the owner has no additional details and the sender does.
    expect(() =>
      Message.ensureOwnerIsSender(
        new Message(
          requestAttestationBodyWithEncodedDetails,
          lightDidOwner.did,
          identityBob.did
        )
      )
    ).not.toThrow()

    // Should not throw if the owner has additional details and the sender does not.
    expect(() =>
      Message.ensureOwnerIsSender(
        new Message(
          requestAttestationBodyWithEncodedDetails,
          lightDidOwner.did,
          identityBob.did
        )
      )
    ).not.toThrow()

    // Should not throw if the sender is the full DID version of the owner.
    expect(() =>
      Message.ensureOwnerIsSender(
        new Message(requestAttestationBody, fullDidOwner.did, identityBob.did)
      )
    ).not.toThrow()

    // Should throw if the sender and the owner are two different entities.
    expect(() =>
      Message.ensureOwnerIsSender(
        new Message(
          requestAttestationBody,
          fullDidAttester.did,
          identityAlice.did
        )
      )
    ).toThrowError(SDKErrors.ERROR_IDENTITY_MISMATCH('Claim', 'Sender'))

    const attestation = {
      delegationId: null,
      claimHash: requestAttestationBody.content.requestForAttestation.rootHash,
      cTypeHash: `kilt:ctype:${Crypto.hashStr('0x12345678')}`,
      owner: lightDidAttester.did,
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
      cTypeHash: `kilt:ctype:${Crypto.hashStr('0x12345678')}`,
      owner: lightDidAttesterWithEncodedDetails.did,
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
        new Message(
          submitAttestationBody,
          lightDidAttester.did,
          lightDidOwner.did
        )
      )
    ).not.toThrow()

    // Should not throw if the owner has no additional details and the sender does.
    expect(() =>
      Message.ensureOwnerIsSender(
        new Message(
          submitAttestationBody,
          lightDidAttesterWithEncodedDetails.did,
          lightDidOwner.did
        )
      )
    ).not.toThrow()

    // Should not throw if the owner has additional details and the sender does not.
    expect(() =>
      Message.ensureOwnerIsSender(
        new Message(
          submitAttestationBodyWithEncodedDetails,
          lightDidAttester.did,
          lightDidOwner.did
        )
      )
    ).not.toThrow()

    // Should not throw if the sender is the full DID version of the owner.

    expect(() =>
      Message.ensureOwnerIsSender(
        new Message(
          submitAttestationBody,
          fullDidAttester.did,
          lightDidOwner.did
        )
      )
    ).not.toThrow()

    // Should throw if the sender and the owner are two different entities.
    expect(() =>
      Message.ensureOwnerIsSender(
        new Message(submitAttestationBody, lightDidOwner.did, identityBob.did)
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
          lightDidOwner.did,
          identityBob.did
        )
      )
    ).not.toThrow()

    // Should not throw if the owner has no additional details and the sender does.
    expect(() =>
      Message.ensureOwnerIsSender(
        new Message(
          submitClaimsForCTypeBody,
          lightDidOwnerWithEncodedDetails.did,
          identityBob.did
        )
      )
    ).not.toThrow()

    // Should not throw if the owner has additional details and the sender does not.
    expect(() =>
      Message.ensureOwnerIsSender(
        new Message(
          submitClaimsForCTypeBodyWithEncodedDetails,
          lightDidOwner.did,
          identityBob.did
        )
      )
    ).not.toThrow()

    // Should not throw if the sender is the full DID version of the owner.
    expect(() =>
      Message.ensureOwnerIsSender(
        new Message(submitClaimsForCTypeBody, fullDidOwner.did, identityBob.did)
      )
    ).not.toThrow()

    // Should throw if the sender and the owner are two different entities.
    expect(() =>
      Message.ensureOwnerIsSender(
        new Message(
          submitClaimsForCTypeBody,
          fullDidAttester.did,
          identityAlice.did
        )
      )
    ).toThrowError(SDKErrors.ERROR_IDENTITY_MISMATCH('Claims', 'Sender'))
  })
})
