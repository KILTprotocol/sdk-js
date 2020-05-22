/**
 * @packageDocumentation
 * @module IPresentation
 */

import * as gabi from '@kiltprotocol/portablegabi'
import CType from '../ctype/CType'

export interface IPresentationReq {
  properties: string[]
  ctypeHash?: CType['hash']
  legitimations?: boolean
  delegation?: boolean
  requestUpdatedAfter?: Date
}

export interface IPartialRequest {
  ctype: CType['hash'] | null
  properties: string[]
}

export interface IVerifierSession {
  privacyEnhancement: gabi.CombinedVerificationSession
  requestedProperties: IPartialRequest[]
  allowedPrivacyEnhancement: boolean
}
