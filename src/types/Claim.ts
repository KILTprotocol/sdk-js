/**
 * @module TypeInterfaces/Claim
 */
/**
 * Dummy comment needed for correct doc display, do not remove.
 */
import ICType from './CType'
import IPublicIdentity from './PublicIdentity'

export default interface IClaim {
  cTypeHash: ICType['hash']
  contents: object
  owner: IPublicIdentity['address']
  metadata?: IClaimMetadata
}
export interface IClaimMetadata {
  title: {
    default: string
  }
  description: {
    default: string
  }
  properties: any
}
