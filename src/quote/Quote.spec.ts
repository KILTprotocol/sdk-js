import QuoteSchema from './QuoteSchema'
import { validateQuoteSchema } from '../ctype/CTypeUtils'
import Quote from './Quote'
import IQuote from '../types/Quote'
import Identity from '../identity/Identity'

describe('Claim', () => {
  const identityAlice = Identity.buildFromURI('//Alice')
  const fakeOfferExample = {
    cTypeHash: '0xa3890sd9f08sg8df9s..',
    cost: { netto: 233, tax: 23.3 },
    currency: 'Euro',
    termsAndConditions: 'Lots of these',
    offerTimeFrame: '3 days',
  }

  const quoteData = {
    attesterAddress: identityAlice.address,
    cTypeHash: '0xa3890sd9f08sg8df9s..',
    cost: {
      gross: 233,
      net: 23.3,
      tax: 23.3,
    },
    currency: 'Euro',
    offerTimeframe: '3 days',
    termsAndConditions: 'Lots of these',
    version: '1.1.3',
  }
  const quote = new Quote(quoteData as IQuote)

  it('creating a new quote', () => {
    expect(quote).toEqual(quoteData)
    expect(quote.attesterAddress).toEqual(identityAlice.address)
  })
  it('validating the offer schema', () => {
    expect(validateQuoteSchema(QuoteSchema, quoteData)).toBeTruthy()
    expect(validateQuoteSchema(QuoteSchema, fakeOfferExample)).toBeFalsy()
  })
})
