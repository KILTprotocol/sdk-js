/**
 * @packageDocumentation
 * @module CTypeMetadata
 */

import type { ICTypeMetadata } from '@kiltprotocol/types'
import { SDKErrors } from '@kiltprotocol/utils'
import CTypeUtils from './CType.utils'
import { MetadataModel } from './CTypeSchema'

export default class CTypeMetadata implements ICTypeMetadata {
  public ctypeHash: ICTypeMetadata['ctypeHash']
  public metadata: ICTypeMetadata['metadata']

  /**
   *  Instantiates a new CTypeMetadata.
   *
   * @param metadata [[ICTypeMetadata]] that is to be instantiated.
   * @throws [[ERROR_OBJECT_MALFORMED]] when metadata is not verifiable with the MetadataModel.
   * @returns The verified and instantiated [[CTypeMetadata]].
   */
  public constructor(metadata: ICTypeMetadata) {
    if (!CTypeUtils.verifySchema(metadata, MetadataModel)) {
      throw SDKErrors.ERROR_OBJECT_MALFORMED()
    }
    this.metadata = metadata.metadata
    this.ctypeHash = metadata.ctypeHash
  }
}
