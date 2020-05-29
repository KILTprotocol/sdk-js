import QuoteSchema from './QuoteSchema'
import {
  IQuote,
  ICostBreakdown,
  IQuoteAttesterSigned,
  IQuoteAgreement,
  CompressedQuote,
  CompressedQuoteAgreed,
  CompressedQuoteAttesterSigned,
} from '../types/Quote'
import Identity from '../identity/Identity'
import * as Quote from './Quote'
import QuoteUtils from './Quote.utils'
import CType from '../ctype/CType'
import ICType from '../types/CType'
import IClaim from '../types/Claim'
import RequestForAttestation from '../requestforattestation/RequestForAttestation'
import { verify, hashObjectAsStr } from '../crypto/Crypto'

describe('Claim', () => {
  let claimerIdentity: Identity
  let attesterIdentity: Identity
  let invalidCost: ICostBreakdown
  let date: Date
  let cType: ICType['schema']
  let fromRawCType: ICType
  let testCType: ICType
  let claim: IClaim
  let request: RequestForAttestation
  let invalidCostQuoteData: IQuote
  let invalidPropertiesQuoteData: IQuote
  let validQuoteData: IQuote
  let validAttesterSignedQuote: IQuoteAttesterSigned
  let quoteBothAgreed: IQuoteAgreement
  let invalidPropertiesQuote: IQuote
  let invalidCostQuote: IQuote
  let compressedQuote: CompressedQuote
  let compressedResultAttesterSignedQuote: CompressedQuoteAttesterSigned
  let compressedResultQuoteAgreement: CompressedQuoteAgreed

  beforeAll(async () => {
    claimerIdentity = await Identity.buildFromURI('//Alice')
    attesterIdentity = await Identity.buildFromURI('//Bob')
    invalidCost = { gross: 233, tax: { vat: 3.3 } } as ICostBreakdown
    date = new Date(2019, 11, 10)

    cType = {
      $id: 'http://example.com/ctype-1',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
      properties: {
        name: { type: 'string' },
      },
      type: 'object',
    }

    fromRawCType = {
      schema: cType,
      owner: claimerIdentity.getAddress(),
      hash: '',
    }

    testCType = CType.fromCType(fromRawCType)

    claim = {
      cTypeHash: testCType.hash,
      contents: {},
      owner: claimerIdentity.getAddress(),
    }

    // build request for attestation with legitimations
    request = (await RequestForAttestation.fromClaimAndIdentity(
      claim,
      claimerIdentity
    )).message

    invalidCostQuoteData = {
      cTypeHash: '0x12345678',
      cost: invalidCost,
      currency: 'Euro',
      timeframe: date,
      termsAndConditions: 'Lots of these',
    } as IQuote

    invalidPropertiesQuoteData = {
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

    validQuoteData = {
      attesterAddress: attesterIdentity.getAddress(),
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
    validAttesterSignedQuote = Quote.createAttesterSignature(
      validQuoteData,
      attesterIdentity
    )
    quoteBothAgreed = Quote.createQuoteAgreement(
      claimerIdentity,
      validAttesterSignedQuote,
      request.rootHash
    )
    invalidPropertiesQuote = invalidPropertiesQuoteData
    invalidCostQuote = invalidCostQuoteData

    compressedQuote = [
      validQuoteData.attesterAddress,
      validQuoteData.cTypeHash,
      [
        validQuoteData.cost.gross,
        validQuoteData.cost.net,
        validQuoteData.cost.tax,
      ],
      validQuoteData.currency,
      validQuoteData.termsAndConditions,
      validQuoteData.timeframe,
    ]

    compressedResultAttesterSignedQuote = [
      validQuoteData.attesterAddress,
      validQuoteData.cTypeHash,
      [
        validQuoteData.cost.gross,
        validQuoteData.cost.net,
        validQuoteData.cost.tax,
      ],
      validQuoteData.currency,
      validQuoteData.termsAndConditions,
      validQuoteData.timeframe,
      validAttesterSignedQuote.attesterSignature,
    ]

    compressedResultQuoteAgreement = [
      validQuoteData.attesterAddress,
      validQuoteData.cTypeHash,
      [
        validQuoteData.cost.gross,
        validQuoteData.cost.net,
        validQuoteData.cost.tax,
      ],
      validQuoteData.currency,
      validQuoteData.termsAndConditions,
      validQuoteData.timeframe,
      validAttesterSignedQuote.attesterSignature,
      quoteBothAgreed.claimerSignature,
      quoteBothAgreed.rootHash,
    ]
  })

  it('tests created quote data against given data', () => {
    expect(validQuoteData.attesterAddress).toEqual(
      attesterIdentity.getAddress()
    )
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

  it('compresses and decompresses the quote object', () => {
    expect(QuoteUtils.compressQuote(validQuoteData)).toEqual(compressedQuote)

    expect(QuoteUtils.decompressQuote(compressedQuote)).toEqual(validQuoteData)

    expect(
      QuoteUtils.compressAttesterSignedQuote(validAttesterSignedQuote)
    ).toEqual(compressedResultAttesterSignedQuote)

    expect(
      QuoteUtils.decompressAttesterSignedQuote(
        compressedResultAttesterSignedQuote
      )
    ).toEqual(validAttesterSignedQuote)

    expect(QuoteUtils.compressQuoteAgreement(quoteBothAgreed)).toEqual(
      compressedResultQuoteAgreement
    )

    expect(
      QuoteUtils.decompressQuoteAgreement(compressedResultQuoteAgreement)
    ).toEqual(quoteBothAgreed)
  })
  it('Negative test for compresses and decompresses the quote object', () => {
    delete validQuoteData.cTypeHash
    compressedQuote.pop()
    delete validAttesterSignedQuote.currency
    compressedResultAttesterSignedQuote.pop()
    delete quoteBothAgreed.currency
    compressedResultQuoteAgreement.pop()

    expect(() => {
      QuoteUtils.compressQuote(validQuoteData)
    }).toThrow()

    expect(() => {
      QuoteUtils.decompressQuote(compressedQuote)
    }).toThrow()

    expect(() => {
      QuoteUtils.compressAttesterSignedQuote(validAttesterSignedQuote)
    }).toThrow()

    expect(() => {
      QuoteUtils.decompressAttesterSignedQuote(
        compressedResultAttesterSignedQuote
      )
    }).toThrow()

    expect(() => {
      QuoteUtils.compressQuoteAgreement(quoteBothAgreed)
    }).toThrow()

    expect(() => {
      QuoteUtils.decompressQuoteAgreement(compressedResultQuoteAgreement)
    }).toThrow()
  })
})
