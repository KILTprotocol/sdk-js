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
  DidResolvedDetails,
  DidUri,
  IAcceptCredential,
  IAttestation,
  IClaim,
  ICType,
  IDelegationData,
  IInformCreateDelegation,
  IInformDelegationCreation,
  IMessage,
  IQuote,
  IQuoteAgreement,
  IQuoteAttesterSigned,
  IRejectAcceptDelegation,
  IRejectAttestation,
  IRejectCredential,
  IRejectTerms,
  IRequestAcceptDelegation,
  IRequestAttestation,
  IRequestAttestationContent,
  IRequestCredential,
  IRequestCredentialContent,
  IRequestDelegationApproval,
  ICredential,
  IRequestTerms,
  ISubmitAcceptDelegation,
  ISubmitAttestation,
  ISubmitAttestationContent,
  ISubmitCredential,
  ISubmitDelegationApproval,
  ISubmitTerms,
  ITerms,
  MessageBody,
  PartialClaim,
} from '@kiltprotocol/types'
import { Crypto, SDKErrors } from '@kiltprotocol/utils'
import {
  Attestation,
  Claim,
  Credential,
  CType,
  Quote,
} from '@kiltprotocol/core'
import * as Did from '@kiltprotocol/did'
import {
  createLocalDemoFullDidFromKeypair,
  KeyTool,
  makeSigningKeyTool,
} from '@kiltprotocol/testing'

import * as Message from './Message'

