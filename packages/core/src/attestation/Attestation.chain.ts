/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { Option, U128 } from '@polkadot/types'
import type { BN } from '@polkadot/util'

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

function decode(
  encoded: Option<AttestationAttestationsAttestationDetails>,
  claimHash: ICredential['rootHash'] // all the other decoders do not use extra data; they just return partial types
): IAttestation | null {
  if (encoded.isSome) {
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
  return null
}

/**
 * Query an attestation from the blockchain, returning the SCALE encoded value.
 *
 * @param claimHash The hash of the claim attested in the attestation.
 * @returns An Option wrapping scale encoded attestation data.
 */
export async function queryRaw(
  claimHash: ICredential['rootHash']
): Promise<Option<AttestationAttestationsAttestationDetails>> {
  log.debug(() => `Query chain for attestations with claim hash ${claimHash}`)
  const api = ConfigService.get('api')
  return api.query.attestation.attestations(claimHash)
}

/**
 * Queries an attestation from the blockchain given the claim hash it attests.
 *
 * @param claimHash The hash of the claim attested in the attestation.
 * @returns A promise containing the retrieved [[Attestation]] or null.
 */
export async function query(
  claimHash: ICredential['rootHash'] | IAttestation['claimHash']
): Promise<IAttestation | null> {
  const encoded = await queryRaw(claimHash)
  return decode(encoded, claimHash)
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

/**
 * Prepares an extrinsic to reclaim the deposit of an attestation, deleting the attestation in the process.
 * The submitter **must** be the KILT account that initially paid for the deposit.
 *
 * @param claimHash The hash of the claim that corresponds to the attestation.
 * @returns A promise containing the unsigned SubmittableExtrinsic (submittable transaction).
 */
export async function getReclaimDepositTx(
  claimHash: ICredential['rootHash']
): Promise<SubmittableExtrinsic> {
  const api = ConfigService.get('api')
  log.debug(
    () => `Claiming deposit for the attestation with claim hash ${claimHash}`
  )
  return api.tx.attestation.reclaimDeposit(claimHash)
}

async function queryDepositAmountEncoded(): Promise<U128> {
  const api = ConfigService.get('api')
  return api.consts.attestation.deposit
}

/**
 * Gets the current deposit amount due for the creation of new attestations.
 *
 * @returns Deposit amount in Femto Kilt as a BigNumber.
 */
export async function queryDepositAmount(): Promise<BN> {
  const encodedDeposit = await queryDepositAmountEncoded()
  return encodedDeposit.toBn()
}
