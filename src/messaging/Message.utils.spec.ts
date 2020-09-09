import Identity from '../identity'
import {
  MessageBodyType,
  ISubmitAttestationForClaim,
  CompressedSubmitAttestationForClaim,
  ISubmittingAttestationForClaim,
  IRequestingAttestationForClaim,
  ICompressedSubmitAttestationForClaim,
  MessageBody,
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
import { CompressedAttestedClaim } from '../types/AttestedClaim'

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
  let requestAttestationContent: IRequestingAttestationForClaim
  let submitAttestationContent: ISubmittingAttestationForClaim
  let submitAttestationBody: ISubmitAttestationForClaim
  let compressedSubmitAttestationContent: CompressedSubmitAttestationForClaim
  let compressedSubmitAttestationBody: ICompressedSubmitAttestationForClaim
  let legitimation: AttestedClaim
  let compressedLegitimation: CompressedAttestedClaim
  let attestedClaim: AttestedClaim

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

    submitAttestationBody = {
      content: submitAttestationContent,
      type: MessageBodyType.SUBMIT_ATTESTATION_FOR_CLAIM,
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

    compressedSubmitAttestationBody = [
      MessageBodyType.SUBMIT_ATTESTATION_FOR_CLAIM,
      compressedSubmitAttestationContent,
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
  })

  it('Checking message compression AttestedClaims', async () => {
    expect(MessageUtils.compressMessage(submitAttestationBody)).toEqual(
      compressedSubmitAttestationBody
    )
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
