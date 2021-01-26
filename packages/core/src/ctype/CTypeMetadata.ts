/**
 * @packageDocumentation
 * @module CTypeMetadata
 * @preferred
 */

import { ICTypeMetadata } from '@kiltprotocol/types'
import { ERROR_OBJECT_MALFORMED } from '../errorhandling/SDKErrors'
import CTypeUtils from './CType.utils'
import { MetadataModel } from './CTypeSchema'

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
      throw ERROR_OBJECT_MALFORMED()
    }
    this.metadata = metadata.metadata
    this.ctypeHash = metadata.ctypeHash
  }
}
