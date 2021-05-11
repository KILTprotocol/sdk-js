/**
 * @group unit/messaging
 */

import type {
  CompressedQuoteAttesterSigned,
  CompressedQuoteAgreed,
  ICType,
  IClaim,
  IQuote,
  IQuoteAttesterSigned,
  IQuoteAgreement,
  IRequestTerms,
  ISubmitTerms,
  ITerms,
  IRejectTerms,
  IRequestAttestationForClaim,
  ISubmitAttestationForClaim,
  IRequestClaimsForCTypes,
  IAttestedClaim,
  IRequestAcceptDelegation,
  ISubmitAcceptDelegation,
  IRejectAcceptDelegation,
  IInformCreateDelegation,
  MessageBody,
  CompressedRequestTerms,
  CompressedPartialClaim,
  CompressedSubmitTerms,
  CompressedTerms,
  CompressedRejectTerms,
  CompressedRejectedTerms,
  IRequestAttestationForClaimContent,
  CompressedRequestAttestationForClaim,
  CompressedRequestAttestationForClaimContent,
  ISubmitAttestationForClaimContent,
  CompressedSubmitAttestationForClaim,
  IRequestClaimsForCTypesContent,
  CompressedRequestClaimsForCTypes,
  IRequestDelegationApproval,
  CompressedRequestAcceptDelegation,
  CompressedRequestDelegationApproval,
  ISubmitDelegationApproval,
  CompressedSubmitAcceptDelegation,
  CompressedSubmitDelegationApproval,
  IDelegationData,
  CompressedRejectAcceptDelegation,
  CompressedDelegationData,
  IInformDelegationCreation,
  CompressedInformCreateDelegation,
  CompressedInformDelegationCreation,
  CompressedMessageBody,
  CompressedAttestedClaim,
  CompressedSubmitClaimsForCTypes,
  ISubmitClaimsForCTypes,
  CompressedAttestation,
  PartialClaim,
  CompressedRequestClaimsForCTypesContent,
  IMessage,
  IRejectAttestationForClaim,
  IAcceptClaimsForCTypes,
  IRejectClaimsForCTypes,
} from '@kiltprotocol/types'
import { SDKErrors, Crypto } from '@kiltprotocol/utils'
import {
  Attestation,
  AttestedClaim,
  Claim,
  CType,
  Identity,
  Quote,
  RequestForAttestation,
} from '@kiltprotocol/core'

import * as MessageUtils from './Message.utils'

import Message from './Message'

// TODO: Duplicated code, would be nice to have as a seperated test package with similar helpers
async function buildAttestedClaim(
  claimer: Identity,
  attester: Identity,
  contents: IClaim['contents'],
  legitimations: AttestedClaim[]
): Promise<AttestedClaim> {
  // create claim
  const identityAlice = Identity.buildFromURI('//Alice')

  const rawCType: ICType['schema'] = {
    $id: Crypto.hashStr('kilt:ctype:0x1'),
    $schema: 'http://kilt-protocol.org/draft-01/ctype#',
    title: 'Attested Claim',
    properties: {
      name: { type: 'string' },
    },
    type: 'object',
  }

  const testCType: CType = CType.fromSchema(
    rawCType,
    identityAlice.signKeyringPair.address
  )

  const claim = Claim.fromCTypeAndClaimContents(
    testCType,
    contents,
    claimer.address
  )
  // build request for attestation with legitimations
  const requestForAttestation = RequestForAttestation.fromClaimAndIdentity(
    claim,
    claimer,
    {
      legitimations,
    }
  )
  // build attestation
  const testAttestation = Attestation.fromRequestAndPublicIdentity(
    requestForAttestation,
    attester.getPublicIdentity()
  )
  // combine to attested claim
  const attestedClaim = AttestedClaim.fromRequestAndAttestation(
    requestForAttestation,
    testAttestation
  )
  return attestedClaim
}

