/**
 * @module TypeInterfaces/CType
 */
/**
 * Dummy comment needed for correct doc display, do not remove.
 */
export default interface ICTypeMetadata {
  metadata: IMetadata
  ctypeHash: string
}

export interface IMetadata {
  title: {
    type: string
  }
  description?: {
    type: string
  }
  properties: object
}
