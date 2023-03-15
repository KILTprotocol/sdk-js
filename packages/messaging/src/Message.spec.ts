/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group unit/messaging
 */

import type {
  DidDocument,
  DidResourceUri,
  DidUri,
  IEncryptedMessage,
  IQuote,
  IRequestAttestation,
  ISubmitAttestation,
  ISubmitCredential,
  ResolvedDidKey,
  IAcceptCredential,
  IAttestation,
  IClaim,
  ICType,
  IDelegationData,
  IInformCreateDelegation,
  IInformDelegationCreation,
  IMessage,
  IQuoteAgreement,
  IQuoteAttesterSigned,
  IRejectAcceptDelegation,
  IRejectAttestation,
  IRejectCredential,
  IRejectTerms,
  IRequestAcceptDelegation,
  IRequestAttestationContent,
  IRequestCredential,
  IRequestCredentialContent,
  IRequestDelegationApproval,
  ICredential,
  IRequestTerms,
  ISubmitAcceptDelegation,
  ISubmitAttestationContent,
  ISubmitDelegationApproval,
  ISubmitTerms,
  ITerms,
  MessageBody,
  PartialClaim,
  ICredentialPresentation,
} from '@kiltprotocol/types'
import {
  Quote,
  Credential,
  Attestation,
  Claim,
  CType,
} from '@kiltprotocol/core'
import * as Did from '@kiltprotocol/did'
import {
  createLocalDemoFullDidFromLightDid,
  makeEncryptionKeyTool,
  makeSigningKeyTool,
  createLocalDemoFullDidFromKeypair,
  KeyTool,
  KeyToolSignCallback,
} from '@kiltprotocol/testing'
import { u8aToHex } from '@polkadot/util'
import { Crypto, SDKErrors } from '@kiltprotocol/utils'

import * as Message from './Message'

