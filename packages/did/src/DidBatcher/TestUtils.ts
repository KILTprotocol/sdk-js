/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { DidKey } from '@kiltprotocol/types'

export function computeKeyId(key: DidKey['publicKey']): DidKey['id'] {
  return Array(key[0]).fill(32).toString()
}
