import QuoteSchema from './QuoteSchema'
import {
  IQuote,
  ICostBreakdown,
  IQuoteAttesterSigned,
  IQuoteAgreement,
} from '../types/Quote'
import Identity from '../identity/Identity'
import * as Quote from './Quote'
import CType from '../ctype/CType'
import ICType from '../types/CType'
import IClaim from '../types/Claim'
import RequestForAttestation from '../requestforattestation/RequestForAttestation'
import { verify, hashObjectAsStr } from '../crypto/Crypto'

describe('Claim', () => {
  const claimerIdentity = Identity.buildFromURI('//Alice')
  const attesterIdentity = Identity.buildFromURI('//Bob')
  const invalidCost = { gross: 233, tax: { vat: 3.3 } } as ICostBreakdown
  const date = new Date(2019, 11, 10)

  const cType: ICType['schema'] = {
    $id: 'http://example.com/ctype-1',
    $schema: 'http://kilt-protocol.org/draft-01/ctype#',
    properties: {
      name: { type: 'string' },
    },
    type: 'object',
  }

  const fromRawCType: ICType = {
    schema: cType,
    owner: claimerIdentity.address,
    hash: '',
  }

  const testCType = CType.fromCType(fromRawCType)

  const claim: IClaim = {
    cTypeHash: testCType.hash,
    contents: {},
    owner: claimerIdentity.address,
  }
  // build request for attestation with legimitations
  const request = RequestForAttestation.fromClaimAndIdentity(
    claim,
    claimerIdentity,
    [],
    null
  )
  const invalidCostQuoteData = {
    cTypeHash: '0x12345678',
    cost: invalidCost,
    currency: 'Euro',
    timeframe: date,
    termsAndConditions: 'Lots of these',
  } as IQuote

  const invalidPropertiesQuoteData = {
    cTypeHash: '0x12345678',
    cost: {
      gross: 233,
      net: 23.3,
      tax: { vat: 3.3 },
    },
    timeframe: date,
    currency: 'Euro',
    termsAndConditions: 'Lots of these',
  } as IQuote

  const validQuoteData: IQuote = {
    attesterAddress: attesterIdentity.address,
    cTypeHash: '0x12345678',
    cost: {
      gross: 233,
      net: 23.3,
      tax: { vat: 3.3 },
    },
    currency: 'Euro',
    timeframe: new Date('12-04-2020'),
    termsAndConditions: 'Lots of these',
  }
  const validAttesterSignedQuote: IQuoteAttesterSigned = Quote.createAttesterSignature(
    validQuoteData,
    attesterIdentity
  )
  const quoteBothAgreed: IQuoteAgreement = Quote.createAgreedQuote(
    claimerIdentity,
    validAttesterSignedQuote,
    request.rootHash
  )
  const invalidPropertiesQuote = invalidPropertiesQuoteData
  const invalidCostQuote = invalidCostQuoteData
  it('compresses and decompresses the quote object', () => {
    const compressedQuote: Quote.CompressedQuote = [
      validQuoteData.attesterAddress,
      validQuoteData.cTypeHash,
      Quote.compressCost(validQuoteData.cost),
      validQuoteData.currency,
      validQuoteData.termsAndConditions,
      validQuoteData.timeframe,
    ]

    const compressedResultAttesterSignedQuote: Quote.CompressedQuoteAttesterSigned = [
      validQuoteData.attesterAddress,
      validQuoteData.cTypeHash,
      Quote.compressCost(validQuoteData.cost),
      validQuoteData.currency,
      validQuoteData.termsAndConditions,
      validQuoteData.timeframe,
      validAttesterSignedQuote.attesterSignature,
    ]

    const compressedResultQuoteAgreement: Quote.CompressedQuoteAgreed = [
      validQuoteData.attesterAddress,
      validQuoteData.cTypeHash,
      Quote.compressCost(validQuoteData.cost),
      validQuoteData.currency,
      validQuoteData.termsAndConditions,
      validQuoteData.timeframe,
      validAttesterSignedQuote.attesterSignature,
      quoteBothAgreed.claimerSignature,
      quoteBothAgreed.rootHash,
    ]

    expect(Quote.compressQuote(validQuoteData)).toEqual(compressedQuote)

    expect(Quote.decompressQuote(compressedQuote)).toEqual(validQuoteData)

    expect(Quote.compressAttesterSignedQuote(validAttesterSignedQuote)).toEqual(
      compressedResultAttesterSignedQuote
    )

    expect(
      Quote.decompressAttesterSignedQuote(compressedResultAttesterSignedQuote)
    ).toEqual(validAttesterSignedQuote)

    expect(Quote.compressQuoteAgreement(quoteBothAgreed)).toEqual(
      compressedResultQuoteAgreement
    )

    expect(
      Quote.decompressQuoteAgreement(compressedResultQuoteAgreement)
    ).toEqual(quoteBothAgreed)

    expect(Quote.compressQuote(validQuoteData)).not.toEqual(compressedQuote[3])

    expect(Quote.decompressQuote(compressedQuote)).not.toEqual(
      validQuoteData.termsAndConditions
    )

    expect(
      Quote.compressAttesterSignedQuote(validAttesterSignedQuote)
    ).not.toEqual(compressedResultAttesterSignedQuote[3])

    expect(
      Quote.decompressAttesterSignedQuote(compressedResultAttesterSignedQuote)
    ).not.toEqual(validAttesterSignedQuote.currency)

    expect(Quote.compressQuoteAgreement(quoteBothAgreed)).not.toEqual(
      compressedResultQuoteAgreement[2]
    )

    expect(
      Quote.decompressQuoteAgreement(compressedResultQuoteAgreement)
    ).not.toEqual(quoteBothAgreed.claimerSignature)
  })
  it('tests created quote data against given data', () => {
    expect(validQuoteData.attesterAddress).toEqual(attesterIdentity.address)
    expect(quoteBothAgreed.claimerSignature).toEqual(
      claimerIdentity.signStr(hashObjectAsStr(validAttesterSignedQuote))
    )
    expect(
      verify(
        hashObjectAsStr({
          attesterAddress: validQuoteData.attesterAddress,
          cTypeHash: validQuoteData.cTypeHash,
          cost: validQuoteData.cost,
          currency: validQuoteData.currency,
          timeframe: validQuoteData.timeframe,
          termsAndConditions: validQuoteData.termsAndConditions,
        }),
        validAttesterSignedQuote.attesterSignature,
        validAttesterSignedQuote.attesterAddress
      )
    ).toBeTruthy()
    expect(Quote.fromAttesterSignedInput(validAttesterSignedQuote)).toEqual(
      validAttesterSignedQuote
    )
    expect(
      Quote.fromQuoteDataAndIdentity(validQuoteData, attesterIdentity)
    ).toEqual(validAttesterSignedQuote)
  })
  it('validates created quotes against QuoteSchema', () => {
    expect(Quote.validateQuoteSchema(QuoteSchema, validQuoteData)).toBeTruthy()
    expect(Quote.validateQuoteSchema(QuoteSchema, invalidCostQuote)).toBeFalsy()
    expect(
      Quote.validateQuoteSchema(QuoteSchema, invalidPropertiesQuote)
    ).toBeFalsy()
  })
})
