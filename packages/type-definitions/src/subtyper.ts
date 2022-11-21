/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { RegistryTypes } from '@polkadot/types/types'

/**
 * Removes parts of the type definition without altering the original object.
 *
 * @param types The types that should be changed.
 * @param keys The keys that should get removed.
 * @returns The adjusted types.
 */
export function subtype(types: RegistryTypes, keys: string[]): RegistryTypes {
  const adjustedTypes = { ...types }
  keys.forEach((key) => {
    delete adjustedTypes[key]
  })
  return adjustedTypes
}