describe('Messaging', () => {
  let aliceLightDid: DidDocument
  let aliceLightDidWithDetails: DidDocument
  let aliceFullDid: DidDocument
  let aliceSign: KeyToolSignCallback
  const aliceEncKey = makeEncryptionKeyTool('Alice//enc')

  let bobLightDid: DidDocument
  let bobLightDidWithDetails: DidDocument
  let bobFullDid: DidDocument
  let bobSign: KeyToolSignCallback
  const bobEncKey = makeEncryptionKeyTool('Bob//enc')

  async function resolveKey(
    keyUri: DidResourceUri,
    keyRelationship = 'authentication'
  ): Promise<ResolvedDidKey> {
    const { did } = Did.parse(keyUri)
    const document = [
      aliceLightDidWithDetails,
      aliceLightDid,
      aliceFullDid,
      bobLightDidWithDetails,
      bobLightDid,
      bobFullDid,
    ].find(({ uri }) => uri === did)
    if (!document) throw new Error('Cannot resolve mocked DID')
    return Did.keyToResolvedKey(document[keyRelationship][0], did)
  }

  beforeAll(async () => {
    const aliceAuthKey = makeSigningKeyTool('ed25519')
    aliceSign = aliceAuthKey.getSignCallback
    aliceLightDid = Did.createLightDidDocument({
      authentication: aliceAuthKey.authentication,
      keyAgreement: aliceEncKey.keyAgreement,
    })
    aliceLightDidWithDetails = Did.createLightDidDocument({
      authentication: aliceAuthKey.authentication,
      keyAgreement: aliceEncKey.keyAgreement,
      service: [
        { id: '#id-1', type: ['type-1'], serviceEndpoint: ['x:url-1'] },
      ],
    })
    aliceFullDid = await createLocalDemoFullDidFromLightDid(aliceLightDid)

    const bobAuthKey = makeSigningKeyTool('ed25519')
    bobSign = bobAuthKey.getSignCallback
    bobLightDid = Did.createLightDidDocument({
      authentication: bobAuthKey.authentication,
      keyAgreement: bobEncKey.keyAgreement,
    })
    bobLightDidWithDetails = Did.createLightDidDocument({
      authentication: bobAuthKey.authentication,
      keyAgreement: bobEncKey.keyAgreement,
      service: [
        { id: '#id-1', type: ['type-1'], serviceEndpoint: ['x:url-1'] },
      ],
    })
    bobFullDid = await createLocalDemoFullDidFromLightDid(bobLightDid)
  })
  it('verify message encryption and signing', async () => {
    const message = Message.fromBody(
      {
        type: 'request-credential',
        content: {
          cTypes: [{ cTypeHash: `${Crypto.hashStr('0x12345678')}` }],
        },
      },
      aliceLightDid.uri,
      bobLightDid.uri
    )
    const encryptedMessage = await Message.encrypt(
      message,
      aliceEncKey.encrypt(aliceLightDid),
      `${bobLightDid.uri}#encryption`,
      { resolveKey }
    )

    const decryptedMessage = await Message.decrypt(
      encryptedMessage,
      bobEncKey.decrypt,
      { resolveKey }
    )
    expect(JSON.stringify(message.body)).toEqual(
      JSON.stringify(decryptedMessage.body)
    )

    expect(() => Message.verify(decryptedMessage)).not.toThrow()

    const encryptedMessageWrongContent = JSON.parse(
      JSON.stringify(encryptedMessage)
    ) as IEncryptedMessage
    const messedUpContent = Crypto.coToUInt8(
      encryptedMessageWrongContent.ciphertext
    )
    messedUpContent.set(Crypto.hash('1234'), 10)
    encryptedMessageWrongContent.ciphertext = u8aToHex(messedUpContent)

    await expect(() =>
      Message.decrypt(encryptedMessageWrongContent, bobEncKey.decrypt, {
        resolveKey,
      })
    ).rejects.toThrowError(SDKErrors.DecodingMessageError)

    const encryptedWrongBody = await aliceEncKey.encrypt(aliceLightDid)({
      data: Crypto.coToUInt8('{ wrong JSON'),
      peerPublicKey: bobLightDid.keyAgreement![0].publicKey,
      did: aliceLightDid.uri,
    })
    const encryptedMessageWrongBody: IEncryptedMessage = {
      ciphertext: u8aToHex(encryptedWrongBody.data),
      nonce: u8aToHex(encryptedWrongBody.nonce),
      senderKeyUri: `${aliceLightDid.uri}${aliceLightDid.keyAgreement![0].id}`,
      receiverKeyUri: `${bobLightDid.uri}${bobLightDid.keyAgreement![0].id}`,
    }
    await expect(() =>
      Message.decrypt(encryptedMessageWrongBody, bobEncKey.decrypt, {
        resolveKey,
      })
    ).rejects.toThrowError(SyntaxError)
  })

  it('verifies the message with sender is the owner (as full DID)', async () => {
    const credential = Credential.fromClaim({
      cTypeHash: `${Crypto.hashStr('0x12345678')}`,
      owner: aliceFullDid.uri,
      contents: {},
    })

    const presentation = await Credential.createPresentation({
      credential,
      signCallback: aliceSign(aliceFullDid),
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
      bobSign(bobFullDid)
    )
    const bothSigned = await Quote.createQuoteAgreement(
      quoteAttesterSigned,
      credential.rootHash,
      aliceSign(aliceFullDid),
      aliceFullDid.uri,
      { didResolveKey: resolveKey }
    )
    const requestAttestationBody: IRequestAttestation = {
      content: {
        credential,
        quote: bothSigned,
      },
      type: 'request-attestation',
    }

    // Should not throw if the owner and sender DID is the same.
    expect(() =>
      Message.ensureOwnerIsSender(
        Message.fromBody(
          requestAttestationBody,
          aliceFullDid.uri,
          bobFullDid.uri
        )
      )
    ).not.toThrow()

    // Should not throw if the sender is the light DID version of the owner.
    // This is technically not to be allowed but message verification is not concerned with that.
    expect(() =>
      Message.ensureOwnerIsSender(
        Message.fromBody(
          requestAttestationBody,
          aliceLightDid.uri,
          bobFullDid.uri
        )
      )
    ).not.toThrow()

    // Should throw if the sender and the owner are two different entities.
    expect(() =>
      Message.ensureOwnerIsSender(
        Message.fromBody(
          requestAttestationBody,
          bobFullDid.uri,
          aliceFullDid.uri
        )
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
        Message.fromBody(
          submitAttestationBody,
          bobFullDid.uri,
          aliceFullDid.uri
        )
      )
    ).not.toThrow()

    // Should not throw if the sender is the light DID version of the owner.
    // This is technically not to be allowed but message verification is not concerned with that.
    expect(() =>
      Message.ensureOwnerIsSender(
        Message.fromBody(
          submitAttestationBody,
          bobLightDid.uri,
          aliceFullDid.uri
        )
      )
    ).not.toThrow()

    // Should throw if the sender and the owner are two different entities.
    expect(() =>
      Message.ensureOwnerIsSender(
        Message.fromBody(
          submitAttestationBody,
          aliceFullDid.uri,
          bobFullDid.uri
        )
      )
    ).toThrowError(SDKErrors.IdentityMismatchError)

    const submitClaimsForCTypeBody: ISubmitCredential = {
      content: [presentation],
      type: 'submit-credential',
    }

    // Should not throw if the owner and sender DID is the same.
    expect(() =>
      Message.ensureOwnerIsSender(
        Message.fromBody(
          submitClaimsForCTypeBody,
          aliceFullDid.uri,
          bobFullDid.uri
        )
      )
    ).not.toThrow()

    // Should not throw if the sender is the light DID version of the owner.
    // This is technically not to be allowed but message verification is not concerned with that.
    expect(() =>
      Message.ensureOwnerIsSender(
        Message.fromBody(
          submitClaimsForCTypeBody,
          aliceLightDid.uri,
          bobFullDid.uri
        )
      )
    ).not.toThrow()

    // Should throw if the sender and the owner are two different entities.
    expect(() =>
      Message.ensureOwnerIsSender(
        Message.fromBody(
          submitClaimsForCTypeBody,
          bobFullDid.uri,
          aliceFullDid.uri
        )
      )
    ).toThrowError(SDKErrors.IdentityMismatchError)
  })

  it('verifies the message with sender is the owner (as light DID)', async () => {
    // Create request for attestation to the light DID with no encoded details
    const credential = Credential.fromClaim({
      cTypeHash: `${Crypto.hashStr('0x12345678')}`,
      owner: aliceLightDid.uri,
      contents: {},
    })

    const presentation = await Credential.createPresentation({
      credential,
      signCallback: aliceSign(aliceLightDid),
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
      bobSign(bobLightDid)
    )
    const bothSigned = await Quote.createQuoteAgreement(
      quoteAttesterSigned,
      credential.rootHash,
      aliceSign(aliceLightDid),
      aliceLightDid.uri,
      { didResolveKey: resolveKey }
    )
    const requestAttestationBody: IRequestAttestation = {
      content: {
        credential,
        quote: bothSigned,
      },
      type: 'request-attestation',
    }

    // Create request for attestation to the light DID with encoded details
    const contentWithEncodedDetails = await Credential.createPresentation({
      credential: Credential.fromClaim({
        cTypeHash: `${Crypto.hashStr('0x12345678')}`,
        owner: aliceLightDidWithDetails.uri,
        contents: {},
      }),
      signCallback: aliceSign(aliceLightDidWithDetails),
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
        bobSign(bobLightDidWithDetails)
      )
    const bothSignedEncodedDetails = await Quote.createQuoteAgreement(
      quoteAttesterSignedEncodedDetails,
      credential.rootHash,
      aliceSign(aliceLightDidWithDetails),
      aliceLightDidWithDetails.uri,
      { didResolveKey: resolveKey }
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
        Message.fromBody(
          requestAttestationBody,
          aliceLightDid.uri,
          bobLightDid.uri
        )
      )
    ).not.toThrow()

    // Should not throw if the owner has no additional details and the sender does.
    expect(() =>
      Message.ensureOwnerIsSender(
        Message.fromBody(
          requestAttestationBodyWithEncodedDetails,
          aliceLightDidWithDetails.uri,
          bobLightDid.uri
        )
      )
    ).not.toThrow()

    // Should not throw if the owner has additional details and the sender does not.
    expect(() =>
      Message.ensureOwnerIsSender(
        Message.fromBody(
          requestAttestationBodyWithEncodedDetails,
          aliceLightDid.uri,
          bobLightDid.uri
        )
      )
    ).not.toThrow()

    // Should not throw if the sender is the full DID version of the owner.
    expect(() =>
      Message.ensureOwnerIsSender(
        Message.fromBody(
          requestAttestationBody,
          aliceFullDid.uri,
          bobLightDid.uri
        )
      )
    ).not.toThrow()

    // Should throw if the sender and the owner are two different entities.
    expect(() =>
      Message.ensureOwnerIsSender(
        Message.fromBody(
          requestAttestationBody,
          bobLightDid.uri,
          aliceLightDid.uri
        )
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
        Message.fromBody(
          submitAttestationBody,
          bobLightDid.uri,
          aliceLightDid.uri
        )
      )
    ).not.toThrow()

    // Should not throw if the owner has no additional details and the sender does.
    expect(() =>
      Message.ensureOwnerIsSender(
        Message.fromBody(
          submitAttestationBody,
          bobLightDidWithDetails.uri,
          aliceLightDid.uri
        )
      )
    ).not.toThrow()

    // Should not throw if the owner has additional details and the sender does not.
    expect(() =>
      Message.ensureOwnerIsSender(
        Message.fromBody(
          submitAttestationBodyWithEncodedDetails,
          bobLightDid.uri,
          aliceLightDid.uri
        )
      )
    ).not.toThrow()

    // Should not throw if the sender is the full DID version of the owner.
    expect(() =>
      Message.ensureOwnerIsSender(
        Message.fromBody(
          submitAttestationBody,
          bobFullDid.uri,
          aliceLightDid.uri
        )
      )
    ).not.toThrow()

    // Should throw if the sender and the owner are two different entities.
    expect(() =>
      Message.ensureOwnerIsSender(
        Message.fromBody(
          submitAttestationBody,
          aliceLightDid.uri,
          bobLightDid.uri
        )
      )
    ).toThrowError(SDKErrors.IdentityMismatchError)

    const submitClaimsForCTypeBody: ISubmitCredential = {
      content: [presentation],
      type: 'submit-credential',
    }

    const submitClaimsForCTypeBodyWithEncodedDetails: ISubmitCredential = {
      content: [contentWithEncodedDetails],
      type: 'submit-credential',
    }

    // Should not throw if the owner and sender DID is the same.
    expect(() =>
      Message.ensureOwnerIsSender(
        Message.fromBody(
          submitClaimsForCTypeBody,
          aliceLightDid.uri,
          bobLightDid.uri
        )
      )
    ).not.toThrow()

    // Should not throw if the owner has no additional details and the sender does.
    expect(() =>
      Message.ensureOwnerIsSender(
        Message.fromBody(
          submitClaimsForCTypeBody,
          aliceLightDidWithDetails.uri,
          bobLightDid.uri
        )
      )
    ).not.toThrow()

    // Should not throw if the owner has additional details and the sender does not.
    expect(() =>
      Message.ensureOwnerIsSender(
        Message.fromBody(
          submitClaimsForCTypeBodyWithEncodedDetails,
          aliceLightDid.uri,
          bobLightDid.uri
        )
      )
    ).not.toThrow()

    // Should not throw if the sender is the full DID version of the owner.
    expect(() =>
      Message.ensureOwnerIsSender(
        Message.fromBody(
          submitClaimsForCTypeBody,
          aliceFullDid.uri,
          bobLightDid.uri
        )
      )
    ).not.toThrow()

    // Should throw if the sender and the owner are two different entities.
    expect(() =>
      Message.ensureOwnerIsSender(
        Message.fromBody(
          submitClaimsForCTypeBody,
          bobLightDid.uri,
          aliceLightDid.uri
        )
      )
    ).toThrowError(SDKErrors.IdentityMismatchError)
  })
})

describe('Error checking / Verification', () => {
  // TODO: Duplicated code, would be nice to have as a seperated test package with similar helpers
  async function buildCredential(
    claimerDid: DidUri,
    attesterDid: DidUri,
    contents: IClaim['contents'],
    legitimations: ICredential[]
  ): Promise<[ICredential, IAttestation]> {
    // create claim

    const testCType = CType.fromProperties('Credential', {
      name: { type: 'string' },
    })

    const claim = Claim.fromCTypeAndClaimContents(
      testCType,
      contents,
      claimerDid
    )
    // build credential with legitimations
    const credential = Credential.fromClaim(claim, {
      legitimations,
    })
    // build attestation
    const testAttestation = Attestation.fromCredentialAndDid(
      credential,
      attesterDid
    )
    return [credential, testAttestation]
  }

  let identityAlice: DidDocument
  let keyAlice: KeyTool

  let identityBob: DidDocument
  let keyBob: KeyTool

  let date: string
  let testCType: ICType
  let testCTypeWithMultipleProperties: ICType
  let claim: IClaim
  let claimContents: IClaim['contents']
  let quoteData: IQuote
  let quoteAttesterSigned: IQuoteAttesterSigned
  let bothSigned: IQuoteAgreement
  let legitimation: ICredential
  let requestTermsBody: IRequestTerms
  let requestTermsContent: PartialClaim
  let submitTermsBody: ISubmitTerms
  let submitTermsContent: ITerms
  let rejectTermsBody: IRejectTerms
  let rejectTermsContent: Pick<
    ITerms,
    'claim' | 'legitimations' | 'delegationId'
  >
  let requestAttestationBody: IRequestAttestation
  let requestAttestationContent: IRequestAttestationContent
  let submitAttestationContent: ISubmitAttestationContent
  let submitAttestationBody: ISubmitAttestation
  let rejectAttestationForClaimBody: IRejectAttestation
  let requestCredentialBody: IRequestCredential
  let requestCredentialContent: IRequestCredentialContent
  let submitCredentialBody: ISubmitCredential
  let submitCredentialContent: ICredentialPresentation[]
  let acceptCredentialBody: IAcceptCredential
  let rejectCredentialBody: IRejectCredential
  let requestAcceptDelegationBody: IRequestAcceptDelegation
  let requestAcceptDelegationContent: IRequestDelegationApproval
  let submitAcceptDelegationBody: ISubmitAcceptDelegation
  let submitAcceptDelegationContent: ISubmitDelegationApproval
  let rejectAcceptDelegationBody: IRejectAcceptDelegation
  let rejectAcceptDelegationContent: IDelegationData
  let informCreateDelegationBody: IInformCreateDelegation
  let informCreateDelegationContent: IInformDelegationCreation
  let messageRequestTerms: IMessage
  let messageSubmitTerms: IMessage
  let messageRejectTerms: IMessage
  let messageRequestAttestationForClaim: IMessage
  let messageSubmitAttestationForClaim: IMessage
  let messageRequestCredential: IMessage
  let messageRejectAttestationForClaim: IMessage
  let messageSubmitCredential: IMessage
  let messageAcceptCredential: IMessage
  let messageRejectCredential: IMessage
  let messageRequestAcceptDelegation: IMessage
  let messageSubmitAcceptDelegation: IMessage
  let messageRejectAcceptDelegation: IMessage
  let messageInformCreateDelegation: IMessage

  beforeAll(async () => {
    keyAlice = makeSigningKeyTool()
    identityAlice = await createLocalDemoFullDidFromKeypair(keyAlice.keypair)
    keyBob = makeSigningKeyTool()
    identityBob = await createLocalDemoFullDidFromKeypair(keyBob.keypair)

    date = new Date(2019, 11, 10).toISOString()
    claimContents = {
      name: 'Bob',
    }

    async function didResolveKey(
      keyUri: DidResourceUri
    ): Promise<ResolvedDidKey> {
      const { did } = Did.parse(keyUri)
      const document = [identityAlice, identityBob].find(
        ({ uri }) => uri === did
      )
      if (!document) throw new Error('Cannot resolve mocked DID')
      return Did.keyToResolvedKey(document.authentication[0], did)
    }

    // CType
    testCType = CType.fromProperties('ClaimCtype', {
      name: { type: 'string' },
    })
    testCTypeWithMultipleProperties = CType.fromProperties(
      'Drivers license Claim',
      {
        name: { type: 'string' },
        id: { type: 'string' },
        age: { type: 'string' },
      }
    )

    // Claim
    claim = Claim.fromCTypeAndClaimContents(
      testCType,
      claimContents,
      identityAlice.uri
    )
    // Legitimation
    ;[legitimation] = await buildCredential(
      identityAlice.uri,
      identityBob.uri,
      {},
      []
    )
    // Quote Data
    quoteData = {
      attesterDid: identityAlice.uri,
      cTypeHash: claim.cTypeHash,
      cost: {
        tax: { vat: 3.3 },
        net: 23.4,
        gross: 23.5,
      },
      currency: 'Euro',
      termsAndConditions: 'https://coolcompany.io/terms.pdf',
      timeframe: date,
    }
    // Quote signed by attester
    quoteAttesterSigned = await Quote.createAttesterSignedQuote(
      quoteData,
      keyAlice.getSignCallback(identityAlice)
    )
    // Quote agreement
    bothSigned = await Quote.createQuoteAgreement(
      quoteAttesterSigned,
      legitimation.rootHash,
      keyBob.getSignCallback(identityBob),
      identityBob.uri,
      { didResolveKey }
    )
    // Request Terms content
    requestTermsContent = {
      cTypeHash: claim.cTypeHash,
    }
    // Submit Terms content
    submitTermsContent = {
      claim: {
        cTypeHash: claim.cTypeHash,
      },
      legitimations: [legitimation],
      delegationId: undefined,
      quote: quoteAttesterSigned,
      cTypes: undefined,
    }
    // Reject terms Content
    rejectTermsContent = {
      claim: {
        cTypeHash: claim.cTypeHash,
      },
      legitimations: [legitimation],
    }

    // Request Attestation Content
    requestAttestationContent = {
      credential: legitimation,
      quote: bothSigned,
    }

    // Submit Attestation content
    submitAttestationContent = {
      attestation: {
        delegationId: null,
        claimHash: requestAttestationContent.credential.rootHash,
        cTypeHash: claim.cTypeHash,
        owner: identityBob.uri,
        revoked: false,
      },
    }

    // Request Credential content
    requestCredentialContent = {
      cTypes: [
        {
          cTypeHash: claim.cTypeHash,
          trustedAttesters: [identityAlice.uri],
          requiredProperties: ['id', 'name'],
        },
      ],
      challenge: '1234',
    }
    // Submit Credential content
    submitCredentialContent = [
      {
        ...legitimation,
        claimerSignature: {
          signature: '0x1234',
          keyUri: `${legitimation.claim.owner}#0x1234`,
        },
      },
    ]
    // Request Accept delegation content
    requestAcceptDelegationContent = {
      delegationData: {
        account: identityAlice.uri,
        id: Crypto.hashStr('0x12345678'),
        parentId: Crypto.hashStr('0x12345678'),
        permissions: [1],
        isPCR: false,
      },
      metaData: {},
      signatures: {
        inviter: Did.signatureToJson(
          await keyAlice.getSignCallback(identityAlice)({
            data: Crypto.coToUInt8('signature'),
            did: identityAlice.uri,
            keyRelationship: 'authentication',
          })
        ),
      },
    }
    // Submit Accept delegation content
    submitAcceptDelegationContent = {
      delegationData: {
        account: identityAlice.uri,
        id: Crypto.hashStr('0x12345678'),
        parentId: Crypto.hashStr('0x12345678'),
        permissions: [1],
        isPCR: false,
      },
      signatures: {
        inviter: Did.signatureToJson(
          await keyAlice.getSignCallback(identityAlice)({
            data: Crypto.coToUInt8('signature'),
            did: identityAlice.uri,
            keyRelationship: 'authentication',
          })
        ),
        invitee: Did.signatureToJson(
          await keyBob.getSignCallback(identityBob)({
            data: Crypto.coToUInt8('signature'),
            did: identityBob.uri,
            keyRelationship: 'authentication',
          })
        ),
      },
    }
    // Reject Accept Delegation content
    rejectAcceptDelegationContent = {
      account: identityAlice.uri,
      id: Crypto.hashStr('0x12345678'),
      parentId: Crypto.hashStr('0x12345678'),
      permissions: [1],
      isPCR: false,
    }

    informCreateDelegationContent = {
      delegationId: Crypto.hashStr('0x12345678'),
      isPCR: false,
    }

    requestTermsBody = {
      content: requestTermsContent,
      type: 'request-terms',
    }

    submitTermsBody = {
      content: submitTermsContent,
      type: 'submit-terms',
    }

    rejectTermsBody = {
      content: rejectTermsContent,
      type: 'reject-terms',
    }

    requestAttestationBody = {
      content: requestAttestationContent,
      type: 'request-attestation',
    }

    submitAttestationBody = {
      content: submitAttestationContent,
      type: 'submit-attestation',
    }

    rejectAttestationForClaimBody = {
      content: requestAttestationContent.credential.rootHash,
      type: 'reject-attestation',
    }
    requestCredentialBody = {
      content: requestCredentialContent,
      type: 'request-credential',
    }

    submitCredentialBody = {
      content: submitCredentialContent,
      type: 'submit-credential',
    }

    acceptCredentialBody = {
      content: [claim.cTypeHash],
      type: 'accept-credential',
    }

    rejectCredentialBody = {
      content: [claim.cTypeHash],
      type: 'reject-credential',
    }

    requestAcceptDelegationBody = {
      content: requestAcceptDelegationContent,
      type: 'request-accept-delegation',
    }

    submitAcceptDelegationBody = {
      content: submitAcceptDelegationContent,
      type: 'submit-accept-delegation',
    }

    rejectAcceptDelegationBody = {
      content: rejectAcceptDelegationContent,
      type: 'reject-accept-delegation',
    }

    informCreateDelegationBody = {
      content: informCreateDelegationContent,
      type: 'inform-create-delegation',
    }
  })

  it('Checking required properties for given CType', () => {
    expect(() =>
      Message.verifyRequiredCTypeProperties(['id', 'name'], testCType)
    ).toThrowError(SDKErrors.CTypeUnknownPropertiesError)

    expect(() =>
      Message.verifyRequiredCTypeProperties(
        ['id', 'name'],
        testCTypeWithMultipleProperties
      )
    ).not.toThrowError(SDKErrors.CTypeUnknownPropertiesError)

    expect(() =>
      Message.verifyRequiredCTypeProperties(
        ['id', 'name'],
        testCTypeWithMultipleProperties
      )
    ).not.toThrowError()
  })

  beforeAll(async () => {
    messageRequestTerms = Message.fromBody(
      requestTermsBody,
      identityAlice.uri,
      identityBob.uri
    )
    messageSubmitTerms = Message.fromBody(
      submitTermsBody,
      identityAlice.uri,
      identityBob.uri
    )
    messageRejectTerms = Message.fromBody(
      rejectTermsBody,
      identityAlice.uri,
      identityBob.uri
    )
    messageRequestAttestationForClaim = Message.fromBody(
      requestAttestationBody,
      identityAlice.uri,
      identityBob.uri
    )
    messageSubmitAttestationForClaim = Message.fromBody(
      submitAttestationBody,
      identityAlice.uri,
      identityBob.uri
    )

    messageRejectAttestationForClaim = Message.fromBody(
      rejectAttestationForClaimBody,
      identityAlice.uri,
      identityBob.uri
    )
    messageRequestCredential = Message.fromBody(
      requestCredentialBody,
      identityAlice.uri,
      identityBob.uri
    )
    messageSubmitCredential = Message.fromBody(
      submitCredentialBody,
      identityAlice.uri,
      identityBob.uri
    )
    messageAcceptCredential = Message.fromBody(
      acceptCredentialBody,
      identityAlice.uri,
      identityBob.uri
    )
    messageRejectCredential = Message.fromBody(
      rejectCredentialBody,
      identityAlice.uri,
      identityBob.uri
    )
    messageRequestAcceptDelegation = Message.fromBody(
      requestAcceptDelegationBody,
      identityAlice.uri,
      identityBob.uri
    )
    messageSubmitAcceptDelegation = Message.fromBody(
      submitAcceptDelegationBody,
      identityAlice.uri,
      identityBob.uri
    )
    messageRejectAcceptDelegation = Message.fromBody(
      rejectAcceptDelegationBody,
      identityAlice.uri,
      identityBob.uri
    )
    messageInformCreateDelegation = Message.fromBody(
      informCreateDelegationBody,
      identityAlice.uri,
      identityBob.uri
    )
  })
  it('message body verifier should not throw errors on correct bodies', () => {
    expect(() => Message.verifyMessageBody(requestTermsBody)).not.toThrowError()
    expect(() => Message.verifyMessageBody(submitTermsBody)).not.toThrowError()
    expect(() => Message.verifyMessageBody(rejectTermsBody)).not.toThrowError()
    expect(() =>
      Message.verifyMessageBody(requestAttestationBody)
    ).not.toThrowError()
    expect(() =>
      Message.verifyMessageBody(submitAttestationBody)
    ).not.toThrowError()
    expect(() =>
      Message.verifyMessageBody(rejectAttestationForClaimBody)
    ).not.toThrowError()
    expect(() =>
      Message.verifyMessageBody(requestCredentialBody)
    ).not.toThrowError()
    expect(() =>
      Message.verifyMessageBody(submitCredentialBody)
    ).not.toThrowError()
    expect(() =>
      Message.verifyMessageBody(acceptCredentialBody)
    ).not.toThrowError()
    expect(() =>
      Message.verifyMessageBody(rejectCredentialBody)
    ).not.toThrowError()
    expect(() =>
      Message.verifyMessageBody(requestAcceptDelegationBody)
    ).not.toThrowError()
    expect(() =>
      Message.verifyMessageBody(submitAcceptDelegationBody)
    ).not.toThrowError()
    expect(() =>
      Message.verifyMessageBody(rejectAcceptDelegationBody)
    ).not.toThrowError()
    expect(() =>
      Message.verifyMessageBody(informCreateDelegationBody)
    ).not.toThrowError()
  })
  it('message envelope verifier should not throw errors on correct envelopes', () => {
    expect(() =>
      Message.verifyMessageEnvelope(messageRequestTerms)
    ).not.toThrowError()
    expect(() =>
      Message.verifyMessageEnvelope(messageSubmitTerms)
    ).not.toThrowError()
    expect(() =>
      Message.verifyMessageEnvelope(messageRejectTerms)
    ).not.toThrowError()
    expect(() =>
      Message.verifyMessageEnvelope(messageRequestAttestationForClaim)
    ).not.toThrowError()
    expect(() =>
      Message.verifyMessageEnvelope(messageSubmitAttestationForClaim)
    ).not.toThrowError()
    expect(() =>
      Message.verifyMessageEnvelope(messageRejectAttestationForClaim)
    ).not.toThrowError()
    expect(() =>
      Message.verifyMessageEnvelope(messageRequestCredential)
    ).not.toThrowError()
    expect(() =>
      Message.verifyMessageEnvelope(messageSubmitCredential)
    ).not.toThrowError()
    expect(() =>
      Message.verifyMessageEnvelope(messageAcceptCredential)
    ).not.toThrowError()
    expect(() =>
      Message.verifyMessageEnvelope(messageRejectCredential)
    ).not.toThrowError()
    expect(() =>
      Message.verifyMessageEnvelope(messageRequestAcceptDelegation)
    ).not.toThrowError()
    expect(() =>
      Message.verifyMessageEnvelope(messageSubmitAcceptDelegation)
    ).not.toThrowError()
    expect(() =>
      Message.verifyMessageEnvelope(messageRejectAcceptDelegation)
    ).not.toThrowError()
    expect(() =>
      Message.verifyMessageEnvelope(messageInformCreateDelegation)
    ).not.toThrowError()
  })
  it('message envelope verifier should throw errors on faulty envelopes', () => {
    messageRequestTerms.receiver =
      'did:kilt:thisisnotareceiveraddress' as DidUri
    expect(() =>
      Message.verifyMessageEnvelope(messageRequestTerms)
    ).toThrowError(SDKErrors.InvalidDidFormatError)
    // @ts-expect-error
    messageSubmitTerms.sender = 'this is not a sender did'
    expect(() =>
      Message.verifyMessageEnvelope(messageSubmitTerms)
    ).toThrowError(SDKErrors.InvalidDidFormatError)
    // @ts-expect-error
    messageRejectTerms.sender = 'this is not a sender address'
    expect(() =>
      Message.verifyMessageEnvelope(messageRejectTerms)
    ).toThrowError(SDKErrors.InvalidDidFormatError)
    // @ts-expect-error
    messageRequestAttestationForClaim.messageId = 12
    expect(() =>
      Message.verifyMessageEnvelope(messageRequestAttestationForClaim)
    ).toThrowError(TypeError)
    // @ts-expect-error
    messageSubmitAttestationForClaim.createdAt = '123456'
    expect(() =>
      Message.verifyMessageEnvelope(messageSubmitAttestationForClaim)
    ).toThrowError(TypeError)
    // @ts-expect-error
    messageRejectAttestationForClaim.receivedAt = '123456'
    expect(() =>
      Message.verifyMessageEnvelope(messageRejectAttestationForClaim)
    ).toThrowError(TypeError)
    // @ts-expect-error
    messageRequestCredential.inReplyTo = 123
    expect(() =>
      Message.verifyMessageEnvelope(messageRequestCredential)
    ).toThrowError(TypeError)
  })
  it('message body verifier should throw errors on faulty bodies', () => {
    // @ts-expect-error
    requestTermsBody.content.cTypeHash = 'this is not a ctype hash'
    expect(() => Message.verifyMessageBody(requestTermsBody)).toThrowError(
      SDKErrors.HashMalformedError
    )
    submitTermsBody.content.delegationId = 'this is not a delegation id'
    expect(() => Message.verifyMessageBody(submitTermsBody)).toThrowError(
      SDKErrors.HashMalformedError
    )

    rejectTermsBody.content.delegationId = 'this is not a delegation id'
    expect(() => Message.verifyMessageBody(rejectTermsBody)).toThrowError(
      SDKErrors.HashMalformedError
    )
    // @ts-expect-error
    delete rejectTermsBody.content.claim.cTypeHash
    expect(() => Message.verifyMessageBody(rejectTermsBody)).toThrowError(
      SDKErrors.CTypeHashMissingError
    )
    submitCredentialBody.content[0].claimerSignature = {
      signature: 'this is not the claimers signature',
      // @ts-expect-error
      keyUri: 'this is not a key id',
    }
    expect(() => Message.verifyMessageBody(submitCredentialBody)).toThrowError()
    // @ts-expect-error
    submitAttestationBody.content.attestation.claimHash =
      'this is not the claim hash'
    expect(() => Message.verifyMessageBody(submitAttestationBody)).toThrowError(
      SDKErrors.HashMalformedError
    )
    // @ts-expect-error
    rejectAttestationForClaimBody.content = 'this is not the root hash'
    expect(() =>
      Message.verifyMessageBody(rejectAttestationForClaimBody)
    ).toThrowError(SDKErrors.HashMalformedError)
    // @ts-expect-error
    requestCredentialBody.content.cTypes[0].cTypeHash =
      'this is not a cTypeHash'
    expect(() => Message.verifyMessageBody(requestCredentialBody)).toThrowError(
      SDKErrors.HashMalformedError
    )
    // @ts-expect-error
    acceptCredentialBody.content[0] = 'this is not a cTypeHash'
    expect(() => Message.verifyMessageBody(acceptCredentialBody)).toThrowError(
      SDKErrors.HashMalformedError
    )
    // @ts-expect-error
    rejectCredentialBody.content[0] = 'this is not a cTypeHash'
    expect(() => Message.verifyMessageBody(rejectCredentialBody)).toThrowError(
      SDKErrors.HashMalformedError
    )
    delete requestAcceptDelegationBody.content.metaData
    expect(() =>
      Message.verifyMessageBody(requestAcceptDelegationBody)
    ).toThrowError(SDKErrors.ObjectUnverifiableError)
    requestAcceptDelegationBody.content.signatures.inviter.signature =
      'this is not a signature'
    expect(() =>
      Message.verifyMessageBody(requestAcceptDelegationBody)
    ).toThrowError(SDKErrors.SignatureMalformedError)
    // @ts-expect-error
    submitAcceptDelegationBody.content.signatures.invitee.keyUri =
      'this is not a key id'
    expect(() =>
      Message.verifyMessageBody(submitAcceptDelegationBody)
    ).toThrowError(SDKErrors.SignatureMalformedError)
    submitAcceptDelegationBody.content.delegationData.parentId =
      'this is not a parent id hash'
    expect(() =>
      Message.verifyMessageBody(submitAcceptDelegationBody)
    ).toThrowError(SDKErrors.DelegationIdTypeError)
    // @ts-expect-error
    delete rejectAcceptDelegationBody.content.account
    expect(() =>
      Message.verifyMessageBody(rejectAcceptDelegationBody)
    ).toThrowError(SDKErrors.OwnerMissingError)
    informCreateDelegationBody.content.delegationId =
      'this is not a delegation id'
    expect(() =>
      Message.verifyMessageBody(informCreateDelegationBody)
    ).toThrowError(SDKErrors.HashMalformedError)
    expect(() => Message.verifyMessageBody({} as MessageBody)).toThrowError(
      SDKErrors.UnknownMessageBodyTypeError
    )
  })
  it('delegation data structure verifier should throw on faulty delegation data', () => {
    // @ts-expect-error
    delete requestAcceptDelegationBody.content.delegationData.isPCR
    expect(() =>
      Message.verifyDelegationStructure(
        requestAcceptDelegationBody.content.delegationData
      )
    ).toThrowError(TypeError('isPCR is expected to be a boolean'))
    requestAcceptDelegationBody.content.delegationData.id =
      'this is not a delegation id'
    expect(() =>
      Message.verifyDelegationStructure(
        requestAcceptDelegationBody.content.delegationData
      )
    ).toThrowError(SDKErrors.DelegationIdTypeError)
    submitAcceptDelegationBody.content.delegationData.permissions = []
    expect(() =>
      Message.verifyDelegationStructure(
        submitAcceptDelegationBody.content.delegationData
      )
    ).toThrowError(SDKErrors.UnauthorizedError)
    // @ts-expect-error
    delete submitAcceptDelegationBody.content.delegationData.id
    expect(() =>
      Message.verifyDelegationStructure(
        submitAcceptDelegationBody.content.delegationData
      )
    ).toThrowError(SDKErrors.DelegationIdMissingError)
  })
})
