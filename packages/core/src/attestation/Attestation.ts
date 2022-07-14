/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type {
  IAttestation,
  IDelegationHierarchyDetails,
  ICredential,
  CompressedAttestation,
  DidUri,
} from '@kiltprotocol/types'
import { DataUtils, SDKErrors } from '@kiltprotocol/utils'
import { Utils as DidUtils } from '@kiltprotocol/did'
import { DelegationNode } from '../delegation/DelegationNode.js'
import { query } from './Attestation.chain.js'
import * as Credential from '../credential/index.js'

/**
 * An [[Attestation]] certifies a [[Claim]], sent by a claimer in the form of a [[Credential]]. [[Attestation]]s are **written on the blockchain** and are **revocable**.
 *
 * An [[Attestation]] can be queried from the chain. It's stored on-chain in a map:
 * * the key is the hash of the corresponding claim;
 * * the value is a tuple ([[CType]] hash, account, id of the Delegation, and revoked flag).
 *
 * @packageDocumentation
 */

/**
 * Checks whether the input meets all the required criteria of an [[IAttestation]] object.
 * Throws on invalid input.
 *
 * @param input The potentially only partial [[IAttestation]].
 */
export function verifyDataStructure(input: IAttestation): void {
  if (!input.cTypeHash) {
    throw new SDKErrors.CTypeHashMissingError()
  }
  DataUtils.validateHash(input.cTypeHash, 'CType')

  if (!input.claimHash) {
    throw new SDKErrors.ClaimHashMissingError()
  }
  DataUtils.validateHash(input.claimHash, 'Claim')

  if (typeof input.delegationId !== 'string' && !input.delegationId === null) {
    throw new SDKErrors.DelegationIdTypeError()
  }

  if (!input.owner) {
    throw new SDKErrors.OwnerMissingError()
  }
  DidUtils.validateKiltDidUri(input.owner)

  if (typeof input.revoked !== 'boolean') {
    throw new SDKErrors.RevokedTypeError()
  }
}

/**
 * Builds a new instance of an [[Attestation]], from a complete set of input required for an attestation.
 *
 * @param credential - The base credential for attestation.
 * @param attesterDid - The attester's DID, used to attest to the underlying claim.
 * @returns A new [[Attestation]] object.
 */
export function fromCredentialAndDid(
  credential: ICredential,
  attesterDid: DidUri
): IAttestation {
  const attestation = {
    claimHash: credential.rootHash,
    cTypeHash: credential.claim.cTypeHash,
    delegationId: credential.delegationId,
    owner: attesterDid,
    revoked: false,
  }
  verifyDataStructure(attestation)
  return attestation
}

/**
 * Tries to query the delegationId and if successful query the rootId.
 *
 * @param input - The ID of the Delegation stored in [[Attestation]] , or the whole Attestation object.
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

  const delegationNode = await DelegationNode.query(delegationId)
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
 * Queries an attestation from the chain and checks if it is existing, if the owner of the attestation matches and if it was not revoked.
 *
 * @param claimHash - The hash of the claim that corresponds to the attestation to check. Defaults to the claimHash for the attestation onto which "verify" is called.
 * @returns A promise containing whether the attestation is valid.
 */
export async function checkValidity(
  claimHash: IAttestation['claimHash'] | ICredential['rootHash']
): Promise<boolean> {
  // Query attestation by claimHash. null if no attestation is found on-chain for this hash
  const chainAttestation = await query(claimHash)
  return !!(chainAttestation !== null && !chainAttestation.revoked)
}

/**
 * Verifies whether the data of the given attestation matches the one from the corresponding credential. It is valid if:
 * * the [[Credential]] object has valid data (see [[Credential.verifyDataIntegrity]]);
 * and
 * * the hash of the [[Credential]] object, and the hash of the [[Attestation]].
 *
 * @param attestation - The attestation to verify.
 * @param credential - The credential to verify against.
 * @returns Whether the data is valid.
 */
export function verifyAgainstCredential(
  attestation: IAttestation,
  credential: ICredential
): boolean {
  if (credential.claim.cTypeHash !== attestation.cTypeHash) return false
  return (
    credential.rootHash === attestation.claimHash &&
    Credential.verifyDataIntegrity(credential)
  )
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
 * @returns An object that has the same properties as an [[Attestation]].
 */
export function decompress(attestation: CompressedAttestation): IAttestation {
  if (!Array.isArray(attestation) || attestation.length !== 5) {
    throw new SDKErrors.DecompressionArrayError('Attestation')
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
