import QuoteSchema from './QuoteSchema'
import { validateQuoteSchema } from '../ctype/CTypeUtils'
import Quote from './Quote'
import IQuote, { ICostBreakdown } from '../types/Quote'
import Identity from '../identity/Identity'

describe('Claim', () => {
  const identityAlice = Identity.buildFromURI('//Alice')
  const invalidCost = { gross: 233, tax: 23.3 } as ICostBreakdown
  const invalidQuoteData = {
    attesterAddress: identityAlice.address,
    cTypeHash: '0xa3890sd9f08sg8df9s..',
    cost: invalidCost,
    currency: 'Euro',
    quoteTimeframe: '3 days',
    termsAndConditions: 'Lots of these',
    version: '1.1.3',
  }

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
  const invalidQuote = new Quote(invalidQuoteData)

  it('tests created quote data against given data', () => {
    expect(validQuote).toEqual(validQuoteData)
    expect(validQuote.attesterAddress).toEqual(identityAlice.address)
  })
  it('validates created quotes against QuoteSchema', () => {
    expect(validateQuoteSchema(QuoteSchema, validQuote)).toBeTruthy()
    expect(validateQuoteSchema(QuoteSchema, invalidQuote)).toBeFalsy()
  })
})
