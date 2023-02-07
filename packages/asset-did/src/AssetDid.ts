/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { AssetDidUri } from '@kiltprotocol/types'

import { resolve } from './Resolver.js'

/**
 * Checks that a string (or other input) is a valid AssetDID uri.
 * Throws otherwise.
 *
 * @param input Arbitrary input.
 */
export function validateUri(input: unknown): void {
  if (typeof input !== 'string') {
    throw new TypeError(`Asset DID string expected, got ${typeof input}`)
  }

  resolve(input as AssetDidUri)
}
