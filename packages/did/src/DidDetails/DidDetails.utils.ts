/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

// This module is not part of the public-facing api.
/* eslint-disable jsdoc/require-jsdoc */

import { SDKErrors } from '@kiltprotocol/utils'
import { keyRelationships as allKeyRelationships } from '@kiltprotocol/types'

import type { DidConstructorDetails } from '../types.js'
import { validateKiltDidUri } from '../Did.utils.js'

export function checkDidCreationDetails({
  uri,
  keys,
  keyRelationships,
}: DidConstructorDetails): void {
  validateKiltDidUri(uri, false)
  if (keyRelationships.authentication?.size !== 1) {
    throw Error(
      `One and only one ${'authentication'} key is required on any instance of DidDetails`
    )
  }
  const allowedKeyRelationships = new Set([...allKeyRelationships, 'none'])
  Object.keys(keyRelationships).forEach((keyRel) => {
    if (!allowedKeyRelationships.has(keyRel)) {
      throw Error(
        `key relationship ${keyRel} is not recognized. Allowed: ${allKeyRelationships}`
      )
    }
  })

  const providedIds = new Set(Object.keys(keys))
  const allIds = Object.values(keyRelationships).flatMap((ids) => [
    ...ids.values(),
  ])

  allIds.forEach((id) => {
    if (!providedIds.has(id))
      throw new SDKErrors.ERROR_DID_ERROR(`No key with id ${id} in "keys"`)
  })
}
