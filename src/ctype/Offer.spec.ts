import { offerSchema } from './CTypeSchema'
import { validateSchema } from './CTypeUtils'

describe('Claim', () => {
  const fakeOfferExample = {
    CTypeHash: '0xa3890sd9f08sg8df9s..',
    cost: { netto: 233, tax: 23.3 },
    currency: 'Euro',
    TermsConditions: 'Lots of these',
    prerequisite: ['claim1Hash', 'claim2Hash'],
    offerTimeFrame: '3 days',
  }

  const offerExample = {
    CTypeHash: '0xa3890sd9f08sg8df9s..',
    cost: {
      netto: 233,
      brutto: 23.3,
      tax: 23.3,
    },
    currency: 'Euro',
    TermsConditions: 'Lots of these',
    prerequisite: ['claim1Hash', 'claim2Hash'],
    offerTimeFrame: '3 days',
  }

  it('checking the schema', () => {
    expect(validateSchema(offerSchema, offerExample)).toBeTruthy()
    expect(validateSchema(offerSchema, fakeOfferExample)).toBeFalsy()
  })
})
