import { QuoteSchema } from './OfferSchema'
import { validateQuoteSchema } from '../ctype/CTypeUtils'

describe('Claim', () => {
  const fakeOfferExample = {
    cTypeHash: '0xa3890sd9f08sg8df9s..',
    cost: { netto: 233, tax: 23.3 },
    currency: 'Euro',
    termsAndConditions: 'Lots of these',
    prerequisite: ['claim1Hash', 'claim2Hash'],
    offerTimeFrame: '3 days',
  }

  const data = {
    attesterID: '0xa3890sd9f08sg8df9s',
    claimerAcceptance: true,
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

  it('checking the schema', () => {
    expect(validateQuoteSchema(data, QuoteSchema)).toBeTruthy()
    expect(validateQuoteSchema(QuoteSchema, fakeOfferExample)).toBeFalsy()
  })
})
