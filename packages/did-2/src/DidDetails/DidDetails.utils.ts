/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { KeyRelationship } from '@kiltprotocol/types'
import { validateKiltDid } from '../Did.utils'
import { DidCreationDetails } from './DidDetails'

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
  const allowedKeyRelationships: string[] = [
    ...Object.values(KeyRelationship),
    'none',
  ]
  Object.keys(keyRelationships).forEach((kr) => {
    if (!allowedKeyRelationships.includes(kr)) {
      throw Error(
        `key relationship ${kr} is not recognized. Allowed: ${KeyRelationship}`
      )
    }
  })
  // TODO: check from here for the logic
  const keyIds = new Set(keys.keys())
  keyReferences.forEach((id) => {
    if (!keyIds.has(id)) throw new Error(`No key with id ${id} in "keys"`)
  })
}

enum CHAIN_SUPPORTED_SIGNATURE_KEY_TYPES {
  ed25519 = 'ed25519',
  sr25519 = 'sr25519',
  secp256k1 = 'secp256k1',
}

const signatureAlgForKeyType = {
  [CHAIN_SUPPORTED_SIGNATURE_KEY_TYPES.ed25519]: 'ed25519',
  [CHAIN_SUPPORTED_SIGNATURE_KEY_TYPES.sr25519]: 'sr25519',
  [CHAIN_SUPPORTED_SIGNATURE_KEY_TYPES.secp256k1]: 'ecdsa-secp256k1',
}

export function getSignatureAlgForKeyType(keyType: string): string | undefined {
  return signatureAlgForKeyType[keyType]
}
