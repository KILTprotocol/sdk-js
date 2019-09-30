/**
 * @module TypeInterfaces/CType
 */
import IPublicIdentity from './PublicIdentity'

export interface ICTypeSchema {
  $id: string
  $schema: string
  properties: any
  type: 'object'
}

export interface ICtypeMetadata {
  title: {
    default: string
  }
  description: {
    default: string
  }
  properties: any
}

export default interface ICType {
  hash: string
  owner?: IPublicIdentity['address']
  schema: ICTypeSchema
  metadata: ICtypeMetadata
}

export interface ICTypeInput {
  $id: string
  $schema: string
  properties: object[]
  required: string[]
  title: string
  description?: string
  type: string
}
