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
import { hexToU8a } from '@polkadot/util'
import { base58Encode } from '@polkadot/util-crypto'
import type {
  JsonDidDocument,
  JsonLDDidDocument,
  PublicKeyRoleAssignment,
} from '../types'
import { generateCreateTx } from '../Did.chain'
import {
  computeKeyId,
  encodeDidPublicKey,
  getKiltDidFromIdentifier,
  getSignatureAlgForKeyType,
  getIdentifierFromKiltDid,
} from '../Did.utils'

// TODO: Should re-use (or move to a common package somewhere else) the definitions of vc-export
const KeyTypesMap = {
  // proposed and used by dock.io, e.g. https://github.com/w3c-ccg/security-vocab/issues/32, https://github.com/docknetwork/sdk/blob/9c818b03bfb4fdf144c20678169c7aad3935ad96/src/utils/vc/contexts/security_context.js
  sr25519: 'Sr25519VerificationKey2020',
  // these are part of current w3 security vocab, see e.g. https://www.w3.org/ns/did/v1
  ed25519: 'Ed25519VerificationKey2018',
  ecdsa: 'EcdsaSecp256k1VerificationKey2019',
  x25519: 'X25519KeyAgreementKey2019',
}

/**
 * Write on the KILT blockchain a new (full) DID with the provided details.
 *
 * @param didDetails The details of the new DID to write on chain.
 * @param signer The signer (a KILT account) to be used to sign the resulting operation.
 * @returns The signed extrinsic that can be submitted to the KILT blockchain to create the new DID.
 */
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

export function exportToDidDocument(
  details: IDidDetails,
  mimeType = 'application/json'
): JsonDidDocument | JsonLDDidDocument {
  if (!['application/json', 'application/json+ld'].includes(mimeType)) {
    throw Error(`Unsupported resolution mimeType ${mimeType}`)
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: any = {}

  result.id = details.did
  result.verificationMethod = new Array<string>()

  // Populate the `verificationMethod` array and then sets the `authentication` array with the key IDs (or undefined if no auth key is present - which should never happen)
  const authenticationKeysIds = details
    .getKeys(KeyRelationship.authentication)
    .map((authKey) => {
      result.verificationMethod.push({
        id: authKey.id,
        controller: details.did,
        type: KeyTypesMap[authKey.type],
        publicKeyBase58: base58Encode(hexToU8a(authKey.publicKeyHex)),
      })
      // Parse only the key ID from the complete key URI
      return authKey.id
    })
  result.authentication = authenticationKeysIds.length
    ? authenticationKeysIds
    : undefined

  const keyAgreementKeysIds = details
    .getKeys(KeyRelationship.keyAgreement)
    .map((keyAgrKey) => {
      result.verificationMethod.push({
        id: keyAgrKey.id,
        controller: details.did,
        type: KeyTypesMap[keyAgrKey.type],
        publicKeyBase58: base58Encode(hexToU8a(keyAgrKey.publicKeyHex)),
      })
      return keyAgrKey.id
    })
  result.keyAgreement = keyAgreementKeysIds.length
    ? keyAgreementKeysIds
    : undefined

  const assertionKeysIds = details
    .getKeys(KeyRelationship.assertionMethod)
    .map((assKey) => {
      result.verificationMethod.push({
        id: assKey.id,
        controller: details.did,
        type: KeyTypesMap[assKey.type],
        publicKeyBase58: base58Encode(hexToU8a(assKey.publicKeyHex)),
      })
      return assKey.id
    })
  result.assertionMethod = assertionKeysIds.length
    ? assertionKeysIds
    : undefined

  const delegationKeyIds = details
    .getKeys(KeyRelationship.capabilityDelegation)
    .map((delKey) => {
      result.verificationMethod.push({
        id: delKey.id,
        controller: details.did,
        type: KeyTypesMap[delKey.type],
        publicKeyBase58: base58Encode(hexToU8a(delKey.publicKeyHex)),
      })
      return delKey.id
    })
  result.capabilityDelegation = delegationKeyIds.length
    ? delegationKeyIds
    : undefined

  if (details.getServices().length) {
    result.service = details.getServices()
  }

  if (mimeType === 'application/json+ld') {
    result['@context'] = ['https://www.w3.org/ns/did/v1']
    return result as JsonLDDidDocument
  }
  return result as JsonDidDocument
}
