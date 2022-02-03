/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @packageDocumentation
 * @module CTypeMetadata
 */

import type { ICTypeMetadata } from '@kiltprotocol/types'
import { SDKErrors } from '@kiltprotocol/utils'
import * as CTypeUtils from './CType.utils.js'
import { MetadataModel } from './CTypeSchema.js'

/**
 *  Checks a CTypeMetadata object.
 *
 * @param metadata [[ICTypeMetadata]] that is to be instantiated.
 * @throws [[ERROR_OBJECT_MALFORMED]] when metadata is not verifiable with the MetadataModel.
 */
export function check(metadata: ICTypeMetadata): void {
  if (!CTypeUtils.verifySchema(metadata, MetadataModel)) {
    throw SDKErrors.ERROR_OBJECT_MALFORMED()
  }
}
