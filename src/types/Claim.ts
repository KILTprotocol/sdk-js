/**
 * @module TypeInterfaces/Claim
 */
/**
 * Dummy comment needed for correct doc display, do not remove.
 */
import ICType from './CType'
import IPublicIdentity from './PublicIdentity'

export default interface IClaim {
  cType: ICType['hash']
  contents: object // Need to add something more meaningful
  owner: IPublicIdentity['address']
}

export interface IClaimInput {
  $id: string
  $schema: string
  properties: object
  required: string[]
  title: string
  description?: string
  type: string
}
