/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { Option } from '@polkadot/types'
import type {
  IAttestation,
  ICredential,
  KiltAddress,
  SubmittableExtrinsic,
} from '@kiltprotocol/types'
import { ConfigService } from '@kiltprotocol/config'
import { Utils as DidUtils } from '@kiltprotocol/did'
import type { AttestationAttestationsAttestationDetails } from '@kiltprotocol/augment-api'

const log = ConfigService.LoggingFactory.getLogger('Attestation')

/**
 * Prepares an extrinsic to store the provided [[IAttestation]] on chain.
 *
 * @param attestation The Attestation to write on the blockchain.
 * @returns A promise containing the unsigned SubmittableExtrinsic (submittable transaction).
 */
export async function getStoreTx(
  attestation: IAttestation
): Promise<SubmittableExtrinsic> {
  const { claimHash, cTypeHash, delegationId } = attestation
  log.debug(() => `Create tx for 'attestation.add'`)

  const api = ConfigService.get('api')

  return api.tx.attestation.add(
    claimHash,
    cTypeHash,
    delegationId
      ? { Delegation: { subjectNodeId: delegationId } } // maxChecks parameter is unused on the chain side and therefore omitted
      : null
  )
}

/**
 * Decodes the attestation returned by `api.query.attestation.attestations()`.
 *
 * @param encoded Raw attestation data from blockchain.
 * @param claimHash The attestation claimHash.
 * @returns The attestation.
 */
export function decode(
  encoded: Option<AttestationAttestationsAttestationDetails>,
  claimHash: ICredential['rootHash'] // all the other decoders do not use extra data; they just return partial types
): IAttestation {
  const chainAttestation = encoded.unwrap()
  const delegationId = chainAttestation.authorizationId
    .unwrapOr(undefined)
    ?.value.toHex()
  const attestation: IAttestation = {
    claimHash,
    cTypeHash: chainAttestation.ctypeHash.toHex(),
    owner: DidUtils.getFullDidUri(
      chainAttestation.attester.toString() as KiltAddress
    ),
    delegationId: delegationId || null,
    revoked: chainAttestation.revoked.valueOf(),
  }
  log.info(`Decoded attestation: ${JSON.stringify(attestation)}`)
  return attestation
}

/**
 * Prepares an extrinsic to revoke a given attestation.
 * The submitter can be the owner of the attestation or an authorized delegator thereof.
 *
 * @param claimHash The hash of the claim that corresponds to the attestation to revoke.
 * @param maxParentChecks The number of levels to walk up the delegation hierarchy until the delegation node is found.
 * @returns A promise containing the unsigned SubmittableExtrinsic (submittable transaction).
 */
export async function getRevokeTx(
  claimHash: ICredential['rootHash'] | IAttestation['claimHash'],
  maxParentChecks: number
): Promise<SubmittableExtrinsic> {
  const api = ConfigService.get('api')
  log.debug(() => `Revoking attestations with claim hash ${claimHash}`)
  return api.tx.attestation.revoke(
    claimHash,
    maxParentChecks > 0
      ? { Delegation: { maxChecks: maxParentChecks } } // subjectNodeId parameter is unused on the chain side and therefore omitted
      : null
  )
}

/**
 * Prepares an extrinsic to remove a given attestation.
 * The submitter can be the owner of the attestation or an authorized delegator thereof.
 *
 * @param claimHash The hash of the claim that corresponds to the attestation.
 * @param maxParentChecks The number of levels to walk up the delegation hierarchy until the delegation node is found.
 * @returns A promise containing the unsigned SubmittableExtrinsic (submittable transaction).
 */
export async function getRemoveTx(
  claimHash: ICredential['rootHash'],
  maxParentChecks: number
): Promise<SubmittableExtrinsic> {
  const api = ConfigService.get('api')
  log.debug(() => `Removing attestation with claim hash ${claimHash}`)
  return api.tx.attestation.remove(
    claimHash,
    maxParentChecks > 0
      ? { Delegation: { maxChecks: maxParentChecks } } // subjectNodeId parameter is unused on the chain side and therefore omitted
      : null
  )
}
