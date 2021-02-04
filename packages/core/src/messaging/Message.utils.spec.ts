import {
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
  MessageBodyType,
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
} from '@kiltprotocol/types'
import Identity from '../identity'

import * as SDKErrors from '../errorhandling/SDKErrors'
import * as MessageUtils from './Message.utils'
import Quote from '../quote'
import Claim from '../claim'
import CType from '../ctype'
import AttestedClaim from '../attestedclaim'
import buildAttestedClaim from '../attestedclaim/AttestedClaim.spec'

describe('Messaging Utilities', () => {
  let identityAlice: Identity
  let identityBob: Identity
  let date: Date
  let rawCType: ICType['schema']
  let testCType: CType
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
  let requestClaimsForCTypesBody: IRequestClaimsForCTypes
  let requestClaimsForCTypesContent: IRequestClaimsForCTypesContent
  let compressedRequestClaimsForCTypesBody: CompressedRequestClaimsForCTypes
  let compressedRequestClaimsForCTypesContent: Array<ICType['hash']>
  let submitClaimsForCTypesBody: ISubmitClaimsForCTypes
  let submitClaimsForCTypesContent: IAttestedClaim[]
  let compressedSubmitClaimsForCTypesBody: CompressedSubmitClaimsForCTypes
  let compressedSubmitClaimsForCTypesContent: CompressedAttestedClaim[]
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

  beforeAll(async () => {
    identityAlice = await Identity.buildFromURI('//Alice')
    identityBob = await Identity.buildFromURI('//Bob')
    date = new Date(2019, 11, 10)
    claimContents = {
      name: 'Bob',
    }
    // CType Schema
    rawCType = {
      $id: 'kilt:ctype:0x1',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
      title: 'ClaimCtype',
      properties: {
        name: { type: 'string' },
      },
      type: 'object',
    }
    // CType
    testCType = CType.fromSchema(rawCType, identityAlice.address)
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
      ctypes: [claim.cTypeHash],
    }
    // Compressed Request claims for CType content
    compressedRequestClaimsForCTypesContent = [claim.cTypeHash]
    // Submit claims for CType content
    submitClaimsForCTypesContent = [legitimation]
    // Compressed Submit claims for CType content
    compressedSubmitClaimsForCTypesContent = [compressedLegitimation]
    // Request Accept delegation content
    requestAcceptDelegationContent = {
      delegationData: {
        account: '',
        id: '',
        parentId: '',
        permissions: [1],
        isPCR: false,
      },
      metaData: undefined,
      signatures: {
        inviter: 'string',
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
        account: '',
        id: '',
        parentId: '',
        permissions: [1],
        isPCR: false,
      },
      signatures: {
        inviter: 'string',
        invitee: 'string',
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
      account: '',
      id: '',
      parentId: '',
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

    informCreateDelegationContent = { delegationId: '', isPCR: false }

    compressedInformCreateDelegationContent = [
      informCreateDelegationContent.delegationId,
      informCreateDelegationContent.isPCR,
    ]

    requestTermsBody = {
      content: requestTermsContent,
      type: MessageBodyType.REQUEST_TERMS,
    }

    compressedRequestTermsBody = [
      MessageBodyType.REQUEST_TERMS,
      compressedRequestTermsContent,
    ]

    submitTermsBody = {
      content: submitTermsContent,
      type: MessageBodyType.SUBMIT_TERMS,
    }

    compressedSubmitTermsBody = [
      MessageBodyType.SUBMIT_TERMS,
      compressedSubmitTermsContent,
    ]

    rejectTermsBody = {
      content: rejectTermsContent,
      type: MessageBodyType.REJECT_TERMS,
    }

    compressedRejectTermsBody = [
      MessageBodyType.REJECT_TERMS,
      compressedRejectTermsContent,
    ]

    requestAttestationBody = {
      content: requestAttestationContent,
      type: MessageBodyType.REQUEST_ATTESTATION_FOR_CLAIM,
    }

    compressedRequestAttestationBody = [
      MessageBodyType.REQUEST_ATTESTATION_FOR_CLAIM,
      compressedRequestAttestationContent,
    ]

    submitAttestationBody = {
      content: submitAttestationContent,
      type: MessageBodyType.SUBMIT_ATTESTATION_FOR_CLAIM,
    }

    compressedSubmitAttestationBody = [
      MessageBodyType.SUBMIT_ATTESTATION_FOR_CLAIM,
      compressedSubmitAttestationContent,
    ]

    requestClaimsForCTypesBody = {
      content: requestClaimsForCTypesContent,
      type: MessageBodyType.REQUEST_CLAIMS_FOR_CTYPES,
    }

    compressedRequestClaimsForCTypesBody = [
      MessageBodyType.REQUEST_CLAIMS_FOR_CTYPES,
      compressedRequestClaimsForCTypesContent,
    ]

    submitClaimsForCTypesBody = {
      content: submitClaimsForCTypesContent,
      type: MessageBodyType.SUBMIT_CLAIMS_FOR_CTYPES,
    }

    compressedSubmitClaimsForCTypesBody = [
      MessageBodyType.SUBMIT_CLAIMS_FOR_CTYPES,
      compressedSubmitClaimsForCTypesContent,
    ]

    requestAcceptDelegationBody = {
      content: requestAcceptDelegationContent,
      type: MessageBodyType.REQUEST_ACCEPT_DELEGATION,
    }

    compressedRequestAcceptDelegationBody = [
      MessageBodyType.REQUEST_ACCEPT_DELEGATION,
      compressedRequestAcceptDelegationContent,
    ]

    submitAcceptDelegationBody = {
      content: submitAcceptDelegationContent,
      type: MessageBodyType.SUBMIT_ACCEPT_DELEGATION,
    }

    compressedSubmitAcceptDelegationBody = [
      MessageBodyType.SUBMIT_ACCEPT_DELEGATION,
      compressedSubmitAcceptDelegationContent,
    ]

    rejectAcceptDelegationBody = {
      content: rejectAcceptDelegationContent,
      type: MessageBodyType.REJECT_ACCEPT_DELEGATION,
    }

    compressedRejectAcceptDelegationBody = [
      MessageBodyType.REJECT_ACCEPT_DELEGATION,
      compressedRejectAcceptDelegationContent,
    ]

    informCreateDelegationBody = {
      content: informCreateDelegationContent,
      type: MessageBodyType.INFORM_CREATE_DELEGATION,
    }

    compressedInformCreateDelegationBody = [
      MessageBodyType.INFORM_CREATE_DELEGATION,
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
      type: 'MessageBodyType',
    } as unknown) as MessageBody

    expect(() => MessageUtils.compressMessage(malformed)).toThrowError(
      SDKErrors.ERROR_MESSAGE_BODY_MALFORMED()
    )
  })
})
