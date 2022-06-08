/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { Enum, Option, Struct, U128 } from '@polkadot/types'
import type {
  IAttestation,
  Deposit,
  SubmittableExtrinsic,
  IRequestForAttestation,
} from '@kiltprotocol/types'
import { DecoderUtils } from '@kiltprotocol/utils'
import type { AccountId, H256, Hash } from '@polkadot/types/interfaces'
import { ConfigService } from '@kiltprotocol/config'
import { BlockchainApiConnection } from '@kiltprotocol/chain-helpers'
import { Utils as DidUtils } from '@kiltprotocol/did'
import { BN } from '@polkadot/util'

const log = ConfigService.LoggingFactory.getLogger('Attestation')

/**
 * Generate the extrinsic to store the provided [[IAttestation]].
 *
 * @param attestation The attestation to write on the blockchain.
 * @returns The SubmittableExtrinsic for the `add` call.
 */
export async function getStoreTx(
  attestation: IAttestation
): Promise<SubmittableExtrinsic> {
  const { claimHash, cTypeHash, delegationId } = attestation
  log.debug(() => `Create tx for 'attestation.add'`)

  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()

  const authorization = delegationId
    ? { delegation: { subjectNodeId: delegationId } } // maxChecks parameter is unused on the chain side and therefore omitted
    : undefined
  const tx = blockchain.api.tx.attestation.add(
    claimHash,
    cTypeHash,
    authorization
  )
  return tx
}

export interface AuthorizationId extends Enum {
  isDelegation: boolean
  asDelegation: H256
}

export interface AttestationDetails extends Struct {
  readonly ctypeHash: Hash
  readonly attester: AccountId
  readonly authorizationId: Option<AuthorizationId>
  readonly revoked: boolean
  readonly deposit: Deposit
}

function decode(
  encoded: Option<AttestationDetails>,
  claimHash: IRequestForAttestation['rootHash'] // all the other decoders do not use extra data; they just return partial types
): IAttestation | null {
  DecoderUtils.assertCodecIsType(encoded, [
    'Option<AttestationAttestationsAttestationDetails>',
  ])
  if (encoded.isSome) {
    const chainAttestation = encoded.unwrap()
    const attestation: IAttestation = {
      claimHash,
      cTypeHash: chainAttestation.ctypeHash.toHex(),
      owner: DidUtils.getKiltDidFromIdentifier(
        chainAttestation.attester.toString(),
        'full'
      ),
      delegationId: chainAttestation.authorizationId.isSome
        ? chainAttestation.authorizationId.unwrap().value.toHex()
        : null,
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
  claimHash: IRequestForAttestation['rootHash']
): Promise<Option<AttestationDetails>> {
  log.debug(() => `Query chain for attestations with claim hash ${claimHash}`)
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  const result = await blockchain.api.query.attestation.attestations<
    Option<AttestationDetails>
  >(claimHash)
  return result
}

/**
 * Query an attestation from the blockchain given the claim hash it attests.
 *
 * @param claimHash The hash of the claim attested in the attestation.
 * @returns Either the retrieved [[Attestation]] or null.
 */
export async function query(
  claimHash: IRequestForAttestation['rootHash']
): Promise<IAttestation | null> {
  const encoded = await queryRaw(claimHash)
  return decode(encoded, claimHash)
}

/**
 * Generate the extrinsic to revoke a given attestation. The submitter can be the owner of the attestation or an authorized delegator thereof.
 *
 * @param claimHash The attestation claim hash.
 * @param maxParentChecks The max number of lookup to perform up the hierarchy chain to verify the authorisation of the caller to perform the revocation.
 * @returns The SubmittableExtrinsic for the `revoke` call.
 */
export async function getRevokeTx(
  claimHash: IRequestForAttestation['rootHash'],
  maxParentChecks: number
): Promise<SubmittableExtrinsic> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  log.debug(() => `Revoking attestations with claim hash ${claimHash}`)
  const tx: SubmittableExtrinsic = blockchain.api.tx.attestation.revoke(
    claimHash,
    maxParentChecks ? { delegation: { maxChecks: maxParentChecks } } : undefined // subjectNodeId parameter is unused on the chain side and therefore omitted
  )
  return tx
}

/**
 * Generate the extrinsic to remove a given attestation. The submitter can be the owner of the attestation or an authorized delegator thereof.
 *
 * @param claimHash The attestation claim hash.
 * @param maxParentChecks The max number of lookup to perform up the hierarchy chain to verify the authorisation of the caller to perform the removal.
 * @returns The SubmittableExtrinsic for the `remove` call.
 */
export async function getRemoveTx(
  claimHash: IRequestForAttestation['rootHash'],
  maxParentChecks: number
): Promise<SubmittableExtrinsic> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  log.debug(() => `Removing attestation with claim hash ${claimHash}`)
  const tx: SubmittableExtrinsic = blockchain.api.tx.attestation.remove(
    claimHash,
    maxParentChecks ? { delegation: { maxChecks: maxParentChecks } } : undefined // subjectNodeId parameter is unused on the chain side and therefore omitted
  )
  return tx
}

/**
 * Generate the extrinsic to delete a given attestation and reclaim back its deposit. The submitter **must** be the KILT account that initially paid for the deposit.
 *
 * @param claimHash The attestation claim hash.
 * @returns The SubmittableExtrinsic for the `getReclaimDepositTx` call.
 */
export async function getReclaimDepositTx(
  claimHash: IRequestForAttestation['rootHash']
): Promise<SubmittableExtrinsic> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  log.debug(
    () => `Claiming deposit for the attestation with claim hash ${claimHash}`
  )
  const tx: SubmittableExtrinsic =
    blockchain.api.tx.attestation.reclaimDeposit(claimHash)
  return tx
}

async function queryDepositAmountEncoded(): Promise<U128> {
  const { api } = await BlockchainApiConnection.getConnectionOrConnect()
  return api.consts.attestation.deposit as U128
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
