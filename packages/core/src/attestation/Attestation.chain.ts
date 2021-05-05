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
import Attestation from './Attestation'
import type { DelegationNodeId } from '../delegation/DelegationDecoder'

const log = ConfigService.LoggingFactory.getLogger('Attestation')

/**
 * @param attestation
 * @internal
 */
export async function store(
  attestation: IAttestation
): Promise<SubmittableExtrinsic> {
  const txParams = {
    claimHash: attestation.claimHash,
    ctypeHash: attestation.cTypeHash,
    delegationId: attestation.delegationId,
  }
  log.debug(() => `Create tx for 'attestation.add'`)

  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()

  const tx = blockchain.api.tx.attestation.add(
    txParams.claimHash,
    txParams.ctypeHash,
    txParams.delegationId
  )
  return tx
}

/**
 * @internal
 */
export interface IChainAttestation extends Struct {
  readonly ctypeHash: Hash
  readonly attester: AccountId
  readonly delegationId: Option<DelegationNodeId>
  readonly revoked: boolean
}

function decode(
  encoded: Option<IChainAttestation>,
  claimHash: string // all the other decoders do not use extra data; they just return partial types
): Attestation | null {
  DecoderUtils.assertCodecIsType(encoded, ['Option<Attestation>'])
  if (encoded.isSome) {
    const chainAttestation = encoded.unwrap()
    const attestation: IAttestation = {
      claimHash,
      cTypeHash: chainAttestation.ctypeHash.toString(),
      owner: chainAttestation.attester.toString(),
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
async function queryRaw(claimHash: string): Promise<Option<IChainAttestation>> {
  log.debug(() => `Query chain for attestations with claim hash ${claimHash}`)
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  const result = await blockchain.api.query.attestation.attestations<
    Option<IChainAttestation>
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
