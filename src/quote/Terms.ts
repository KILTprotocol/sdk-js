import { ITerms, IQuote } from '../types/Offer'

export default class Terms implements ITerms {
  public claim: ITerms['claim']
  public legitimations: ITerms['legitimations']
  public delegationId?: ITerms['delegationId']
  public quote?: IQuote | undefined
  public prerequisiteClaims?: ITerms['prerequisiteClaims']

  public constructor(termsInput: Terms) {
    this.claim = termsInput.claim
    this.legitimations = termsInput.legitimations
    this.delegationId = termsInput.delegationId
    this.quote = termsInput.quote
    this.prerequisiteClaims = termsInput.prerequisiteClaims
  }
}
