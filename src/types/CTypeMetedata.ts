/**
 * @module TypeInterfaces/CType
 */
/**
 * Dummy comment needed for correct doc display, do not remove.
 */
export default interface ICtypeMetadata {
  metadata: {
    $id: string
    $schema: string
    title: {
      type: string
    }
    description: {
      type: string
    }
    properties: object
    type: 'object'
  }
  ctypeHash: string
}
