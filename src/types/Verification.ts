/**
 * @packageDocumentation
 * @module IPresentation
 */

import CType from '../ctype/CType'

export default interface IPresentationReq {
  properties: string[]
  ctypeHash: CType['hash']
  legitimations?: boolean
  delegation?: boolean
  requestUpdatedAfter?: Date
}
