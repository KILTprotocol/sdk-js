/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { RegistryTypes } from '@polkadot/types/types'

/**
 * Removes parts of the type definition without altering the original object.
 *
 * @param oldTypes The old types that should be updated.
 * @param newTypes The new types that will be merged with the old types. Types with the same key will be overwritten by the new types.
 * @param deleteKeys Keys that will get removed from the new and old types.
 * @returns The adjusted types.
 */
export function mergeType(
  oldTypes: RegistryTypes,
  newTypes: RegistryTypes,
  deleteKeys: string[]
): RegistryTypes {
  const adjustedTypes = { ...oldTypes, ...newTypes }
  deleteKeys.forEach((key) => {
    delete adjustedTypes[key]
  })
  return adjustedTypes
}
