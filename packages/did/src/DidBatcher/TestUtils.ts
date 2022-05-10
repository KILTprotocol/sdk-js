/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

// This module is not part of the public-facing api.
/* eslint-disable jsdoc/require-jsdoc */

import { blake2AsHex } from '@polkadot/util-crypto'
import type { DidKey } from '@kiltprotocol/types'

// Mock function to generate a key ID without having to rely on a real chain metadata.
export function computeKeyId(key: DidKey['publicKey']): DidKey['id'] {
  return `${blake2AsHex(key, 256)}`
}
