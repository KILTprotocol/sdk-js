import {
  CombinedRequestBuilder,
  CombinedVerificationSession,
} from '@kiltprotocol/portablegabi'
import CType from '../ctype/CType'
import { IRequestClaimsForCTypes, MessageBodyType } from '../messaging/Message'

export default class PresentationRequestBuilder {
  private builder: CombinedRequestBuilder
  private ctypes: Array<CType['hash']>
  constructor() {
    this.builder = new CombinedRequestBuilder()
    this.ctypes = []
  }

  public requestPresentationForCtype(
    ctypeHash: CType['hash'],
    attributes: string[],
    reqUpdatedAfter?: Date
  ): PresentationRequestBuilder {
    this.builder.requestPresentation({
      // FIXME: The gabi credential should contain the ctype
      // requestedAttributes: ['ctype', ...attributes.map(v => `contents.${v}`)],
      requestedAttributes: attributes.map(v => `contents.${v}`),
      reqUpdatedAfter,
    })
    this.ctypes.push(ctypeHash)
    return this
  }

  public async finalize(
    allowPE: boolean
  ): Promise<[CombinedVerificationSession, IRequestClaimsForCTypes]> {
    const { session, message } = await this.builder.finalise()
    return [
      session,
      {
        type: MessageBodyType.REQUEST_CLAIMS_FOR_CTYPES,
        content: {
          ctypes: this.ctypes,
          peRequest: message,
          allowPE,
        },
      },
    ]
  }
}
