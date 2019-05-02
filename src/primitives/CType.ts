import IPublicIdentity from './PublicIdentity'

export interface ICTypeSchema {
  $id: any
  $schema: any
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
  hash?: string
  owner?: IPublicIdentity['address']
  schema: ICTypeSchema
  metadata: ICtypeMetadata
}
