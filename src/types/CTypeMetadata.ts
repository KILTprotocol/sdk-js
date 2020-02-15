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
  }
  description?: {
    default: string
  }
  properties: object
}
