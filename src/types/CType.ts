/**
 * @module TypeInterfaces/CType
 */
/**
 * Dummy comment needed for correct doc display, do not remove.
 */
import IPublicIdentity from './PublicIdentity'

export interface ICTypeSchema {
  $id: string
  $schema: string
  properties: object // TO DO: need to refine what properties are
  type: 'object'
}

export interface ICtypeMetadata {
  title: {
    default: string
  }
  description: {
    default: string
  }
  properties: object // TO DO: need to refine what properties are
}

export default interface ICType {
  hash: string
  owner?: IPublicIdentity['address']
  schema: ICTypeSchema
  metadata: ICtypeMetadata
}
