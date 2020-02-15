/**
 * @packageDocumentation
 * @module ICType
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
  owner: IPublicIdentity['address'] | null
  schema: ICTypeSchema
}
