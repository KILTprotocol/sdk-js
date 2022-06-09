/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { SubmittableExtrinsic } from '@polkadot/api/promise/types'
import type {
  IAttestation,
  IDelegationHierarchyDetails,
  IRequestForAttestation,
  CompressedAttestation,
  IDidDetails,
} from '@kiltprotocol/types'
import { DataUtils, SDKErrors } from '@kiltprotocol/utils'
import { Utils as DidUtils } from '@kiltprotocol/did'
import { BN } from '@polkadot/util'
import {
  getRevokeTx as chainRevoke,
  query as chainQuery,
  getStoreTx as chainStore,
  getRemoveTx as chainRemove,
  getReclaimDepositTx as chainReclaimDeposit,
  queryDepositAmount as chainQueryDepositAmount,
} from './Attestation.chain.js'
import { DelegationNode } from '../delegation/DelegationNode.js'

/**
 * An [[Attestation]] certifies a [[Claim]], sent by a claimer in the form of a [[RequestForAttestation]]. [[Attestation]]s are **written on the blockchain** and are **revocable**.
 * Note: once an [[Attestation]] is stored, it can be sent to and stored with the claimer as a [[Credential]].
 *
 * An [[Attestation]] can be queried from the chain. It's stored on-chain in a map:
 * * the key is the hash of the corresponding claim;
 * * the value is a tuple ([[CType]] hash, account, id of the Delegation, and revoked flag).
 *
 * @packageDocumentation
 */

/**
 * Queries the chain for a given attestation, by `claimHash`.
 *
 * @param input - The hash of the claim that corresponds to the attestation or the full attestation object to query.
 * @returns A promise containing the [[Attestation]] or null.
 */
export async function query(
  input: IAttestation['claimHash'] | IAttestation
): Promise<IAttestation | null> {
  let claimHash
  if (typeof input === 'string') {
    claimHash = input
  } else {
    claimHash = input.claimHash
  }
  return chainQuery(claimHash)
}

/**
 * Prepares an extrinsic to revoke the attestation.
 *
 * @param input - The hash of the claim that corresponds to the attestation to revoke, or the full attestation object.
 * @param maxDepth - The number of levels to walk up the delegation hierarchy until the delegation node is found.
 * @returns A promise containing the unsigned SubmittableExtrinsic (submittable transaction).
 */
export async function getRevokeTx(
  input: IAttestation['claimHash'] | IAttestation,
  maxDepth: number
): Promise<SubmittableExtrinsic> {
  let claimHash
  if (typeof input === 'string') {
    claimHash = input
  } else {
    claimHash = input.claimHash
  }
  return chainRevoke(claimHash, maxDepth)
}

/**
 * Removes an attestation. Also available as an instance method.
 *
 * @param input - The hash of the claim that corresponds to the attestation or the full attestation object to remove.
 * @param maxDepth - The number of levels to walk up the delegation hierarchy until the delegation node is found.
 * @returns A promise containing the unsigned SubmittableExtrinsic (submittable transaction).
 */
export async function getRemoveTx(
  input: IAttestation['claimHash'] | IAttestation,
  maxDepth: number
): Promise<SubmittableExtrinsic> {
  let claimHash
  if (typeof input === 'string') {
    claimHash = input
  } else {
    claimHash = input.claimHash
  }
  return chainRemove(claimHash, maxDepth)
}

/**
 * Reclaims the deposit of an attestation and removes the attestation. Also available as an instance method.
 *
 * This call can only be successfully executed if the submitter of the transaction is the original payer of the attestation deposit.
 *
 * @param input - The hash of the claim that corresponds to the attestation or the full attestation object to remove and its deposit to be returned to the original payer.
 * @returns A promise containing the unsigned SubmittableExtrinsic (submittable transaction).
 */
export async function getReclaimDepositTx(
  input: IAttestation['claimHash'] | IAttestation
): Promise<SubmittableExtrinsic> {
  let claimHash
  if (typeof input === 'string') {
    claimHash = input
  } else {
    claimHash = input.claimHash
  }
  return chainReclaimDeposit(claimHash)
}

/**
 * Checks whether the input meets all the required criteria of an [[IAttestation]] object.
 * Throws on invalid input.
 *
 * @param input The potentially only partial [[IAttestation]].
 * @throws [[ERROR_CTYPE_HASH_NOT_PROVIDED]], [[ERROR_CLAIM_HASH_NOT_PROVIDED]] or [[ERROR_OWNER_NOT_PROVIDED]] when input's cTypeHash, claimHash or owner respectively do not exist.
 * @throws [[ERROR_DELEGATION_ID_TYPE]] when the input's delegationId is not of type 'string' or 'null'.
 * @throws [[ERROR_REVOCATION_BIT_MISSING]] when input.revoked is not of type 'boolean'.
 *
 */
