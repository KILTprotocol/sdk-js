/**
 * @packageDocumentation
 * @module ICTypeMetadata
 */
export default interface ICTypeMetadata {
  metadata: IMetadata
  ctypeHash: string | null
}

export interface IMetadata {
  title: {
    default: string
    [key: string]: string
  }
  description: {
    default: string
    [key: string]: string
  }
  properties?: IMetadataProperties
}

export type IMetadataProperties = {
  [key: string]: { title: { default: string; [key: string]: string } }
}
