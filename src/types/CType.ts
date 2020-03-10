/**
 * @packageDocumentation
 * @module ICType
 */
import IPublicIdentity from './PublicIdentity'

export interface ICTypeSchema {
  $id: string
  $schema: string
  properties: { [key: string]: { type: string; format?: string } }
  type: 'object'
}

export default interface ICType {
  hash: string
  owner: IPublicIdentity['address'] | null
  schema: ICTypeSchema
}