// TODO: Duplicated code, would be nice to have as a seperated test package with similar helpers
async function buildCredential(
  claimerDid: DidUri,
  attesterDid: DidUri,
  contents: IClaim['contents'],
  legitimations: ICredential[]
): Promise<[ICredential, IAttestation]> {
  // create claim

  const rawCType: ICType['schema'] = {
    $id: Crypto.hashStr('kilt:ctype:0x1'),
    $schema: 'http://kilt-protocol.org/draft-01/ctype#',
    title: 'Credential',
    properties: {
      name: { type: 'string' },
    },
    type: 'object',
  }

  const testCType = CType.fromSchema(rawCType)

  const claim = Claim.fromCTypeAndClaimContents(testCType, contents, claimerDid)
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

describe('Messaging Utilities', () => {
  let identityAlice: DidDetails
  let keyAlice: KeyTool

  let identityBob: DidDetails
  let keyBob: KeyTool

  let date: string
  let rawCType: ICType['schema']
  let rawCTypeWithMultipleProperties: ICType['schema']
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
  let submitCredentialContent: ICredential[]
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

    async function didResolve(
      didUri: DidUri
    ): Promise<DidResolvedDetails | null> {
      if (didUri === identityAlice.uri) {
        return {
          metadata: {
            deactivated: false,
          },
          details: identityAlice,
        }
      }
      if (didUri === identityBob.uri) {
        return {
          metadata: {
            deactivated: false,
          },
          details: identityBob,
        }
      }
      return null
    }

    rawCTypeWithMultipleProperties = {
      $id: Crypto.hashStr('kilt:ctype:0x2'),
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
      title: 'Drivers license Claim',
      properties: {
        name: { type: 'string' },
        id: { type: 'string' },
        age: { type: 'string' },
      },
      type: 'object',
    }
    // CType Schema
    rawCType = {
      $id: Crypto.hashStr('kilt:ctype:0x1'),
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
      title: 'ClaimCtype',
      properties: {
        name: { type: 'string' },
      },
      type: 'object',
    }
    // CType
    testCType = CType.fromSchema(rawCType, identityAlice.uri)
    testCTypeWithMultipleProperties = CType.fromSchema(
      rawCTypeWithMultipleProperties,
      identityAlice.uri
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
      identityAlice,
      keyAlice.sign
    )
    // Quote agreement
    bothSigned = await Quote.createQuoteAgreement(
      quoteAttesterSigned,
      legitimation.rootHash,
      identityAlice.uri,
      identityBob,
      keyBob.sign,
      { didResolve }
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
    submitCredentialContent = [legitimation]
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
        inviter: await Did.signPayload(
          identityAlice,
          'signature',
          keyAlice.sign,
          identityAlice.authentication[0].id
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
        inviter: await Did.signPayload(
          identityAlice,
          'signature',
          keyAlice.sign,
          identityAlice.authentication[0].id
        ),
        invitee: await Did.signPayload(
          identityBob,
          'signature',
          keyBob.sign,
          identityBob.authentication[0].id
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
  it('error check should not throw errors on faulty bodies', () => {
    expect(() =>
      Message.errorCheckMessageBody(requestTermsBody)
    ).not.toThrowError()
    expect(() =>
      Message.errorCheckMessageBody(submitTermsBody)
    ).not.toThrowError()
    expect(() =>
      Message.errorCheckMessageBody(rejectTermsBody)
    ).not.toThrowError()
    expect(() =>
      Message.errorCheckMessageBody(requestAttestationBody)
    ).not.toThrowError()
    expect(() =>
      Message.errorCheckMessageBody(submitAttestationBody)
    ).not.toThrowError()
    expect(() =>
      Message.errorCheckMessageBody(rejectAttestationForClaimBody)
    ).not.toThrowError()
    expect(() =>
      Message.errorCheckMessageBody(requestCredentialBody)
    ).not.toThrowError()
    expect(() =>
      Message.errorCheckMessageBody(submitCredentialBody)
    ).not.toThrowError()
    expect(() =>
      Message.errorCheckMessageBody(acceptCredentialBody)
    ).not.toThrowError()
    expect(() =>
      Message.errorCheckMessageBody(rejectCredentialBody)
    ).not.toThrowError()
    expect(() =>
      Message.errorCheckMessageBody(requestAcceptDelegationBody)
    ).not.toThrowError()
    expect(() =>
      Message.errorCheckMessageBody(submitAcceptDelegationBody)
    ).not.toThrowError()
    expect(() =>
      Message.errorCheckMessageBody(rejectAcceptDelegationBody)
    ).not.toThrowError()
    expect(() =>
      Message.errorCheckMessageBody(informCreateDelegationBody)
    ).not.toThrowError()
  })
  it('error check should not throw errors on message', () => {
    expect(() =>
      Message.errorCheckMessage(messageRequestTerms)
    ).not.toThrowError()
    expect(() =>
      Message.errorCheckMessage(messageSubmitTerms)
    ).not.toThrowError()
    expect(() =>
      Message.errorCheckMessage(messageRejectTerms)
    ).not.toThrowError()
    expect(() =>
      Message.errorCheckMessage(messageRequestAttestationForClaim)
    ).not.toThrowError()
    expect(() =>
      Message.errorCheckMessage(messageSubmitAttestationForClaim)
    ).not.toThrowError()
    expect(() =>
      Message.errorCheckMessage(messageRejectAttestationForClaim)
    ).not.toThrowError()
    expect(() =>
      Message.errorCheckMessage(messageRequestCredential)
    ).not.toThrowError()
    expect(() =>
      Message.errorCheckMessage(messageSubmitCredential)
    ).not.toThrowError()
    expect(() =>
      Message.errorCheckMessage(messageAcceptCredential)
    ).not.toThrowError()
    expect(() =>
      Message.errorCheckMessage(messageRejectCredential)
    ).not.toThrowError()
    expect(() =>
      Message.errorCheckMessage(messageRequestAcceptDelegation)
    ).not.toThrowError()
    expect(() =>
      Message.errorCheckMessage(messageSubmitAcceptDelegation)
    ).not.toThrowError()
    expect(() =>
      Message.errorCheckMessage(messageRejectAcceptDelegation)
    ).not.toThrowError()
    expect(() =>
      Message.errorCheckMessage(messageInformCreateDelegation)
    ).not.toThrowError()
  })
  it('error check should throw errors on message', () => {
    messageRequestTerms.receiver =
      'did:kilt:thisisnotareceiveraddress' as DidUri
    expect(() => Message.errorCheckMessage(messageRequestTerms)).toThrowError(
      SDKErrors.InvalidDidFormatError
    )
    // @ts-ignore
    messageSubmitTerms.sender = 'this is not a sender did'
    expect(() => Message.errorCheckMessage(messageSubmitTerms)).toThrowError(
      SDKErrors.InvalidDidFormatError
    )
    // @ts-ignore
    messageRejectTerms.sender = 'this is not a sender address'
    expect(() => Message.errorCheckMessage(messageRejectTerms)).toThrowError(
      SDKErrors.InvalidDidFormatError
    )
  })
  it('error check should throw errors on faulty bodies', () => {
    // @ts-ignore
    requestTermsBody.content.cTypeHash = 'this is not a ctype hash'
    expect(() => Message.errorCheckMessageBody(requestTermsBody)).toThrowError(
      SDKErrors.HashMalformedError
    )
    submitTermsBody.content.delegationId = 'this is not a delegation id'
    expect(() => Message.errorCheckMessageBody(submitTermsBody)).toThrowError(
      SDKErrors.HashMalformedError
    )

    rejectTermsBody.content.delegationId = 'this is not a delegation id'
    expect(() => Message.errorCheckMessageBody(rejectTermsBody)).toThrowError(
      SDKErrors.HashMalformedError
    )
    // @ts-expect-error
    delete rejectTermsBody.content.claim.cTypeHash
    expect(() => Message.errorCheckMessageBody(rejectTermsBody)).toThrowError(
      SDKErrors.CTypeHashMissingError
    )
    requestAttestationBody.content.credential.claimerSignature = {
      signature: 'this is not the claimers signature',
      // @ts-ignore
      keyUri: 'this is not a key id',
    }
    expect(() =>
      Message.errorCheckMessageBody(requestAttestationBody)
    ).toThrowError()
    // @ts-ignore
    submitAttestationBody.content.attestation.claimHash =
      'this is not the claim hash'
    expect(() =>
      Message.errorCheckMessageBody(submitAttestationBody)
    ).toThrowError(SDKErrors.HashMalformedError)
    // @ts-ignore
    rejectAttestationForClaimBody.content = 'this is not the root hash'
    expect(() =>
      Message.errorCheckMessageBody(rejectAttestationForClaimBody)
    ).toThrowError(SDKErrors.HashMalformedError)
    // @ts-ignore
    requestCredentialBody.content.cTypes[0].cTypeHash =
      'this is not a cTypeHash'
    expect(() =>
      Message.errorCheckMessageBody(requestCredentialBody)
    ).toThrowError(SDKErrors.HashMalformedError)
    // @ts-ignore
    acceptCredentialBody.content[0] = 'this is not a cTypeHash'
    expect(() =>
      Message.errorCheckMessageBody(acceptCredentialBody)
    ).toThrowError(SDKErrors.HashMalformedError)
    // @ts-ignore
    rejectCredentialBody.content[0] = 'this is not a cTypeHash'
    expect(() =>
      Message.errorCheckMessageBody(rejectCredentialBody)
    ).toThrowError(SDKErrors.HashMalformedError)
    delete requestAcceptDelegationBody.content.metaData
    expect(() =>
      Message.errorCheckMessageBody(requestAcceptDelegationBody)
    ).toThrowError(SDKErrors.ObjectUnverifiableError)
    requestAcceptDelegationBody.content.signatures.inviter.signature =
      'this is not a signature'
    expect(() =>
      Message.errorCheckMessageBody(requestAcceptDelegationBody)
    ).toThrowError(SDKErrors.SignatureMalformedError)
    // @ts-ignore
    submitAcceptDelegationBody.content.signatures.invitee.keyUri =
      'this is not a key id'
    expect(() =>
      Message.errorCheckMessageBody(submitAcceptDelegationBody)
    ).toThrowError(SDKErrors.SignatureMalformedError)
    submitAcceptDelegationBody.content.delegationData.parentId =
      'this is not a parent id hash'
    expect(() =>
      Message.errorCheckMessageBody(submitAcceptDelegationBody)
    ).toThrowError(SDKErrors.DelegationIdTypeError)
    // @ts-expect-error
    delete rejectAcceptDelegationBody.content.account
    expect(() =>
      Message.errorCheckMessageBody(rejectAcceptDelegationBody)
    ).toThrowError(SDKErrors.OwnerMissingError)
    informCreateDelegationBody.content.delegationId =
      'this is not a delegation id'
    expect(() =>
      Message.errorCheckMessageBody(informCreateDelegationBody)
    ).toThrowError(SDKErrors.HashMalformedError)
    expect(() => Message.errorCheckMessageBody({} as MessageBody)).toThrowError(
      SDKErrors.UnknownMessageBodyTypeError
    )
  })
  it('error check of the delegation data in messaging', () => {
    // @ts-expect-error
    delete requestAcceptDelegationBody.content.delegationData.isPCR
    expect(() =>
      Message.errorCheckDelegationData(
        requestAcceptDelegationBody.content.delegationData
      )
    ).toThrowError(TypeError('isPCR is expected to be a boolean'))
    requestAcceptDelegationBody.content.delegationData.id =
      'this is not a delegation id'
    expect(() =>
      Message.errorCheckDelegationData(
        requestAcceptDelegationBody.content.delegationData
      )
    ).toThrowError(SDKErrors.DelegationIdTypeError)
    submitAcceptDelegationBody.content.delegationData.permissions = []
    expect(() =>
      Message.errorCheckDelegationData(
        submitAcceptDelegationBody.content.delegationData
      )
    ).toThrowError(SDKErrors.UnauthorizedError)
    // @ts-expect-error
    delete submitAcceptDelegationBody.content.delegationData.id
    expect(() =>
      Message.errorCheckDelegationData(
        submitAcceptDelegationBody.content.delegationData
      )
    ).toThrowError(SDKErrors.DelegationIdMissingError)
  })
})
