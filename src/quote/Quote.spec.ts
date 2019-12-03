import { QuoteSchema } from './OfferSchema'
import { validateQuoteSchema } from '../ctype/CTypeUtils'
import Quote from './Quote'
import { IQuote } from '../types/Offer'
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
    attesterID: identityAlice.address,
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
    expect(quote.attesterID).toEqual(identityAlice.address)
  })
  it('validating the offer schema', () => {
    expect(validateQuoteSchema(QuoteSchema, quoteData)).toBeTruthy()
    expect(validateQuoteSchema(QuoteSchema, fakeOfferExample)).toBeFalsy()
  })
})