describe('Messaging Utilities', () => {
  let identityAlice: Identity
  let identityBob: Identity
  let date: Date
  let rawCType: ICType['schema']
  let rawCTypeWithMultipleProperties: ICType['schema']
  let testCType: CType
  let testCTypeWithMultipleProperties: CType
  let claim: Claim
  let claimContents: IClaim['contents']
  let quoteData: IQuote
  let quoteAttesterSigned: IQuoteAttesterSigned
  let bothSigned: IQuoteAgreement
  let compressedLegitimation: CompressedAttestedClaim
  let compressedResultAttesterSignedQuote: CompressedQuoteAttesterSigned
  let legitimation: AttestedClaim
  let compressedQuoteAgreement: CompressedQuoteAgreed
  let requestTermsBody: IRequestTerms
  let requestTermsContent: PartialClaim
  let compressedRequestTermsBody: CompressedRequestTerms
  let compressedRequestTermsContent: CompressedPartialClaim
  let submitTermsBody: ISubmitTerms
  let submitTermsContent: ITerms
  let compressedSubmitTermsBody: CompressedSubmitTerms
  let compressedSubmitTermsContent: CompressedTerms
  let rejectTermsBody: IRejectTerms
  let rejectTermsContent: Pick<
    ITerms,
    'claim' | 'legitimations' | 'delegationId'
  >
  let compressedRejectTermsBody: CompressedRejectTerms
  let compressedRejectTermsContent: CompressedRejectedTerms
  let requestAttestationBody: IRequestAttestationForClaim
  let requestAttestationContent: IRequestAttestationForClaimContent
  let compressedRequestAttestationBody: CompressedRequestAttestationForClaim
  let compressedRequestAttestationContent: CompressedRequestAttestationForClaimContent
  let submitAttestationContent: ISubmitAttestationForClaimContent
  let submitAttestationBody: ISubmitAttestationForClaim
  let compressedSubmitAttestationContent: CompressedAttestation
  let compressedSubmitAttestationBody: CompressedSubmitAttestationForClaim
  let rejectAttestationForClaimBody: IRejectAttestationForClaim
  let requestClaimsForCTypesBody: IRequestClaimsForCTypes
  let requestClaimsForCTypesContent: IRequestClaimsForCTypesContent
  let compressedRequestClaimsForCTypesBody: CompressedRequestClaimsForCTypes
  let compressedRequestClaimsForCTypesContent: CompressedRequestClaimsForCTypesContent
  let submitClaimsForCTypesBody: ISubmitClaimsForCTypes
  let submitClaimsForCTypesContent: IAttestedClaim[]
  let acceptClaimsForCTypesBody: IAcceptClaimsForCTypes
  let compressedSubmitClaimsForCTypesBody: CompressedSubmitClaimsForCTypes
  let compressedSubmitClaimsForCTypesContent: CompressedAttestedClaim[]
  let rejectClaimsForCTypesBody: IRejectClaimsForCTypes
  let requestAcceptDelegationBody: IRequestAcceptDelegation
  let requestAcceptDelegationContent: IRequestDelegationApproval
  let compressedRequestAcceptDelegationBody: CompressedRequestAcceptDelegation
  let compressedRequestAcceptDelegationContent: CompressedRequestDelegationApproval
  let submitAcceptDelegationBody: ISubmitAcceptDelegation
  let submitAcceptDelegationContent: ISubmitDelegationApproval
  let compressedSubmitAcceptDelegationBody: CompressedSubmitAcceptDelegation
  let compressedSubmitAcceptDelegationContent: CompressedSubmitDelegationApproval
  let rejectAcceptDelegationBody: IRejectAcceptDelegation
  let rejectAcceptDelegationContent: IDelegationData
  let compressedRejectAcceptDelegationBody: CompressedRejectAcceptDelegation
  let compressedRejectAcceptDelegationContent: CompressedDelegationData
  let informCreateDelegationBody: IInformCreateDelegation
  let informCreateDelegationContent: IInformDelegationCreation
  let compressedInformCreateDelegationBody: CompressedInformCreateDelegation
  let compressedInformCreateDelegationContent: CompressedInformDelegationCreation
  let messageRequestTerms: IMessage
  let messageSubmitTerms: IMessage
  let messageRejectTerms: IMessage
  let messageRequestAttestationForClaim: IMessage
  let messageSubmitAttestationForClaim: IMessage
  let messageRequestClaimsForCTypes: IMessage
  let messageRejectAttestationForClaim: IMessage
  let messageSubmitClaimsForCTypes: IMessage
  let messageAcceptClaimsForCTypes: IMessage
  let messageRejectClaimsForCTypes: IMessage
  let messageRequestAcceptDelegation: IMessage
  let messageSubmitAcceptDelegation: IMessage
  let messageRejectAcceptDelegation: IMessage
  let messageInformCreateDelegation: IMessage

  beforeAll(async () => {
    identityAlice = Identity.buildFromURI('//Alice')
    identityBob = Identity.buildFromURI('//Bob')
    date = new Date(2019, 11, 10)
    claimContents = {
      name: 'Bob',
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
    testCType = CType.fromSchema(rawCType, identityAlice.address)
    testCTypeWithMultipleProperties = CType.fromSchema(
      rawCTypeWithMultipleProperties,
      identityAlice.address
    )

    // Claim
    claim = Claim.fromCTypeAndClaimContents(
      testCType,
      claimContents,
      identityAlice.address
    )
    // Legitimation
    legitimation = await buildAttestedClaim(identityAlice, identityBob, {}, [])
    // Compressed Legitimation
    compressedLegitimation = [
      [
        [
          legitimation.request.claim.cTypeHash,
          legitimation.request.claim.owner,
          legitimation.request.claim.contents,
        ],
        legitimation.request.claimNonceMap,
        legitimation.request.claimerSignature,
        legitimation.request.claimHashes,
        legitimation.request.rootHash,
        [],
        legitimation.request.delegationId,
      ],
      [
        legitimation.attestation.claimHash,
        legitimation.attestation.cTypeHash,
        legitimation.attestation.owner,
        legitimation.attestation.revoked,
        legitimation.attestation.delegationId,
      ],
    ]
    // Quote Data
    quoteData = {
      attesterAddress: identityAlice.address,
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
    quoteAttesterSigned = Quote.createAttesterSignature(
      quoteData,
      identityAlice
    )
    // Compressed Quote Attester Signed quote
    compressedResultAttesterSignedQuote = [
      quoteAttesterSigned.attesterAddress,
      quoteAttesterSigned.cTypeHash,
      [
        quoteAttesterSigned.cost.gross,
        quoteAttesterSigned.cost.net,
        quoteAttesterSigned.cost.tax,
      ],
      quoteAttesterSigned.currency,
      quoteAttesterSigned.termsAndConditions,
      quoteAttesterSigned.timeframe,
      quoteAttesterSigned.attesterSignature,
    ]
    // Quote agreement
    bothSigned = Quote.createQuoteAgreement(
      identityAlice,
      quoteAttesterSigned,
      legitimation.request.rootHash
    )
    // Compressed Quote Agreement
    compressedQuoteAgreement = [
      bothSigned.attesterAddress,
      bothSigned.cTypeHash,
      [bothSigned.cost.gross, bothSigned.cost.net, bothSigned.cost.tax],
      bothSigned.currency,
      bothSigned.termsAndConditions,
      bothSigned.timeframe,
      bothSigned.attesterSignature,
      bothSigned.claimerSignature,
      bothSigned.rootHash,
    ]
    // Request Terms content
    requestTermsContent = {
      cTypeHash: claim.cTypeHash,
    }
    // Compressed Request terms content
    compressedRequestTermsContent = [claim.cTypeHash, undefined, undefined]
    // Submit Terms content
    submitTermsContent = {
      claim: {
        cTypeHash: claim.cTypeHash,
      },
      legitimations: [legitimation],
      delegationId: undefined,
      quote: quoteAttesterSigned,
      prerequisiteClaims: undefined,
    }
    // Compressed Submit Terms Contentƒ
    compressedSubmitTermsContent = [
      compressedRequestTermsContent,
      [compressedLegitimation],
      undefined,
      compressedResultAttesterSignedQuote,
      undefined,
    ]
    // Reject terms Content
    rejectTermsContent = {
      claim: {
        cTypeHash: claim.cTypeHash,
      },
      legitimations: [legitimation],
    }
    // Compressed Reject terms content
    compressedRejectTermsContent = [
      compressedRequestTermsContent,
      [compressedLegitimation],
      undefined,
    ]

    // Request Attestation Content
    requestAttestationContent = {
      requestForAttestation: legitimation.request,
      quote: bothSigned,
      prerequisiteClaims: undefined,
    }

    // Compressed Request attestation content
    compressedRequestAttestationContent = [
      [
        [
          legitimation.request.claim.cTypeHash,
          legitimation.request.claim.owner,
          legitimation.request.claim.contents,
        ],
        legitimation.request.claimNonceMap,
        legitimation.request.claimerSignature,
        legitimation.request.claimHashes,
        legitimation.request.rootHash,
        [],
        legitimation.request.delegationId,
      ],
      compressedQuoteAgreement,
      undefined,
    ]

    // Submit Attestation content
    submitAttestationContent = {
      attestation: {
        delegationId: null,
        claimHash: requestAttestationContent.requestForAttestation.rootHash,
        cTypeHash: claim.cTypeHash,
        owner: identityBob.getPublicIdentity().address,
        revoked: false,
      },
    }

    // Compressed Submit Attestation content
    compressedSubmitAttestationContent = [
      submitAttestationContent.attestation.claimHash,
      submitAttestationContent.attestation.cTypeHash,
      submitAttestationContent.attestation.owner,
      submitAttestationContent.attestation.revoked,
      submitAttestationContent.attestation.delegationId,
    ]
    // Request Claims for CTypes content
    requestClaimsForCTypesContent = {
      cTypeHash: claim.cTypeHash,
      acceptedAttester: [identityAlice.address],
      requiredProperties: ['id', 'name'],
    }
    // Compressed Request claims for CType content
    compressedRequestClaimsForCTypesContent = [
      claim.cTypeHash,
      [identityAlice.address],
      ['id', 'name'],
    ]
    // Submit claims for CType content
    submitClaimsForCTypesContent = [legitimation]
    // Compressed Submit claims for CType content
    compressedSubmitClaimsForCTypesContent = [compressedLegitimation]
    // Request Accept delegation content
    requestAcceptDelegationContent = {
      delegationData: {
        account: identityAlice.address,
        id: Crypto.hashStr('0x12345678'),
        parentId: Crypto.hashStr('0x12345678'),
        permissions: [1],
        isPCR: false,
      },
      metaData: {},
      signatures: {
        inviter: identityAlice.signStr('signature'),
      },
    }
    // Compressed Request accept delegation content
    compressedRequestAcceptDelegationContent = [
      [
        requestAcceptDelegationContent.delegationData.account,
        requestAcceptDelegationContent.delegationData.id,
        requestAcceptDelegationContent.delegationData.parentId,
        requestAcceptDelegationContent.delegationData.permissions,
        requestAcceptDelegationContent.delegationData.isPCR,
      ],
      requestAcceptDelegationContent.signatures.inviter,
      requestAcceptDelegationContent.metaData,
    ]
    // Submit Accept delegation content
    submitAcceptDelegationContent = {
      delegationData: {
        account: identityAlice.address,
        id: Crypto.hashStr('0x12345678'),
        parentId: Crypto.hashStr('0x12345678'),
        permissions: [1],
        isPCR: false,
      },
      signatures: {
        inviter: identityAlice.signStr('signature'),
        invitee: identityBob.signStr('signature'),
      },
    }
    // Compressed Submit accept delegation content
    compressedSubmitAcceptDelegationContent = [
      [
        submitAcceptDelegationContent.delegationData.account,
        submitAcceptDelegationContent.delegationData.id,
        submitAcceptDelegationContent.delegationData.parentId,
        submitAcceptDelegationContent.delegationData.permissions,
        submitAcceptDelegationContent.delegationData.isPCR,
      ],
      [
        submitAcceptDelegationContent.signatures.inviter,
        submitAcceptDelegationContent.signatures.invitee,
      ],
    ]
    // Reject Accept Delegation content
    rejectAcceptDelegationContent = {
      account: identityAlice.address,
      id: Crypto.hashStr('0x12345678'),
      parentId: Crypto.hashStr('0x12345678'),
      permissions: [1],
      isPCR: false,
    }
    // Compressed Reject accept delegation content
    compressedRejectAcceptDelegationContent = [
      rejectAcceptDelegationContent.account,
      rejectAcceptDelegationContent.id,
      rejectAcceptDelegationContent.parentId,
      rejectAcceptDelegationContent.permissions,
      rejectAcceptDelegationContent.isPCR,
    ]

    informCreateDelegationContent = {
      delegationId: Crypto.hashStr('0x12345678'),
      isPCR: false,
    }

    compressedInformCreateDelegationContent = [
      informCreateDelegationContent.delegationId,
      informCreateDelegationContent.isPCR,
    ]

    requestTermsBody = {
      content: requestTermsContent,
      type: Message.BodyType.REQUEST_TERMS,
    }

    compressedRequestTermsBody = [
      Message.BodyType.REQUEST_TERMS,
      compressedRequestTermsContent,
    ]

    submitTermsBody = {
      content: submitTermsContent,
      type: Message.BodyType.SUBMIT_TERMS,
    }

    compressedSubmitTermsBody = [
      Message.BodyType.SUBMIT_TERMS,
      compressedSubmitTermsContent,
    ]

    rejectTermsBody = {
      content: rejectTermsContent,
      type: Message.BodyType.REJECT_TERMS,
    }

    compressedRejectTermsBody = [
      Message.BodyType.REJECT_TERMS,
      compressedRejectTermsContent,
    ]

    requestAttestationBody = {
      content: requestAttestationContent,
      type: Message.BodyType.REQUEST_ATTESTATION_FOR_CLAIM,
    }

    compressedRequestAttestationBody = [
      Message.BodyType.REQUEST_ATTESTATION_FOR_CLAIM,
      compressedRequestAttestationContent,
    ]

    submitAttestationBody = {
      content: submitAttestationContent,
      type: Message.BodyType.SUBMIT_ATTESTATION_FOR_CLAIM,
    }

    compressedSubmitAttestationBody = [
      Message.BodyType.SUBMIT_ATTESTATION_FOR_CLAIM,
      compressedSubmitAttestationContent,
    ]

    rejectAttestationForClaimBody = {
      content: requestAttestationContent.requestForAttestation.rootHash,
      type: Message.BodyType.REJECT_ATTESTATION_FOR_CLAIM,
    }
    requestClaimsForCTypesBody = {
      content: [requestClaimsForCTypesContent, requestClaimsForCTypesContent],
      type: Message.BodyType.REQUEST_CLAIMS_FOR_CTYPES,
    }

    compressedRequestClaimsForCTypesBody = [
      Message.BodyType.REQUEST_CLAIMS_FOR_CTYPES,
      [
        compressedRequestClaimsForCTypesContent,
        compressedRequestClaimsForCTypesContent,
      ],
    ]

    submitClaimsForCTypesBody = {
      content: submitClaimsForCTypesContent,
      type: Message.BodyType.SUBMIT_CLAIMS_FOR_CTYPES,
    }

    compressedSubmitClaimsForCTypesBody = [
      Message.BodyType.SUBMIT_CLAIMS_FOR_CTYPES,
      compressedSubmitClaimsForCTypesContent,
    ]

    acceptClaimsForCTypesBody = {
      content: [claim.cTypeHash],
      type: Message.BodyType.ACCEPT_CLAIMS_FOR_CTYPES,
    }

    rejectClaimsForCTypesBody = {
      content: [claim.cTypeHash],
      type: Message.BodyType.REJECT_CLAIMS_FOR_CTYPES,
    }

    requestAcceptDelegationBody = {
      content: requestAcceptDelegationContent,
      type: Message.BodyType.REQUEST_ACCEPT_DELEGATION,
    }

    compressedRequestAcceptDelegationBody = [
      Message.BodyType.REQUEST_ACCEPT_DELEGATION,
      compressedRequestAcceptDelegationContent,
    ]

    submitAcceptDelegationBody = {
      content: submitAcceptDelegationContent,
      type: Message.BodyType.SUBMIT_ACCEPT_DELEGATION,
    }

    compressedSubmitAcceptDelegationBody = [
      Message.BodyType.SUBMIT_ACCEPT_DELEGATION,
      compressedSubmitAcceptDelegationContent,
    ]

    rejectAcceptDelegationBody = {
      content: rejectAcceptDelegationContent,
      type: Message.BodyType.REJECT_ACCEPT_DELEGATION,
    }

    compressedRejectAcceptDelegationBody = [
      Message.BodyType.REJECT_ACCEPT_DELEGATION,
      compressedRejectAcceptDelegationContent,
    ]

    informCreateDelegationBody = {
      content: informCreateDelegationContent,
      type: Message.BodyType.INFORM_CREATE_DELEGATION,
    }

    compressedInformCreateDelegationBody = [
      Message.BodyType.INFORM_CREATE_DELEGATION,
      compressedInformCreateDelegationContent,
    ]
  })

  it('Checking message compression and decompression Terms', async () => {
    // Request compression of terms body
    expect(MessageUtils.compressMessage(requestTermsBody)).toEqual(
      compressedRequestTermsBody
    )
    // Request decompression of terms body
    expect(MessageUtils.decompressMessage(compressedRequestTermsBody)).toEqual(
      requestTermsBody
    )
    // Submit compression of terms body
    expect(MessageUtils.compressMessage(submitTermsBody)).toEqual(
      compressedSubmitTermsBody
    )
    // Submit decompression of terms body
    expect(MessageUtils.decompressMessage(compressedSubmitTermsBody)).toEqual(
      submitTermsBody
    )
    // Reject compression of terms body
    expect(MessageUtils.compressMessage(rejectTermsBody)).toEqual(
      compressedRejectTermsBody
    )
    // Reject decompression of terms body
    expect(MessageUtils.decompressMessage(compressedRejectTermsBody)).toEqual(
      rejectTermsBody
    )
  })
  it('Checking message compression and decompression Attestation', async () => {
    // Request compression of attestation body
    expect(MessageUtils.compressMessage(requestAttestationBody)).toEqual(
      compressedRequestAttestationBody
    )
    // Request decompression of attestation body
    expect(
      MessageUtils.decompressMessage(compressedRequestAttestationBody)
    ).toEqual(requestAttestationBody)
    // Submit compression of attestation body

    expect(MessageUtils.compressMessage(submitAttestationBody)).toEqual(
      compressedSubmitAttestationBody
    )
    // Submit decompression of attestation body
    expect(
      MessageUtils.decompressMessage(compressedSubmitAttestationBody)
    ).toEqual(submitAttestationBody)
  })

  it('Checking message compression and decompression Claims for CTypes', async () => {
    // Request compression of claims for ctypes body
    expect(MessageUtils.compressMessage(requestClaimsForCTypesBody)).toEqual(
      compressedRequestClaimsForCTypesBody
    )
    // Request decompression of claims for ctypes body
    expect(
      MessageUtils.decompressMessage(compressedRequestClaimsForCTypesBody)
    ).toEqual(requestClaimsForCTypesBody)
    // Submit compression of claims for ctypes body
    expect(MessageUtils.compressMessage(submitClaimsForCTypesBody)).toEqual(
      compressedSubmitClaimsForCTypesBody
    )
    // Submit decompression of claims for ctypes body
    expect(
      MessageUtils.decompressMessage(compressedSubmitClaimsForCTypesBody)
    ).toEqual(submitClaimsForCTypesBody)
  })
  it('Checking message compression and decompression delegation', async () => {
    // Request compression of delegation body
    expect(MessageUtils.compressMessage(requestAcceptDelegationBody)).toEqual(
      compressedRequestAcceptDelegationBody
    )
    // Request decompression of delegation body
    expect(
      MessageUtils.decompressMessage(compressedRequestAcceptDelegationBody)
    ).toEqual(requestAcceptDelegationBody)
    // Submit compression of delegation body
    expect(MessageUtils.compressMessage(submitAcceptDelegationBody)).toEqual(
      compressedSubmitAcceptDelegationBody
    )
    // Submit decompression of delegation body
    expect(
      MessageUtils.decompressMessage(compressedSubmitAcceptDelegationBody)
    ).toEqual(submitAcceptDelegationBody)
    // Reject compression of delegation body
    expect(MessageUtils.compressMessage(rejectAcceptDelegationBody)).toEqual(
      compressedRejectAcceptDelegationBody
    )
    // Reject decompression of delegation body
    expect(
      MessageUtils.decompressMessage(compressedRejectAcceptDelegationBody)
    ).toEqual(rejectAcceptDelegationBody)
  })
  it('Checking message compression and decompression Inform create delegation', async () => {
    // Inform compression of the create delegation
    expect(MessageUtils.compressMessage(informCreateDelegationBody)).toEqual(
      compressedInformCreateDelegationBody
    )
    // Inform decompression of the create delegation
    expect(
      MessageUtils.decompressMessage(compressedInformCreateDelegationBody)
    ).toEqual(informCreateDelegationBody)
  })
  it('Checks the MessageBody Types through the compress and decompress switch funciton', async () => {
    const compressedMalformed = (['', []] as unknown) as CompressedMessageBody

    expect(() =>
      MessageUtils.decompressMessage(compressedMalformed)
    ).toThrowError(SDKErrors.ERROR_MESSAGE_BODY_MALFORMED())

    const malformed = ({
      content: '',
      type: 'Message.BodyType',
    } as unknown) as MessageBody

    expect(() => MessageUtils.compressMessage(malformed)).toThrowError(
      SDKErrors.ERROR_MESSAGE_BODY_MALFORMED()
    )
  })
  it('Checking required properties for given CType', () => {
    expect(() =>
      MessageUtils.verifyRequiredCTypeProperties(['id', 'name'], testCType)
    ).toThrowError(SDKErrors.ERROR_CTYPE_PROPERTIES_NOT_MATCHING())

    expect(() =>
      MessageUtils.verifyRequiredCTypeProperties(
        ['id', 'name'],
        testCTypeWithMultipleProperties
      )
    ).not.toThrowError(SDKErrors.ERROR_CTYPE_PROPERTIES_NOT_MATCHING())

    expect(
      MessageUtils.verifyRequiredCTypeProperties(
        ['id', 'name'],
        testCTypeWithMultipleProperties
      )
    ).toEqual(true)
  })

  beforeAll(async () => {
    messageRequestTerms = new Message(
      requestTermsBody,
      identityAlice,
      identityBob.getPublicIdentity()
    )
    messageSubmitTerms = new Message(
      submitTermsBody,
      identityAlice,
      identityBob.getPublicIdentity()
    )
    messageRejectTerms = new Message(
      rejectTermsBody,
      identityAlice,
      identityBob.getPublicIdentity()
    )
    messageRequestAttestationForClaim = new Message(
      requestAttestationBody,
      identityAlice,
      identityBob.getPublicIdentity()
    )
    messageSubmitAttestationForClaim = new Message(
      submitAttestationBody,
      identityAlice,
      identityBob.getPublicIdentity()
    )

    messageRejectAttestationForClaim = new Message(
      rejectAttestationForClaimBody,
      identityAlice,
      identityBob.getPublicIdentity()
    )
    messageRequestClaimsForCTypes = new Message(
      requestClaimsForCTypesBody,
      identityAlice,
      identityBob.getPublicIdentity()
    )
    messageSubmitClaimsForCTypes = new Message(
      submitClaimsForCTypesBody,
      identityAlice,
      identityBob.getPublicIdentity()
    )
    messageAcceptClaimsForCTypes = new Message(
      acceptClaimsForCTypesBody,
      identityAlice,
      identityBob.getPublicIdentity()
    )
    messageRejectClaimsForCTypes = new Message(
      rejectClaimsForCTypesBody,
      identityAlice,
      identityBob.getPublicIdentity()
    )
    messageRequestAcceptDelegation = new Message(
      requestAcceptDelegationBody,
      identityAlice,
      identityBob.getPublicIdentity()
    )
    messageSubmitAcceptDelegation = new Message(
      submitAcceptDelegationBody,
      identityAlice,
      identityBob.getPublicIdentity()
    )
    messageRejectAcceptDelegation = new Message(
      rejectAcceptDelegationBody,
      identityAlice,
      identityBob.getPublicIdentity()
    )
    messageInformCreateDelegation = new Message(
      informCreateDelegationBody,
      identityAlice,
      identityBob.getPublicIdentity()
    )
  })
  it('error check should not throw errors on faulty bodies', () => {
    expect(() =>
      MessageUtils.errorCheckMessageBody(requestTermsBody)
    ).not.toThrowError()
    expect(() =>
      MessageUtils.errorCheckMessageBody(submitTermsBody)
    ).not.toThrowError()
    expect(() =>
      MessageUtils.errorCheckMessageBody(rejectTermsBody)
    ).not.toThrowError()
    expect(() =>
      MessageUtils.errorCheckMessageBody(requestAttestationBody)
    ).not.toThrowError()
    expect(() =>
      MessageUtils.errorCheckMessageBody(submitAttestationBody)
    ).not.toThrowError()
    expect(() =>
      MessageUtils.errorCheckMessageBody(rejectAttestationForClaimBody)
    ).not.toThrowError()
    expect(() =>
      MessageUtils.errorCheckMessageBody(requestClaimsForCTypesBody)
    ).not.toThrowError()
    expect(() =>
      MessageUtils.errorCheckMessageBody(submitClaimsForCTypesBody)
    ).not.toThrowError()
    expect(() =>
      MessageUtils.errorCheckMessageBody(acceptClaimsForCTypesBody)
    ).not.toThrowError()
    expect(() =>
      MessageUtils.errorCheckMessageBody(rejectClaimsForCTypesBody)
    ).not.toThrowError()
    expect(() =>
      MessageUtils.errorCheckMessageBody(requestAcceptDelegationBody)
    ).not.toThrowError()
    expect(() =>
      MessageUtils.errorCheckMessageBody(submitAcceptDelegationBody)
    ).not.toThrowError()
    expect(() =>
      MessageUtils.errorCheckMessageBody(rejectAcceptDelegationBody)
    ).not.toThrowError()
    expect(() =>
      MessageUtils.errorCheckMessageBody(informCreateDelegationBody)
    ).not.toThrowError()
  })
  it('error check should not throw errors on message', () => {
    expect(() =>
      MessageUtils.errorCheckMessage(messageRequestTerms)
    ).not.toThrowError()
    expect(() =>
      MessageUtils.errorCheckMessage(messageSubmitTerms)
    ).not.toThrowError()
    expect(() =>
      MessageUtils.errorCheckMessage(messageRejectTerms)
    ).not.toThrowError()
    expect(() =>
      MessageUtils.errorCheckMessage(messageRequestAttestationForClaim)
    ).not.toThrowError()
    expect(() =>
      MessageUtils.errorCheckMessage(messageSubmitAttestationForClaim)
    ).not.toThrowError()
    expect(() =>
      MessageUtils.errorCheckMessage(messageRejectAttestationForClaim)
    ).not.toThrowError()
    expect(() =>
      MessageUtils.errorCheckMessage(messageRequestClaimsForCTypes)
    ).not.toThrowError()
    expect(() =>
      MessageUtils.errorCheckMessage(messageSubmitClaimsForCTypes)
    ).not.toThrowError()
    expect(() =>
      MessageUtils.errorCheckMessage(messageAcceptClaimsForCTypes)
    ).not.toThrowError()
    expect(() =>
      MessageUtils.errorCheckMessage(messageRejectClaimsForCTypes)
    ).not.toThrowError()
    expect(() =>
      MessageUtils.errorCheckMessage(messageRequestAcceptDelegation)
    ).not.toThrowError()
    expect(() =>
      MessageUtils.errorCheckMessage(messageSubmitAcceptDelegation)
    ).not.toThrowError()
    expect(() =>
      MessageUtils.errorCheckMessage(messageRejectAcceptDelegation)
    ).not.toThrowError()
    expect(() =>
      MessageUtils.errorCheckMessage(messageInformCreateDelegation)
    ).not.toThrowError()
  })
  it('error check should throw errors on message', () => {
    messageRequestTerms.receiverAddress = 'this is not a receiver address'
    expect(() =>
      MessageUtils.errorCheckMessage(messageRequestTerms)
    ).toThrowError(
      SDKErrors.ERROR_ADDRESS_INVALID(
        messageRequestTerms.receiverAddress,
        'receiver address'
      )
    )
    messageSubmitTerms.senderBoxPublicKey =
      'this is not a sender box public key'
    expect(() =>
      MessageUtils.errorCheckMessage(messageSubmitTerms)
    ).toThrowError(SDKErrors.ERROR_ADDRESS_INVALID())
    messageRejectTerms.senderAddress = 'this is not a sender address'
    expect(() =>
      MessageUtils.errorCheckMessage(messageRejectTerms)
    ).toThrowError(
      SDKErrors.ERROR_ADDRESS_INVALID(
        messageRejectTerms.senderAddress,
        'sender address'
      )
    )
  })
  it('error check should throw errors on faulty bodies', () => {
    requestTermsBody.content.cTypeHash = 'this is not a ctype hash'
    expect(() =>
      MessageUtils.errorCheckMessageBody(requestTermsBody)
    ).toThrowError(
      SDKErrors.ERROR_HASH_MALFORMED(
        requestTermsBody.content.cTypeHash,
        'Claim CType'
      )
    )
    submitTermsBody.content.prerequisiteClaims = 'this is not a delegation id'
    expect(() =>
      MessageUtils.errorCheckMessageBody(submitTermsBody)
    ).toThrowError(
      SDKErrors.ERROR_HASH_MALFORMED(
        submitTermsBody.content.prerequisiteClaims,
        'Submit terms pre-requisite claims invalid'
      )
    )
    submitTermsBody.content.delegationId = 'this is not a delegation id'
    expect(() =>
      MessageUtils.errorCheckMessageBody(submitTermsBody)
    ).toThrowError(
      SDKErrors.ERROR_HASH_MALFORMED(
        submitTermsBody.content.delegationId,
        'Submit terms delegation id hash invalid'
      )
    )

    rejectTermsBody.content.delegationId = 'this is not a delegation id'
    expect(() =>
      MessageUtils.errorCheckMessageBody(rejectTermsBody)
    ).toThrowError(
      SDKErrors.ERROR_HASH_MALFORMED(
        rejectTermsBody.content.delegationId,
        'Reject terms delegation id hash'
      )
    )
    delete rejectTermsBody.content.claim.cTypeHash
    expect(() =>
      MessageUtils.errorCheckMessageBody(rejectTermsBody)
    ).toThrowError(SDKErrors.ERROR_CTYPE_HASH_NOT_PROVIDED())
    requestAttestationBody.content.requestForAttestation.claimerSignature =
      'this is not the claimers signature'
    expect(() =>
      MessageUtils.errorCheckMessageBody(requestAttestationBody)
    ).toThrowError()
    submitAttestationBody.content.attestation.claimHash =
      'this is not the claim hash'
    expect(() =>
      MessageUtils.errorCheckMessageBody(submitAttestationBody)
    ).toThrowError(
      SDKErrors.ERROR_HASH_MALFORMED(
        submitAttestationBody.content.attestation.claimHash,
        'Claim'
      )
    )
    rejectAttestationForClaimBody.content = 'this is not the root hash'
    expect(() =>
      MessageUtils.errorCheckMessageBody(rejectAttestationForClaimBody)
    ).toThrowError(SDKErrors.ERROR_HASH_MALFORMED())
    requestClaimsForCTypesBody.content[0].cTypeHash = 'this is not a cTypeHash'
    expect(() =>
      MessageUtils.errorCheckMessageBody(requestClaimsForCTypesBody)
    ).toThrowError(
      SDKErrors.ERROR_HASH_MALFORMED(
        requestClaimsForCTypesBody.content[0].cTypeHash,
        'request claims for ctypes cTypeHash invalid'
      )
    )
    delete submitClaimsForCTypesBody.content[0].attestation.revoked
    expect(() =>
      MessageUtils.errorCheckMessageBody(submitClaimsForCTypesBody)
    ).toThrowError(SDKErrors.ERROR_REVOCATION_BIT_MISSING())
    acceptClaimsForCTypesBody.content[0] = 'this is not a cTypeHash'
    expect(() =>
      MessageUtils.errorCheckMessageBody(acceptClaimsForCTypesBody)
    ).toThrowError(
      SDKErrors.ERROR_HASH_MALFORMED(
        acceptClaimsForCTypesBody.content[0],
        'accept claims for ctypes message ctype hash invalid'
      )
    )
    rejectClaimsForCTypesBody.content[0] = 'this is not a cTypeHash'
    expect(() =>
      MessageUtils.errorCheckMessageBody(rejectClaimsForCTypesBody)
    ).toThrowError(
      SDKErrors.ERROR_HASH_MALFORMED(
        rejectClaimsForCTypesBody.content[0],
        'rejected claims for ctypes ctype hashes invalid'
      )
    )
    delete requestAcceptDelegationBody.content.metaData
    expect(() =>
      MessageUtils.errorCheckMessageBody(requestAcceptDelegationBody)
    ).toThrowError(SDKErrors.ERROR_OBJECT_MALFORMED())
    requestAcceptDelegationBody.content.signatures.inviter =
      'this is not a signature'
    expect(() =>
      MessageUtils.errorCheckMessageBody(requestAcceptDelegationBody)
    ).toThrowError(SDKErrors.ERROR_SIGNATURE_DATA_TYPE())
    submitAcceptDelegationBody.content.signatures.invitee =
      'this is not a signature'
    expect(() =>
      MessageUtils.errorCheckMessageBody(submitAcceptDelegationBody)
    ).toThrowError(SDKErrors.ERROR_SIGNATURE_DATA_TYPE())
    submitAcceptDelegationBody.content.delegationData.parentId =
      'this is not a parent id hash'
    expect(() =>
      MessageUtils.errorCheckMessageBody(submitAcceptDelegationBody)
    ).toThrowError(SDKErrors.ERROR_DELEGATION_ID_TYPE())

    delete rejectAcceptDelegationBody.content.account
    expect(() =>
      MessageUtils.errorCheckMessageBody(rejectAcceptDelegationBody)
    ).toThrowError(SDKErrors.ERROR_OWNER_NOT_PROVIDED())
    informCreateDelegationBody.content.delegationId =
      'this is not a delegation id'
    expect(() =>
      MessageUtils.errorCheckMessageBody(informCreateDelegationBody)
    ).toThrowError(
      SDKErrors.ERROR_HASH_MALFORMED(
        informCreateDelegationBody.content.delegationId,
        'inform create delegation message delegation id invalid'
      )
    )
    expect(() =>
      MessageUtils.errorCheckMessageBody({} as MessageBody)
    ).toThrowError(SDKErrors.ERROR_MESSAGE_BODY_MALFORMED())
  })
  it('error check of the delegation data in messaging', () => {
    delete requestAcceptDelegationBody.content.delegationData.isPCR
    expect(() =>
      MessageUtils.errorCheckDelegationData(
        requestAcceptDelegationBody.content.delegationData
      )
    ).toThrowError(TypeError('isPCR is expected to be a boolean'))
    requestAcceptDelegationBody.content.delegationData.id =
      'this is not a delegation id'
    expect(() =>
      MessageUtils.errorCheckDelegationData(
        requestAcceptDelegationBody.content.delegationData
      )
    ).toThrowError(SDKErrors.ERROR_DELEGATION_ID_TYPE())
    submitAcceptDelegationBody.content.delegationData.permissions = []
    expect(() =>
      MessageUtils.errorCheckDelegationData(
        submitAcceptDelegationBody.content.delegationData
      )
    ).toThrowError(
      SDKErrors.ERROR_UNAUTHORIZED(
        'Must have at least one permission and no more then two'
      )
    )
    delete submitAcceptDelegationBody.content.delegationData.id
    expect(() =>
      MessageUtils.errorCheckDelegationData(
        submitAcceptDelegationBody.content.delegationData
      )
    ).toThrowError(SDKErrors.ERROR_DELEGATION_ID_MISSING())
  })
})
