import QuoteSchema from './QuoteSchema'
import IQuote, { ICostBreakdown } from '../types/Quote'
import Identity from '../identity/Identity'
import Quote from './Quote'

describe('Claim', () => {
  const identityAlice = Identity.buildFromURI('//Alice')
  const invalidCost = { gross: 233, tax: 23.3 } as ICostBreakdown
  const date = new Date(2019, 11, 10)

  const invalidCostQuoteData = {
    attesterAddress: identityAlice.address,
    cTypeHash:
      '0xa8c5bdb22aaea3fceb5467d37169cbe49c71f226233037537e70a32a032304ff',
    cost: invalidCost,
    currency: 'Euro',
    quoteTimeframe: date,
    termsAndConditions: 'Lots of these',
    version: '1.1.3',
  } as IQuote

  const invalidPropertiesQuoteData = {
    attesterAddress: identityAlice.address,
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
    attesterAddress: identityAlice.address,
    cTypeHash:
      '0xa8c5bdb22aaea3fceb5467d37169cbe49c71f226233037537e70a32a032304ff',
    cost: {
      gross: 233,
      net: 23.3,
      tax: 23.3,
    },
    currency: 'Euro',
    quoteTimeframe: date,
    termsAndConditions: 'Lots of these',
    version: '1.1.3',
  }
  const validQuote = new Quote(validQuoteData)
  const invalidPropertiesQuote = new Quote(invalidPropertiesQuoteData)
  const invalidCostQuote = new Quote(invalidCostQuoteData)

  it('tests created quote data against given data', () => {
    expect(validQuote).toEqual(validQuoteData)
    expect(validQuote.attesterAddress).toEqual(identityAlice.address)
  })
  it('validates created quotes against QuoteSchema', () => {
    expect(Quote.validateQuoteSchema(QuoteSchema, validQuote)).toBeTruthy()
    expect(Quote.validateQuoteSchema(QuoteSchema, invalidCostQuote)).toBeFalsy()
    expect(
      Quote.validateQuoteSchema(QuoteSchema, invalidPropertiesQuote)
    ).toBeFalsy()
  })
})
