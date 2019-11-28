import { offerSchema } from './CTypeSchema'
import { validateSchema } from './CTypeUtils'

describe('Claim', () => {
  const fakeOfferExample = {
    CTypeHash: '0xa3890sd9f08sg8df9s..',
    price: { netto: 233, tax: 23.3 },
    currency: 'Euro',
    TermsConditions: 'Lots of these',
    prerequisite: ['claim1Hash', 'claim2Hash'],
    offerTimeFrame: '3 days',
    Worktobedone: '3 days',
  }

  const offerExample = {
    CTypeHash: '0xa3890sd9f08sg8df9s..',
    price: {
      netto: 233,
      brutto: 23.3,
      tax: 23.3,
    },
    currency: 'Euro',
    TermsConditions: 'Lots of these',
    prerequisite: ['claim1Hash', 'claim2Hash'],
    offerTimeFrame: '3 days',
    Worktobedone: '3 days',
  }

  it('checking the schema', () => {
    const result = validateSchema(offerSchema, offerExample)
    console.log('This should return true', result)
    const fakeResult = validateSchema(offerSchema, fakeOfferExample)
    console.log('This should return false', fakeResult)
  })
})