export function verifyDataStructure(input: IAttestation): void {
  if (!input.cTypeHash) {
    throw new SDKErrors.ERROR_CTYPE_HASH_NOT_PROVIDED()
  } else DataUtils.validateHash(input.cTypeHash, 'CType')

  if (!input.claimHash) {
    throw new SDKErrors.ERROR_CLAIM_HASH_NOT_PROVIDED()
  } else DataUtils.validateHash(input.claimHash, 'Claim')

  if (typeof input.delegationId !== 'string' && !input.delegationId === null) {
    throw new SDKErrors.ERROR_DELEGATION_ID_TYPE()
  }
  if (!input.owner) {
    throw new SDKErrors.ERROR_OWNER_NOT_PROVIDED()
  } else DidUtils.validateKiltDidUri(input.owner)

  if (typeof input.revoked !== 'boolean') {
    throw new SDKErrors.ERROR_REVOCATION_BIT_MISSING()
  }
}

/**
 * Builds a new instance of an [[Attestation]], from a complete set of input required for an attestation.
 *
 * @param request - The base request for attestation.
 * @param attesterDid - The attester's DID, used to attest to the underlying claim.
 * @returns A new [[Attestation]] object.
 */
export function fromRequestAndDid(
  request: IRequestForAttestation,
  attesterDid: IDidDetails['uri']
): IAttestation {
  const attestation = {
    claimHash: request.rootHash,
    cTypeHash: request.claim.cTypeHash,
    delegationId: request.delegationId,
    owner: attesterDid,
    revoked: false,
  }
  verifyDataStructure(attestation)
  return attestation
}

/**
 * Tries to query the delegationId and if successful query the rootId.
 *
 * @param input - The Id of the Delegation stored in [[Attestation]] , or the whole Attestation object.
 * @returns A promise of either null if querying was not successful or the affiliated [[DelegationNode]].
 */
export async function getDelegationDetails(
  input: IAttestation['delegationId'] | IAttestation
): Promise<IDelegationHierarchyDetails | null> {
  if (!input) {
    return null
  }

  let delegationId: IAttestation['delegationId']

  if (typeof input === 'string') {
    delegationId = input
  } else {
    delegationId = input.delegationId
  }

  if (!delegationId) {
    return null
  }

  const delegationNode: DelegationNode | null = await DelegationNode.query(
    delegationId
  )
  if (!delegationNode) {
    return null
  }
  return delegationNode.getHierarchyDetails()
}

/**
 * Custom Type Guard to determine input being of type IAttestation.
 *
 * @param input The potentially only partial IAttestation.
 * @returns Boolean whether input is of type IAttestation.
 */
export function isIAttestation(input: unknown): input is IAttestation {
  try {
    verifyDataStructure(input as IAttestation)
  } catch (error) {
    return false
  }
  return true
}

/**
 * Prepares an extrinsic to store the attestation on chain.
 *
 * @param attestation - The Attestation to store.
 * @returns A promise containing the unsigned SubmittableExtrinsic (submittable transaction).
 */
export async function getStoreTx(
  attestation: IAttestation
): Promise<SubmittableExtrinsic> {
  return chainStore(attestation)
}

/**
 * Queries an attestation from the chain and checks its validity.
 *
 * @param attestation - The Attestation to verify.
 * @param claimHash - The hash of the claim that corresponds to the attestation to check. Defaults to the claimHash for the attestation onto which "verify" is called.
 * @returns A promise containing whether the attestation is valid.
 */
export async function checkValidity(
  attestation: IAttestation,
  claimHash: IAttestation['claimHash'] = attestation.claimHash
): Promise<boolean> {
  verifyDataStructure(attestation)
  // Query attestation by claimHash. null if no attestation is found on-chain for this hash
  const chainAttestation: IAttestation | null = await query(claimHash)
  return !!(
    chainAttestation !== null &&
    chainAttestation.owner === attestation.owner &&
    !chainAttestation.revoked
  )
}

/**
 * Query and return the amount of KILTs (in femto notation) needed to deposit in order to create an attestation.
 *
 * @returns The amount of femtoKILTs required to deposit to create the attestation.
 */
export function queryDepositAmount(): Promise<BN> {
  return chainQueryDepositAmount()
}

/**
 * Compresses an [[Attestation]] object into an array for storage and/or messaging.
 *
 * @param attestation An [[Attestation]] object that will be sorted and stripped for messaging or storage.
 * @returns An ordered array of an [[Attestation]].
 */
export function compress(attestation: IAttestation): CompressedAttestation {
  verifyDataStructure(attestation)
  return [
    attestation.claimHash,
    attestation.cTypeHash,
    attestation.owner,
    attestation.revoked,
    attestation.delegationId,
  ]
}

/**
 * Decompresses an [[Attestation]] from storage and/or message into an object.
 *
 * @param attestation A compressed [[Attestation]] array that is decompressed back into an object.
 * @throws [[ERROR_DECOMPRESSION_ARRAY]] when the attestation is not an array or its length is not equal to 5.
 *
 * @returns An object that has the same properties as an [[Attestation]].
 */
export function decompress(attestation: CompressedAttestation): IAttestation {
  if (!Array.isArray(attestation) || attestation.length !== 5) {
    throw new SDKErrors.ERROR_DECOMPRESSION_ARRAY('Attestation')
  }
  const decompressedAttestation = {
    claimHash: attestation[0],
    cTypeHash: attestation[1],
    owner: attestation[2],
    revoked: attestation[3],
    delegationId: attestation[4],
  }
  verifyDataStructure(decompressedAttestation)
  return decompressedAttestation
}
