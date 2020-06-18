/**
 * @packageDocumentation
 * @module CTypeMetadata
 * @preferred
 */

import ICTypeMetadata from '../types/CTypeMetadata'
import { MetadataModel } from './CTypeSchema'
import CTypeUtils from './CType.utils'
import { ERROR_OBJECT_MALFORMED } from '../errorhandling/ObjectErrors'

export default class CTypeMetadata implements ICTypeMetadata {
  public ctypeHash: ICTypeMetadata['ctypeHash']
  public metadata: ICTypeMetadata['metadata']

  /**
   *  Instantiates a new CTypeMetadata.
   *
   * @param metadata [[ICTypeMetadata]] that is to be instantiated.
   * @throws When metadata is not verifiable with the MetadataModel.
   * @throws [[ERROR_OBJECT_MALFORMED]].
   * @returns The verified and instantiated CTypeMetadata.
   */
  public constructor(metadata: ICTypeMetadata) {
    if (!CTypeUtils.verifySchema(metadata, MetadataModel)) {
      throw ERROR_OBJECT_MALFORMED
    }
    this.metadata = metadata.metadata
    this.ctypeHash = metadata.ctypeHash
  }
}
