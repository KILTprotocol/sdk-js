/**
 * @packageDocumentation
 * @module CTypeMetadata
 * @preferred
 */

import ICTypeMetadata from '../types/CTypeMetadata'
import { MetadataModel } from './CTypeSchema'
import CTypeUtils from './CType.utils'

export default class CTypeMetadata implements ICTypeMetadata {
  public ctypeHash: ICTypeMetadata['ctypeHash']
  public metadata: ICTypeMetadata['metadata']

  public constructor(metadata: ICTypeMetadata) {
    if (!CTypeUtils.verifySchema(metadata, MetadataModel)) {
      throw new Error('CTypeMetadata does not correspond to schema')
    }
    this.metadata = metadata.metadata
    this.ctypeHash = metadata.ctypeHash
  }
}
