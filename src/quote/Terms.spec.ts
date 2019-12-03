import RequestForAttestation from '../requestforattestation/RequestForAttestation'
import { ITerms, IQuote } from '../types/Offer'
import Identity from '../identity/Identity'
import Quote from './Quote'
import Terms from './Terms'
import AttestedClaim from '../attestedclaim/AttestedClaim'
import CType from '../ctype/CType'
import ICType from '../types/CType'
import IClaim from '../types/Claim'

function buildRequestForAttestation(
  claimer: Identity,
  ctype: string,
  contents: object,
  legitimations: AttestedClaim[]
): RequestForAttestation {
  // create claim
  const contentsCopy = contents
  const testCType: CType = CType.fromCType({
    schema: {
      $id: 'http://example.com/ctype-1',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
      properties: {
        name: { type: 'string' },
      },
      type: 'object',
    },
    metadata: {
      title: { default: 'CType Title' },
      description: {},
      properties: {
        name: { title: { default: 'Name' } },
      },
    },
  } as ICType)
  const claim = {
    cTypeHash: testCType.hash,
    contents: contentsCopy,
    owner: claimer.address,
  } as IClaim
  // build request for attestation with legimitations
  return RequestForAttestation.fromClaimAndIdentity(
    claim,
    claimer,
    legitimations,
    null
  )
}

describe('Claim', () => {
  const identityAlice = Identity.buildFromURI('//Alice')

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
  const newQuote = new Quote(quoteData as IQuote)

  const legitimationRequest: RequestForAttestation = buildRequestForAttestation(
    identityAlice,
    'legitimationCtype',
    {},
    []
  )

  const terms = {
    claim: '0xa3890sd9f08sg8df9s',
    legitimations: ['legitimationRequest', legitimationRequest],
    quote: newQuote,
    prerequisiteClaims: ['0xa3890sd9f08sg8df9s', '0xa3890sd9f08sg8df9s'],
  }

  const submitTerm = new Terms(terms as ITerms)

  it('submitting terms to an Attester', () => {
    expect(submitTerm).toEqual(terms)
  })
})
