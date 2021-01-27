/**
 * @packageDocumentation
 * @ignore
 */
import { SubmittableExtrinsic } from '@polkadot/api/promise/types'
import { Option, Tuple } from '@polkadot/types'
import { Codec } from '@polkadot/types/types'
import { getCached } from '../blockchainApiConnection'
import { factory } from '../config/ConfigService'
import Identity from '../identity/Identity'
import IAttestation from '../types/Attestation'
import { assertCodecIsType, hasNonNullByte } from '../util/Decode'
import Attestation from './Attestation'

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

interface IChainAttestation extends Codec {
  toJSON: () => [string, string, string | null, boolean] | null
}

function decode(
  encoded: Option<Tuple>,
  claimHash: string // all the other decoders do not use extra data; they just return partial types
): Attestation | null {
  assertCodecIsType(encoded, [
    'Option<(Hash,AccountId,Option<DelegationNodeId>,bool)>',
  ])
  if (encoded instanceof Option || hasNonNullByte(encoded)) {
    const attestationTuple = (encoded as IChainAttestation).toJSON()
    if (attestationTuple instanceof Array) {
      const attestation: IAttestation = {
        claimHash,
        cTypeHash: attestationTuple[0],
        owner: attestationTuple[1],
        delegationId: attestationTuple[2],
        revoked: attestationTuple[3],
      }
      log.info(`Decoded attestation: ${JSON.stringify(attestation)}`)
      return Attestation.fromAttestation(attestation)
    }
  }
  return null
}

// return types reflect backwards compatibility with mashnet-node v 0.22
async function queryRaw(claimHash: string): Promise<Option<Tuple>> {
  log.debug(() => `Query chain for attestations with claim hash ${claimHash}`)
  const blockchain = await getCached()
  const result = await blockchain.api.query.attestation.attestations<
    Option<Tuple>
  >(claimHash)
  return result
}

export async function query(claimHash: string): Promise<Attestation | null> {
  const encoded = await queryRaw(claimHash)
  return decode(encoded, claimHash)
}

export async function revoke(
  claimHash: string,
  identity: Identity
): Promise<SubmittableExtrinsic> {
  const blockchain = await getCached()
  log.debug(() => `Revoking attestations with claim hash ${claimHash}`)
  const tx: SubmittableExtrinsic = blockchain.api.tx.attestation.revoke(
    claimHash
  )
  return blockchain.signTx(identity, tx)
}
