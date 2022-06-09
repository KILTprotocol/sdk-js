/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { Enum, Option, Struct, U128 } from '@polkadot/types'
import type {
  IAttestation,
  Deposit,
  SubmittableExtrinsic,
  IRequestForAttestation,
} from '@kiltprotocol/types'
import { DecoderUtils, SDKErrors } from '@kiltprotocol/utils'
import type { AccountId, H256, Hash } from '@polkadot/types/interfaces'
import { ConfigService } from '@kiltprotocol/config'
import { BlockchainApiConnection } from '@kiltprotocol/chain-helpers'
import { Utils as DidUtils } from '@kiltprotocol/did'
import type { BN } from '@polkadot/util'
import type { HexString } from '@polkadot/util/types'
import { Attestation } from './Attestation.js'
import type { DelegationNodeId } from '../delegation/DelegationDecoder.js'

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

  const authorizationArgName =
    blockchain.api.tx.attestation.add.meta.args[2].name.toString()
  switch (authorizationArgName) {
    case 'delegationId':
      // uses old attestation authorization
      return blockchain.api.tx.attestation.add(
        claimHash,
        cTypeHash,
        delegationId
      )
    case 'authorization':
      // uses generalized attestation authorization
      return blockchain.api.tx.attestation.add(
        claimHash,
        cTypeHash,
        delegationId
          ? { delegation: { subjectNodeId: delegationId } } // maxChecks parameter is unused on the chain side and therefore omitted
          : undefined
      )
    default:
      throw new SDKErrors.ERROR_CODEC_MISMATCH(
        'Failed to encode call: unknown authorization type'
      )
  }
}

export interface AuthorizationId extends Enum {
  readonly isDelegation: boolean
  readonly asDelegation: H256
}

interface AttestationDetailsV1 extends Struct {
  readonly ctypeHash: Hash
  readonly attester: AccountId
  readonly delegationId: Option<DelegationNodeId>
  readonly revoked: boolean
  readonly deposit: Deposit
}

interface AttestationDetailsV2
  extends Omit<AttestationDetailsV1, 'delegationId'> {
  readonly authorizationId: Option<AuthorizationId>
}

export type AttestationDetails = AttestationDetailsV2

function decode(
  encoded: Option<AttestationDetailsV1 | AttestationDetailsV2>,
  claimHash: IRequestForAttestation['rootHash'] // all the other decoders do not use extra data; they just return partial types
): Attestation | null {
  DecoderUtils.assertCodecIsType(encoded, [
    'Option<AttestationAttestationsAttestationDetails>',
  ])
  if (encoded.isSome) {
    const chainAttestation = encoded.unwrap()
    let delegationId: HexString | undefined
    if ('authorizationId' in chainAttestation) {
      delegationId = chainAttestation.authorizationId
        .unwrapOr(undefined)
        ?.value.toHex()
    } else if ('delegationId' in chainAttestation) {
      delegationId = chainAttestation.delegationId.unwrapOr(undefined)?.toHex()
    } else {
      throw new SDKErrors.ERROR_CODEC_MISMATCH(
        'Failed to decode Attestation: unknown Codec type'
      )
    }
    const attestation: IAttestation = {
      claimHash,
      cTypeHash: chainAttestation.ctypeHash.toHex(),
      owner: DidUtils.getKiltDidFromIdentifier(
        chainAttestation.attester.toString(),
        'full'
      ),
      delegationId: delegationId || null,
      revoked: chainAttestation.revoked.valueOf(),
    }
    log.info(`Decoded attestation: ${JSON.stringify(attestation)}`)
    return Attestation.fromAttestation(attestation)
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
): Promise<Attestation | null> {
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
  const authorizationArgName =
    blockchain.api.tx.attestation.revoke.meta.args[1].name.toString()
  switch (authorizationArgName) {
    case 'maxParentChecks':
      // uses old attestation authorization
      return blockchain.api.tx.attestation.revoke(claimHash, maxParentChecks)
    case 'authorization':
      // uses generalized attestation authorization
      return blockchain.api.tx.attestation.revoke(
        claimHash,
        maxParentChecks
          ? { delegation: { maxChecks: maxParentChecks } } // subjectNodeId parameter is unused on the chain side and therefore omitted
          : undefined
      )
    default:
      throw new SDKErrors.ERROR_CODEC_MISMATCH(
        'Failed to encode call: unknown authorization type'
      )
  }
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
  const authorizationArgName =
    blockchain.api.tx.attestation.remove.meta.args[1].name.toString()
  switch (authorizationArgName) {
    case 'maxParentChecks':
      // uses old attestation authorization
      return blockchain.api.tx.attestation.remove(claimHash, maxParentChecks)
    case 'authorization':
      // uses generalized attestation authorization
      return blockchain.api.tx.attestation.remove(
        claimHash,
        maxParentChecks
          ? { delegation: { maxChecks: maxParentChecks } } // subjectNodeId parameter is unused on the chain side and therefore omitted
          : undefined
      )
    default:
      throw new SDKErrors.ERROR_CODEC_MISMATCH(
        'Failed to encode call: unknown authorization type'
      )
  }
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
