/**
 * @module TypeInterfaces/Claim
 */
/**
 * Dummy comment needed for correct doc display, do not remove.
 */
import ICType, { ICtypeMetadata } from './CType'
import IPublicIdentity from './PublicIdentity'

export default interface IClaim {
  cType: ICType['hash']
  contents: object
  owner: IPublicIdentity['address']
  metadata?: ICtypeMetadata
}
