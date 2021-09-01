/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type {
  IDidDetails,
  IDidKeyDetails,
  KeystoreSigner,
  SubmittableExtrinsic,
} from '@kiltprotocol/types'
import { KeyRelationship } from '@kiltprotocol/types'
import { Crypto } from '@kiltprotocol/utils'
import type { TypeRegistry } from '@polkadot/types'
import type { PublicKeyRoleAssignment } from '../types'
import { generateCreateTx } from '../Did.chain'
import {
  computeKeyId,
  encodeDidPublicKey,
  getKiltDidFromIdentifier,
  getSignatureAlgForKeyType,
  getIdentifierFromKiltDid,
} from '../Did.utils'

export async function writeNewDidFromDidDetails(
  didDetails: IDidDetails,
  signer: KeystoreSigner
): Promise<SubmittableExtrinsic> {
  const [signingKey] = didDetails.getKeys(KeyRelationship.authentication)
  const [assertionMethod] = didDetails.getKeys(KeyRelationship.assertionMethod)
  const [delegation] = didDetails.getKeys(KeyRelationship.capabilityDelegation)
  const [keyAgreement] = didDetails.getKeys(KeyRelationship.keyAgreement)

  const keys: PublicKeyRoleAssignment = {
    [KeyRelationship.assertionMethod]: {
      ...assertionMethod,
      publicKey: Crypto.coToUInt8(assertionMethod.publicKeyHex),
    },
    [KeyRelationship.capabilityDelegation]: {
      ...delegation,
      publicKey: Crypto.coToUInt8(delegation.publicKeyHex),
    },
    [KeyRelationship.keyAgreement]: {
      ...keyAgreement,
      publicKey: Crypto.coToUInt8(keyAgreement.publicKeyHex),
    },
  }
  return generateCreateTx({
    signer,
    signingPublicKey: signingKey.publicKeyHex,
    alg: getSignatureAlgForKeyType(signingKey.type),
    didIdentifier: getIdentifierFromKiltDid(didDetails.did),
    keys,
  })
}

/**
 * A tool to predict public key details if a given key would be added to an on-chain DID.
 * Especially handy for predicting the key id or for deriving which DID may be claimed with a
 * given authentication key.
 *
 * @param typeRegistry A TypeRegistry instance to which @kiltprotocol/types have been registered.
 * @param publicKey The public key in hex or U8a encoding.
 * @param type The [[CHAIN_SUPPORTED_KEY_TYPES]] variant indicating the key type.
 * @param controller Optionally, set the the DID to which this key would be added.
 * If left blank, the controller DID is inferred from the public key, mimicing the link between a new
 * DID and its authentication key.
 * @returns The [[IDidKeyDetails]] including key id, controller, type, and the public key hex encoded.
 */
export function deriveDidPublicKey<T extends string>(
  typeRegistry: TypeRegistry,
  publicKey: string | Uint8Array,
  type: T,
  controller?: string
): IDidKeyDetails<T> {
  const publicKeyHex =
    typeof publicKey === 'string' ? publicKey : Crypto.u8aToHex(publicKey)
  const publicKeyU8a =
    publicKey instanceof Uint8Array ? publicKey : Crypto.coToUInt8(publicKey)
  const keyIdentifier = computeKeyId(
    encodeDidPublicKey(typeRegistry, { publicKey: publicKeyU8a, type })
  )
  const did =
    controller ||
    getKiltDidFromIdentifier(Crypto.encodeAddress(publicKeyU8a, 38), 'full')
  return {
    id: `${did}#${keyIdentifier}`,
    controller: did,
    type,
    publicKeyHex,
  }
}
