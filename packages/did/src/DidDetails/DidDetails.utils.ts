/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { KeyRelationship } from '@kiltprotocol/types'
import { validateKiltDid } from '../Did.utils'
import type { DidCreationDetails } from '../types'

export function checkDidCreationDetails({
  did,
  keys,
  keyRelationships,
}: DidCreationDetails): void {
  validateKiltDid(did, false)
  const keyIds = new Set(Object.values(keys).map((key) => key.id))
  if (keyRelationships[KeyRelationship.authentication]?.length !== 1) {
    throw Error(
      `One and only one ${KeyRelationship.authentication} key is required on any instance of DidDetails`
    )
  }
  const allowedKeyRelationships: string[] = [
    ...Object.values(KeyRelationship),
    'none',
  ]
  Object.keys(keys).forEach((kr) => {
    if (!allowedKeyRelationships.includes(kr)) {
      throw Error(
        `key relationship ${kr} is not recognized. Allowed: ${KeyRelationship}`
      )
    }
  })
  const keyReferences = new Set<string>(
    Array.prototype.concat(...Object.values(keys))
  )
  keyReferences.forEach((id) => {
    if (!keyIds.has(id)) throw new Error(`No key with id ${id} in "keys"`)
  })
}
