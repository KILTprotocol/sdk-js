import { ITerms, IQuote } from '../types/Offer'
import { validateTermsSchema } from '../ctype/CTypeUtils'
import { TermsSchema } from './OfferSchema'

export default class Terms implements ITerms {
  public static fromTerms(termsInput: Terms, quoteInput: IQuote): Terms {
    if (!validateTermsSchema(TermsSchema, termsInput)) {
      console.log('ERRRO!')
      throw new Error('Quote does not correspond to schema')
    }
    console.log('checking')
    return new Terms(termsInput, quoteInput)
  }

  public claim: ITerms['claim']
  public legitimations: ITerms['legitimations']
  public delegationId?: ITerms['delegationId']
  public quote?: IQuote | undefined
  public prerequisiteClaims?: ITerms['prerequisiteClaims']

  public constructor(termsInput: Terms, quoteInput: IQuote) {
    this.claim = termsInput.claim
    this.legitimations = termsInput.legitimations
    this.delegationId = termsInput.delegationId
    this.quote = quoteInput
    this.prerequisiteClaims = termsInput.prerequisiteClaims
  }
}
