/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { SDKErrors } from '@kiltprotocol/utils'
import { KeyRelationship, VerificationKeyType } from '@kiltprotocol/types'

import type { DidCreationDetails } from '../types.js'
import { validateKiltDid } from '../Did.utils.js'

export function checkDidCreationDetails({
  did,
  keys,
  keyRelationships,
}: DidCreationDetails): void {
  validateKiltDid(did, false)
  if (keyRelationships[KeyRelationship.authentication]?.size !== 1) {
    throw Error(
      `One and only one ${KeyRelationship.authentication} key is required on any instance of DidDetails`
    )
  }
  const allowedKeyRelationships: Set<string> = new Set([
    ...Object.values(KeyRelationship),
    'none',
  ])
  Object.keys(keyRelationships).forEach((keyRel) => {
    if (!allowedKeyRelationships.has(keyRel)) {
      throw Error(
        `key relationship ${keyRel} is not recognized. Allowed: ${KeyRelationship}`
      )
    }
  })
  const keyIds = new Set<string>(Object.keys(keys))
  const keyReferences = new Set<string>()

  // TODO: Find a more efficient way to populate the keyReferences set
  Object.values(keyRelationships).forEach((keysRel) => {
    keysRel.forEach((keyRel) => {
      keyReferences.add(keyRel)
    })
  })
  keyReferences.forEach((id) => {
    if (!keyIds.has(id))
      throw SDKErrors.ERROR_DID_ERROR(`No key with id ${id} in "keys"`)
  })
}

const signatureAlgForKeyType: Record<VerificationKeyType, string> = {
  [VerificationKeyType.ed25519]: 'ed25519',
  [VerificationKeyType.sr25519]: 'sr25519',
  [VerificationKeyType.ecdsa]: 'ecdsa-secp256k1',
}

export function getSignatureAlgForKeyType(
  keyType: VerificationKeyType
): string | undefined {
  return signatureAlgForKeyType[keyType]
}
