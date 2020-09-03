import Identity from '../identity'
import {
  MessageBodyType,
  ISubmitAttestationForClaim,
  CompressedSubmitAttestationForClaim,
  ISubmittingAttestationForClaim,
  IRequestingAttestationForClaim,
} from './Message'
import * as MessageUtils from './Message.utils'
import IRequestForAttestation from '../types/RequestForAttestation'
import { IQuote, IQuoteAttesterSigned, IQuoteAgreement } from '../types/Quote'
import Quote from '../quote'
import Claim from '../claim'
import CType from '../ctype'
import ICType from '../types/CType'
import IClaim from '../types/Claim'

describe('Messaging Utilities', () => {
  let identityAlice: Identity
  let identityBob: Identity
  let date: Date
  let rawCType: ICType['schema']
  let testCType: CType
  let claim: Claim
  let claimContents: IClaim['contents']
  let content: IRequestForAttestation
  let quoteData: IQuote
  let quoteAttesterSigned: IQuoteAttesterSigned
  let bothSigned: IQuoteAgreement
  let requestAttestationContent: IRequestingAttestationForClaim
  let submitAttestationContent: ISubmittingAttestationForClaim
  let submitAttestationBody: ISubmitAttestationForClaim
  let compressedSubmitAttestationContent: CompressedSubmitAttestationForClaim
  let compressedSubmitAttestationBody

  beforeAll(async () => {
    identityAlice = await Identity.buildFromURI('//Alice')
    identityBob = await Identity.buildFromURI('//Bob')
    date = new Date(2019, 11, 10)
  })

  it('Checks the MessageBody Types through the compress switch funciton', () => {
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
    content = {
      claim,
      delegationId: null,
      legitimations: [],
      claimOwner: { nonce: '0x12345678', hash: claim.cTypeHash },
      claimHashTree: {},
      cTypeHash: { nonce: '0x12345678', hash: claim.cTypeHash },
      rootHash: '0x12345678',
      claimerSignature: '0x12345678',
      privacyEnhancement: null,
    }

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
      content.rootHash
    )

    requestAttestationContent = {
      requestForAttestation: content,
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

    compressedSubmitAttestationBody = {
      content: compressedSubmitAttestationContent,
      type: MessageBodyType.SUBMIT_ATTESTATION_FOR_CLAIM,
    }

    expect(MessageUtils.compressMessage(submitAttestationBody)).toEqual(
      compressedSubmitAttestationBody
    )
  })
})
