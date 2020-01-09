/**
 * @module TypeInterfaces/CType
 */
/**
 * Dummy comment needed for correct doc display, do not remove.
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
