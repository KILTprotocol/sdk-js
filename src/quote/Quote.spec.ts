import QuoteSchema from './QuoteSchema'
import IQuote, {
  ICostBreakdown,
  IQuoteAttesterSigned,
  IQuoteAgreement,
} from '../types/Quote'
import Identity from '../identity/Identity'
import Quote from './Quote'
import {
  IRequestAttestationForClaim,
  MessageBodyType,
} from '../messaging/Message'
import CType from '../ctype/CType'
import ICType from '../types/CType'
import IClaim from '../types/Claim'
import RequestForAttestation from '../requestforattestation/RequestForAttestation'
import AttestedClaim from '../attestedclaim/AttestedClaim'

describe('Claim', () => {
  const claimerIdentity = Identity.buildFromURI('//Alice')
  const attesterIdentity = Identity.buildFromURI('//Bob')
  const invalidCost = { gross: 233, tax: 23.3 } as ICostBreakdown
  const date = new Date(2019, 11, 10)

  const testCType: CType = CType.fromCType({
    schema: {
      $id: 'http://example.com/ctype-1',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
      properties: {
        name: { type: 'string' },
      },
      type: 'object',
    },
    metadata: {
      title: { default: 'CType Title' },
      description: {},
      properties: {
        name: { title: { default: 'Name' } },
      },
    },
  } as ICType)
  const claim = {
    cTypeHash: testCType.hash,
    contents: {},
    owner: claimerIdentity.address,
  } as IClaim
  // build request for attestation with legimitations
  const request = RequestForAttestation.fromClaimAndIdentity(
    claim,
    claimerIdentity,
    [] as AttestedClaim[],
    null
  )
  const invalidCostQuoteData = {
    cTypeHash:
      '0xa8c5bdb22aaea3fceb5467d37169cbe49c71f226233037537e70a32a032304ff',
    cost: invalidCost,
    currency: 'Euro',
    quoteTimeframe: date,
    termsAndConditions: 'Lots of these',
    version: '1.1.3',
  } as IQuote

  const invalidPropertiesQuoteData = {
    cTypeHash:
      '0xa8c5bdb22aaea3fceb5467d37169cbe49c71f226233037537e70a32a032304ff',
    cost: {
      gross: 233,
      net: 23.3,
      tax: 23.3,
    },
    quoteTimeframe: date,
    currency: 'Euro',
    termsAndConditions: 'Lots of these',
  } as IQuote

  const validQuoteData: IQuote = {
    attesterAddress: attesterIdentity.address,
    cTypeHash:
      '0xa8c5bdb22aaea3fceb5467d37169cbe49c71f226233037537e70a32a032304ff',
    cost: {
      gross: 233,
      net: 23.3,
      tax: 23.3,
    },
    currency: 'Euro',
    quoteTimeframe: new Date('12-04-2020'),
    termsAndConditions: 'Lots of these',
    version: '1.1.3',
  }
  const validQuote = new Quote(validQuoteData)
  const validAttesterSignedQuote: IQuoteAttesterSigned = validQuote.createAttesterSignature(
    attesterIdentity
  )

  const quoteBothAgreed: IQuoteAgreement = Quote.createAgreedQuote(
    claimerIdentity,
    validAttesterSignedQuote,
    request.rootHash
  )
  const message: IRequestAttestationForClaim = {
    content: {
      requestForAttestation: request,
      quote: quoteBothAgreed,
    },
    type: MessageBodyType.REQUEST_ATTESTATION_FOR_CLAIM,
  }
  console.info(JSON.stringify(message, null, 4))
  const invalidPropertiesQuote = new Quote(invalidPropertiesQuoteData)
  const invalidCostQuote = new Quote(invalidCostQuoteData)

  it('tests created quote data against given data', () => {
    expect(validQuote).toEqual(validQuoteData)
    expect(validQuote.attesterAddress).toEqual(attesterIdentity.address)
  })
  it('validates created quotes against QuoteSchema', () => {
    expect(Quote.validateQuoteSchema(QuoteSchema, validQuote)).toBeTruthy()
    expect(Quote.validateQuoteSchema(QuoteSchema, invalidCostQuote)).toBeFalsy()
    expect(
      Quote.validateQuoteSchema(QuoteSchema, invalidPropertiesQuote)
    ).toBeFalsy()
  })
})
