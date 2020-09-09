import Identity from '../identity'
import {
  MessageBodyType,
  ISubmitAttestationForClaim,
  CompressedSubmitAttestationForClaim,
  ISubmittingAttestationForClaim,
  IRequestingAttestationForClaim,
  ICompressedSubmitAttestationForClaim,
  MessageBody,
  IRequestTerms,
  ICompressedRequestTerms,
  ISubmitTerms,
  ICompressedSubmitTerms,
  IRejectTerms,
  ICompressedRejectTerms,
  IRequestAttestationForClaim,
  ICompressedRequestAttestationForClaim,
  ICompressedRequestClaimsForCTypes,
  ISubmitClaimsForCTypesClassic,
  ICompressedSubmitClaimsForCTypesClassic,
  IRequestAcceptDelegation,
  ICompressedRequestAcceptDelegation,
  ISubmitAcceptDelegation,
  ICompressedSubmitAcceptDelegation,
  IRequestClaimsForCTypes,
  IRejectAcceptDelegation,
  ICompressedRejectAcceptDelegation,
  IInformCreateDelegation,
  ICompressedInformCreateDelegation,
  IPartialClaim,
  IPartialCompressedClaim,
  CompressedRejectedTerms,
  CompressedRequestAttestationForClaim,
  IRequestingClaimsForCTypes,
  CompressedRequestClaimsForCTypes,
  IRequestingAcceptDelegation,
  CompressedRequestAcceptDelegation,
  ISubmitingAcceptDelegation,
  CompressedSubmitAcceptDelegation,
  IDelegationData,
  CompressedDelegationData,
  IInformingCreateDelegation,
  CompressedInformCreateDelegation,
} from './Message'
import * as SDKErrors from '../errorhandling/SDKErrors'
import * as MessageUtils from './Message.utils'
import { IQuote, IQuoteAttesterSigned, IQuoteAgreement } from '../types/Quote'
import Quote from '../quote'
import Claim from '../claim'
import CType from '../ctype'
import ICType from '../types/CType'
import IClaim from '../types/Claim'
import AttestedClaim from '../attestedclaim'
import buildAttestedClaim from '../attestedclaim/AttestedClaim.spec'
import IAttestedClaim, { CompressedAttestedClaim } from '../types/AttestedClaim'
import { ITerms } from '..'
import { CompressedTerms } from '../types/Terms'

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
  let submitAttestationContent: ISubmittingAttestationForClaim
  let submitAttestationBody: ISubmitAttestationForClaim
  let compressedSubmitAttestationContent: CompressedSubmitAttestationForClaim
  let compressedSubmitAttestationBody: ICompressedSubmitAttestationForClaim
  let legitimation: AttestedClaim
  let compressedLegitimation: CompressedAttestedClaim
  let attestedClaim: AttestedClaim
  let requestTermsBody: IRequestTerms
  let requestTermsContent: IPartialClaim
  let compressedRequestTermsBody: ICompressedRequestTerms
  let compressedRequestTermsContent: IPartialCompressedClaim
  let submitTermsBody: ISubmitTerms
  let submitTermsContent: ITerms
  let compressedSubmitTermsBody: ICompressedSubmitTerms
  let compressedSubmitTermsContent: CompressedTerms
  let rejectTermsBody: IRejectTerms
  let rejectTermsContent: Pick<
    ITerms,
    'claim' | 'legitimations' | 'delegationId'
  >
  let compressedRejectTermsBody: ICompressedRejectTerms
  let compressedRejectTermsContent: CompressedRejectedTerms
  let requestAttestationBody: IRequestAttestationForClaim
  let requestAttestationContent: IRequestingAttestationForClaim
  let compressedRequestAttestationBody: ICompressedRequestAttestationForClaim
  let compressedRequestAttestationContent: CompressedRequestAttestationForClaim
  let requestClaimsForCTypesBody: IRequestClaimsForCTypes
  let requestClaimsForCTypesContent: IRequestingClaimsForCTypes
  let compressedRequestClaimsForCTypesBody: ICompressedRequestClaimsForCTypes
  let compressedRequestClaimsForCTypesContent: CompressedRequestClaimsForCTypes
  let submitClaimsForCTypesClassicBody: ISubmitClaimsForCTypesClassic
  let submitClaimsForCTypesClassicContent: IAttestedClaim[]
  let compressedSubmitClaimsForCTypesClassicBody: ICompressedSubmitClaimsForCTypesClassic
  let compressedSubmitClaimsForCTypesClassicContent: CompressedAttestedClaim[]
  let requestAcceptDelegationBody: IRequestAcceptDelegation
  let requestAcceptDelegationContent: IRequestingAcceptDelegation
  let compressedRequestAcceptDelegationBody: ICompressedRequestAcceptDelegation
  let compressedRequestAcceptDelegationContent: CompressedRequestAcceptDelegation
  let submitAcceptDelegationBody: ISubmitAcceptDelegation
  let submitAcceptDelegationContent: ISubmitingAcceptDelegation
  let compressedSubmitAcceptDelegationBody: ICompressedSubmitAcceptDelegation
  let compressedSubmitAcceptDelegationContent: CompressedSubmitAcceptDelegation
  let rejectAcceptDelegationBody: IRejectAcceptDelegation
  let rejectAcceptDelegationContent: IDelegationData
  let compressedRejectAcceptDelegationBody: ICompressedRejectAcceptDelegation
  let compressedRejectAcceptDelegationContent: CompressedDelegationData
  let informCreateDelegationBody: IInformCreateDelegation
  let informCreateDelegationContent: IInformingCreateDelegation
  let compressedInformCreateDelegationBody: ICompressedInformCreateDelegation
  let compressedInformCreateDelegationContent: CompressedInformCreateDelegation

  beforeAll(async () => {
    identityAlice = await Identity.buildFromURI('//Alice')
    identityBob = await Identity.buildFromURI('//Bob')
    date = new Date(2019, 11, 10)
    claimContents = {
      name: 'Bob',
    }

    rawCType = {
      $id: 'kilt:ctype:0x1',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
      title: 'ClaimCtype',
      properties: {
        name: { type: 'string' },
      },
      type: 'object',
    }

    testCType = CType.fromSchema(rawCType, identityAlice.address)

    claim = Claim.fromCTypeAndClaimContents(
      testCType,
      claimContents,
      identityAlice.address
    )

    legitimation = await buildAttestedClaim(identityAlice, identityBob, {}, [])

    compressedLegitimation = [
      [
        [
          legitimation.request.claim.cTypeHash,
          legitimation.request.claim.owner,
          legitimation.request.claim.contents,
        ],
        {},
        [
          legitimation.request.claimOwner.hash,
          legitimation.request.claimOwner.nonce,
        ],
        legitimation.request.claimerSignature,
        [
          legitimation.request.cTypeHash.hash,
          legitimation.request.cTypeHash.nonce,
        ],
        legitimation.request.rootHash,
        [],
        legitimation.request.delegationId,
        null,
      ],
      [
        legitimation.attestation.claimHash,
        legitimation.attestation.cTypeHash,
        legitimation.attestation.owner,
        legitimation.attestation.revoked,
        legitimation.attestation.delegationId,
      ],
    ]

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

    quoteAttesterSigned = Quote.createAttesterSignature(
      quoteData,
      identityAlice
    )

    bothSigned = Quote.createQuoteAgreement(
      identityAlice,
      quoteAttesterSigned,
      legitimation.request.rootHash
    )

    requestAttestationContent = {
      requestForAttestation: legitimation.request,
      quote: bothSigned,
      prerequisiteClaims: [],
    }

    compressedSubmitAttestationContent = [
      [
        submitAttestationContent.attestation.claimHash,
        submitAttestationContent.attestation.cTypeHash,
        submitAttestationContent.attestation.owner,
        submitAttestationContent.attestation.revoked,
        submitAttestationContent.attestation.delegationId,
      ],
      undefined,
    ]

    attestedClaim = await buildAttestedClaim(
      identityBob,
      identityAlice,
      {
        a: 'a',
        b: 'b',
        c: 'c',
      },
      [legitimation]
    )
    // const requestAttestationBody: IRequestAttestationForClaim = {
    //   content: requestAttestationContent,
    //   type: MessageBodyType.REQUEST_ATTESTATION_FOR_CLAIM,
    // }
    submitAttestationContent = {
      attestation: {
        delegationId: null,
        claimHash: requestAttestationContent.requestForAttestation.rootHash,
        cTypeHash: claim.cTypeHash,
        owner: identityBob.getPublicIdentity().address,
        revoked: false,
      },
    }

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

    submitClaimsForCTypesClassicBody = {
      content: submitClaimsForCTypesClassicContent,
      type: MessageBodyType.SUBMIT_CLAIMS_FOR_CTYPES_CLASSIC,
    }

    compressedSubmitClaimsForCTypesClassicBody = [
      MessageBodyType.SUBMIT_CLAIMS_FOR_CTYPES_CLASSIC,
      compressedSubmitClaimsForCTypesClassicContent,
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

    console.log(attestedClaim, compressedLegitimation)
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
    expect(
      MessageUtils.compressMessage(submitClaimsForCTypesClassicBody)
    ).toEqual(compressedSubmitClaimsForCTypesClassicBody)
    // Submit decompression of claims for ctypes body
    expect(
      MessageUtils.decompressMessage(compressedSubmitClaimsForCTypesClassicBody)
    ).toEqual(submitClaimsForCTypesClassicBody)
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
  it('Checks the MessageBody Types through the compress switch funciton', async () => {
    const malformed = ({
      content: '',
      type: 'MessageBodyType',
    } as unknown) as MessageBody

    expect(MessageUtils.compressMessage(malformed)).toThrowError(
      SDKErrors.ERROR_MESSAGE_BODY_MALFORMED()
    )
  })
})
