/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type {
  IAttestation,
  IDelegationHierarchyDetails,
  ICredential,
  Did as KiltDid,
} from '@kiltprotocol/types'
import { DataUtils, SDKErrors } from '@kiltprotocol/utils'
import * as Did from '@kiltprotocol/did'
import { DelegationNode } from '../delegation/DelegationNode.js'

/**
 * An {@link IAttestation | Attestation} certifies a {@link IClaim | Claim}, sent by a claimer in the form of a {@link ICredential | Credential}. Attestations are **written on the blockchain** and are **revocable**.
 *
 * An Attestation can be queried from the chain. It's stored on-chain in a map:
 * * the key is the hash of the corresponding claim;
 * * the value is a tuple ({@link ICType | CType} hash, account, id of the Delegation, and revoked flag).
 *
 * @packageDocumentation
 */

/**
 * Checks whether the input meets all the required criteria of an {@link IAttestation} object.
 * Throws on invalid input.
 *
 * @param input The potentially only partial {@link IAttestation}.
 */
export function verifyDataStructure(input: IAttestation): void {
  if (!input.cTypeHash) {
    throw new SDKErrors.CTypeHashMissingError()
  }
  DataUtils.verifyIsHex(input.cTypeHash, 256)

  if (!input.claimHash) {
    throw new SDKErrors.ClaimHashMissingError()
  }
  DataUtils.verifyIsHex(input.claimHash, 256)

  if (typeof input.delegationId !== 'string' && input.delegationId !== null) {
    throw new SDKErrors.DelegationIdTypeError()
  }

  if (!input.owner) {
    throw new SDKErrors.OwnerMissingError()
  }
  Did.validateDid(input.owner, 'Did')

  if (typeof input.revoked !== 'boolean') {
    throw new SDKErrors.RevokedTypeError()
  }
}

/**
 * Builds a new instance of an {@link IAttestation}, from a complete set of input required for an attestation.
 *
 * @param credential - The base credential for attestation.
 * @param attesterDid - The attester's DID, used to attest to the underlying claim.
 * @returns A new {@link Attestation} object.
 */
export function fromCredentialAndDid(
  credential: ICredential,
  attesterDid: KiltDid
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
 * Tries to fetch the delegationId and if successful fetch the rootId.
 *
 * @param input - The ID of the Delegation stored in {@link IAttestation} , or the whole Attestation object.
 * @returns A promise of the affiliated {@link IDelegationHierarchyDetails}.
 */
export async function getDelegationDetails(
  input: IAttestation['delegationId'] | IAttestation
): Promise<IDelegationHierarchyDetails> {
  if (input === null) {
    throw new SDKErrors.HierarchyQueryError('null')
  }

  let delegationId: IAttestation['delegationId']

  if (typeof input === 'string') {
    delegationId = input
  } else {
    delegationId = input.delegationId
  }

  if (!delegationId) {
    throw new SDKErrors.HierarchyQueryError('null')
  }

  const delegationNode = await DelegationNode.fetch(delegationId)
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
