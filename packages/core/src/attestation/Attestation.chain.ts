/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @packageDocumentation
 * @module Attestation
 */
import { Option, Struct } from '@polkadot/types'
import type { IAttestation, SubmittableExtrinsic } from '@kiltprotocol/types'
import { DecoderUtils } from '@kiltprotocol/utils'
import type { AccountId, Hash } from '@polkadot/types/interfaces'
import { ConfigService } from '@kiltprotocol/config'
import { BlockchainApiConnection } from '@kiltprotocol/chain-helpers'
import { DidUtils } from '@kiltprotocol/did'
import Attestation from './Attestation'
import { IDeposit } from '../common'
import type { DelegationNodeId } from '../delegation/DelegationDecoder'

const log = ConfigService.LoggingFactory.getLogger('Attestation')

/**
 * @param attestation
 * @internal
 */
export async function store(
  attestation: IAttestation
): Promise<SubmittableExtrinsic> {
  const { claimHash, cTypeHash, delegationId } = attestation
  log.debug(() => `Create tx for 'attestation.add'`)

  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()

  const tx = blockchain.api.tx.attestation.add(
    claimHash,
    cTypeHash,
    delegationId
  )
  return tx
}

/**
 * @internal
 */
export interface AttestationDetails extends Struct {
  readonly ctypeHash: Hash
  readonly attester: AccountId
  readonly delegationId: Option<DelegationNodeId>
  readonly revoked: boolean
  readonly deposit: IDeposit
}

function decode(
  encoded: Option<AttestationDetails>,
  claimHash: string // all the other decoders do not use extra data; they just return partial types
): Attestation | null {
  DecoderUtils.assertCodecIsType(encoded, ['Option<AttestationDetails>'])
  if (encoded.isSome) {
    const chainAttestation = encoded.unwrap()
    const attestation: IAttestation = {
      claimHash,
      cTypeHash: chainAttestation.ctypeHash.toString(),
      owner: DidUtils.getKiltDidFromIdentifier(
        chainAttestation.attester.toString(),
        'full'
      ),
      delegationId:
        chainAttestation.delegationId.unwrapOr(null)?.toString() || null,
      revoked: chainAttestation.revoked.valueOf(),
    }
    log.info(`Decoded attestation: ${JSON.stringify(attestation)}`)
    return Attestation.fromAttestation(attestation)
  }
  return null
}

// return types reflect backwards compatibility with mashnet-node v 0.22
async function queryRaw(
  claimHash: string
): Promise<Option<AttestationDetails>> {
  log.debug(() => `Query chain for attestations with claim hash ${claimHash}`)
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  const result = await blockchain.api.query.attestation.attestations<
    Option<AttestationDetails>
  >(claimHash)
  return result
}

/**
 * @param claimHash
 * @internal
 */
export async function query(claimHash: string): Promise<Attestation | null> {
  const encoded = await queryRaw(claimHash)
  return decode(encoded, claimHash)
}

/**
 * @param claimHash
 * @param maxDepth
 * @internal
 */
export async function revoke(
  claimHash: string,
  maxDepth: number
): Promise<SubmittableExtrinsic> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  log.debug(() => `Revoking attestations with claim hash ${claimHash}`)
  const tx: SubmittableExtrinsic = blockchain.api.tx.attestation.revoke(
    claimHash,
    maxDepth
  )
  return tx
}

/**
 * @param claimHash
 * @param maxDepth
 * @internal
 */
export async function remove(
  claimHash: string,
  maxDepth: number
): Promise<SubmittableExtrinsic> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  log.debug(() => `Removing attestation with claim hash ${claimHash}`)
  const tx: SubmittableExtrinsic = blockchain.api.tx.attestation.remove(
    claimHash,
    maxDepth
  )
  return tx
}

/**
 * @param claimHash
 * @internal
 */
export async function reclaimDeposit(
  claimHash: string
): Promise<SubmittableExtrinsic> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  log.debug(
    () => `Claiming deposit for the attestation with claim hash ${claimHash}`
  )
  const tx: SubmittableExtrinsic = blockchain.api.tx.attestation.reclaimDeposit(
    claimHash
  )
  return tx
}
