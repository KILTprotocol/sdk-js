/**
 * @module TypeInterfaces/CType
 */
/**
 * Dummy comment needed for correct doc display, do not remove.
 */
import IPublicIdentity from './PublicIdentity'

export interface ICTypeSchema {
  $id: any
  $schema: any
  properties: any
  type: 'object'
}

export default interface ICType {
  hash: string
  owner?: IPublicIdentity['address']
  schema: ICTypeSchema
}
