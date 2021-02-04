/**
 * @packageDocumentation
 * @ignore
 */
import { SubmittableExtrinsic } from '@polkadot/api/promise/types'
import { Option, Struct } from '@polkadot/types'
import { IAttestation } from '@kiltprotocol/types'
import { AccountId, Hash } from '@polkadot/types/interfaces'
import { getCached } from '../blockchainApiConnection'
import { factory } from '../config/ConfigService'
import Identity from '../identity/Identity'
import { assertCodecIsType } from '../util/Decode'
import KILTAttestation from './Attestation'
import { DelegationNodeId } from '../delegation/DelegationDecoder'

const log = factory.getLogger('Attestation')

export async function store(
  attestation: IAttestation,
  identity: Identity
): Promise<SubmittableExtrinsic> {
  const txParams = {
    claimHash: attestation.claimHash,
    ctypeHash: attestation.cTypeHash,
    delegationId: attestation.delegationId,
  }
  log.debug(() => `Create tx for 'attestation.add'`)

  const blockchain = await getCached()

  const tx = blockchain.api.tx.attestation.add(
    txParams.claimHash,
    txParams.ctypeHash,
    txParams.delegationId
  )
  return blockchain.signTx(identity, tx)
}

export interface Attestation extends Struct {
  readonly ctypeHash: Hash
  readonly attester: AccountId
  readonly delegationId: Option<DelegationNodeId>
  readonly revoked: boolean
}

function decode(
  encoded: Option<Attestation>,
  claimHash: string // all the other decoders do not use extra data; they just return partial types
): KILTAttestation | null {
  assertCodecIsType(encoded, ['Option<Attestation>'])
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
    return KILTAttestation.fromAttestation(attestation)
  }
  return null
}

// return types reflect backwards compatibility with mashnet-node v 0.22
async function queryRaw(claimHash: string): Promise<Option<Attestation>> {
  log.debug(() => `Query chain for attestations with claim hash ${claimHash}`)
  const blockchain = await getCached()
  const result = await blockchain.api.query.attestation.attestations<
    Option<Attestation>
  >(claimHash)
  return result
}

export async function query(
  claimHash: string
): Promise<KILTAttestation | null> {
  const encoded = await queryRaw(claimHash)
  return decode(encoded, claimHash)
}

export async function revoke(
  claimHash: string,
  identity: Identity,
  maxDepth: number
): Promise<SubmittableExtrinsic> {
  const blockchain = await getCached()
  log.debug(() => `Revoking attestations with claim hash ${claimHash}`)
  const tx: SubmittableExtrinsic = blockchain.api.tx.attestation.revoke(
    claimHash,
    maxDepth
  )
  return blockchain.signTx(identity, tx)
}
