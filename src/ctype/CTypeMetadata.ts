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

  /**
   *  Instantiates a new CTypeMetadata.
   *
   * @param metadata [[ICTypeMetadata]] that is to be instantiated.
   * @throws When metadata is not verifiable with the MetadataModel.
   * @returns The verified and instantiated CTypeMetadata.
   */
  public constructor(metadata: ICTypeMetadata) {
    if (!CTypeUtils.verifySchema(metadata, MetadataModel)) {
      throw new Error('CTypeMetadata does not correspond to schema')
    }
    this.metadata = metadata.metadata
    this.ctypeHash = metadata.ctypeHash
  }
}
