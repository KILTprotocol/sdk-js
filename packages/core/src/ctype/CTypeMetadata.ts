/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { ICTypeMetadata } from '@kiltprotocol/types'
import { SDKErrors } from '@kiltprotocol/utils'
import * as CTypeUtils from './CType.utils.js'
import { MetadataModel } from './CTypeSchema.js'

export class CTypeMetadata implements ICTypeMetadata {
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
      throw new SDKErrors.ERROR_OBJECT_MALFORMED()
    }
    this.metadata = metadata.metadata
    this.ctypeHash = metadata.ctypeHash
  }
}
