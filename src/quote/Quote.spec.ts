import QuoteSchema from './QuoteSchema'
import IQuote, { ICostBreakdown } from '../types/Quote'
import Identity from '../identity/Identity'
import Quote from './Quote'

describe('Claim', () => {
  const identityAlice = Identity.buildFromURI('//Alice')
  const invalidCost = { gross: 233, tax: 23.3 } as ICostBreakdown
  const invalidCostQuoteData = {
    attesterAddress: identityAlice.address,
    cTypeHash: '0xa3890sd9f08sg8df9s..',
    cost: invalidCost,
    currency: 'Euro',
    quoteTimeframe: '3 days',
    termsAndConditions: 'Lots of these',
    version: '1.1.3',
  } as IQuote

  const invalidPropertiesQuoteData = {
    attesterAddress: identityAlice.address,
    cTypeHash: '0xa3890sd9f08sg8df9s..',
    cost: {
      gross: 233,
      net: 23.3,
      tax: 23.3,
    },
    currency: 'Euro',
    quoteTimeframe: '3 days',
    termsAndConditions: 'Lots of these',
  } as IQuote

  const validQuoteData: IQuote = {
    attesterAddress: identityAlice.address,
    cTypeHash: '0xa3890sd9f08sg8df9s..',
    cost: {
      gross: 233,
      net: 23.3,
      tax: 23.3,
    },
    currency: 'Euro',
    quoteTimeframe: '3 days',
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
