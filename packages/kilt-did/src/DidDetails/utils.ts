/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { ApiPromise } from '@polkadot/api'
import type { Extrinsic } from '@polkadot/types/interfaces'
import { TypeRegistry } from '@polkadot/types'
import type {
  ApiOrMetadata,
  CallMeta,
  IDidDetails,
  IDidKeyDetails,
  KeystoreSigner,
  SubmittableExtrinsic,
  VerificationKeyRelationship,
} from '@kiltprotocol/types'
import { KeyRelationship } from '@kiltprotocol/types'
import { Crypto } from '@kiltprotocol/utils'
import { BN } from '@polkadot/util'
import { DidDetails, MapKeyToRelationship } from './DidDetails'
import { PublicKeyRoleAssignment } from '../types'
import { DidChain, DidUtils } from '..'
import {
  computeKeyId,
  encodeDidPublicKey,
  getKiltDidFromIdentifier,
  getSignatureAlgForKeyType,
} from '../Did.utils'

interface MethodMapping<V extends string> {
  default: V
  [section: string]: V
}

type SectionMapping<V extends string> = Record<string, MethodMapping<V>>

// Call::Attestation(_) => Some(did::DidVerificationKeyRelationship::AssertionMethod),
// Call::Ctype(_) => Some(did::DidVerificationKeyRelationship::AssertionMethod),
// Call::Delegation(_) => Some(did::DidVerificationKeyRelationship::CapabilityDelegation),
const mapping: SectionMapping<
  VerificationKeyRelationship | 'paymentAccount'
> = {
  attestation: { default: KeyRelationship.assertionMethod },
  ctype: { default: KeyRelationship.assertionMethod },
  delegation: { default: KeyRelationship.capabilityDelegation },
  did: {
    default: KeyRelationship.authentication,
    create: 'paymentAccount',
    submitDidCall: 'paymentAccount',
  },
  default: { default: 'paymentAccount' },
}

// internally maps call.section & call.method to a key relationship - or indicates a payment account (substrate key holding tokens) must be used
export function mapCallToKeyRelationship(
  call: CallMeta
): VerificationKeyRelationship | 'paymentAccount' {
  const { section, method } = call
  const methodData = mapping[section] || mapping.default
  return methodData[method] || methodData.default
}

function isApiPromise(api: unknown): api is ApiPromise {
  return (api as ApiPromise).type === 'promise'
}

export function extrinsicToCallMeta(
  apiOrMetadata: ApiOrMetadata,
  extrinsic: Extrinsic
): CallMeta {
  if (isApiPromise(apiOrMetadata)) {
    return apiOrMetadata.findCall(extrinsic.callIndex)
  }
  const registry = new TypeRegistry()
  registry.setMetadata(apiOrMetadata)
  return registry.findMetaCall(extrinsic.callIndex)
}

// to recover Call info from an Extrinsic/SubmittableExtrinsic, we need the chain's metadata, which we can also get from the api object
export function mapExtrinsicToKeyRelationship(
  apiOrMetadata: ApiOrMetadata,
  extrinsic: Extrinsic
): VerificationKeyRelationship | 'paymentAccount' {
  const callMeta = extrinsicToCallMeta(apiOrMetadata, extrinsic)
  return mapCallToKeyRelationship(callMeta)
}

// the above can be used to query key info from the did info object
export function getKeysForCall(
  didDetails: IDidDetails,
  call: CallMeta
): IDidKeyDetails[] {
  const keyRelationship = mapCallToKeyRelationship(call)
  if (keyRelationship === 'paymentAccount') return []
  return didDetails.getKeys(keyRelationship)
}

export function getKeysForExtrinsic(
  apiOrMetadata: ApiOrMetadata,
  didDetails: IDidDetails,
  extrinsic: Extrinsic
): IDidKeyDetails[] {
  const callMeta = extrinsicToCallMeta(apiOrMetadata, extrinsic)
  return getKeysForCall(didDetails, callMeta)
}

export function getKeyIdsForCall(
  didDetails: IDidDetails,
  call: CallMeta
): Array<IDidKeyDetails['id']> {
  return getKeysForCall(didDetails, call).map((key) => key.id)
}

export function getKeyIdsForExtrinsic(
  apiOrMetadata: ApiOrMetadata,
  didDetails: IDidDetails,
  extrinsic: Extrinsic
): Array<IDidKeyDetails['id']> {
  const callMeta = extrinsicToCallMeta(apiOrMetadata, extrinsic)
  return getKeyIdsForCall(didDetails, callMeta)
}

export function newDidDetailsfromKeys(
  keys: Partial<Record<KeyRelationship, IDidKeyDetails>> & {
    [KeyRelationship.authentication]: IDidKeyDetails
  }
): DidDetails {
  const did = keys[KeyRelationship.authentication].controller
  const allKeys: IDidKeyDetails[] = []
  const keyRelationships: MapKeyToRelationship = {}
  Object.entries(keys).forEach(([thisRole, thisKey]) => {
    if (thisKey) {
      keyRelationships[thisRole] = [thisKey.id]
      allKeys.push(thisKey)
    }
  })
  return new DidDetails({
    did,
    keys: allKeys,
    keyRelationships,
    lastTxIndex: new BN(0),
  })
}

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
  return DidChain.generateCreateTx({
    signer,
    signingPublicKey: signingKey.publicKeyHex,
    alg: getSignatureAlgForKeyType(signingKey.type),
    didIdentifier: DidUtils.getIdentifierFromKiltDid(didDetails.did),
    keys,
  })
}

export async function signWithKey(
  toSign: Uint8Array | string,
  key: IDidKeyDetails,
  signer: KeystoreSigner
): Promise<{ keyId: string; alg: string; signature: Uint8Array }> {
  const alg = getSignatureAlgForKeyType(key.type)
  const { data: signature } = await signer.sign({
    publicKey: Crypto.coToUInt8(key.publicKeyHex),
    alg,
    data: Crypto.coToUInt8(toSign),
  })
  return { keyId: key.id, signature, alg }
}

export async function signWithDid(
  toSign: Uint8Array | string,
  did: IDidDetails,
  signer: KeystoreSigner,
  whichKey: KeyRelationship | IDidKeyDetails['id']
): Promise<{ keyId: string; alg: string; signature: Uint8Array }> {
  let key: IDidKeyDetails | undefined
  if (Object.values(KeyRelationship).includes(whichKey as KeyRelationship)) {
    ;[key] = did.getKeys(KeyRelationship.authentication)
  } else {
    key = did.getKey(whichKey)
  }
  if (!key) {
    throw Error(`failed to find key on DidDetails (${did.did}): ${whichKey}`)
  }
  return signWithKey(toSign, key, signer)
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
    getKiltDidFromIdentifier(Crypto.encodeAddress(publicKeyU8a, 38))
  return {
    id: `${did}#${keyIdentifier}`,
    controller: did,
    type,
    publicKeyHex,
  }
}
