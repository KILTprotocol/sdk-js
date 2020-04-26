/**
 * @packageDocumentation
 * @ignore
 */
import { Option, Text, Tuple } from '@polkadot/types'
import { SubmittableExtrinsic } from '@polkadot/api/promise/types'

import { SubmittableResult } from '@polkadot/api'
import { hasNonNullByte } from '../util/Decode'
import { getCached } from '../blockchainApiConnection'
import Identity from '../identity/Identity'
import { factory } from '../config/ConfigLog'
import IAttestation from '../types/Attestation'
import Attestation from './Attestation'

const log = factory.getLogger('Attestation')

export async function store(
  attestation: IAttestation,
  identity: Identity
): Promise<SubmittableResult> {
  const txParams = {
    claimHash: attestation.claimHash,
    ctypeHash: attestation.cTypeHash,
    delegationId: new Option(Text, attestation.delegationId),
  }
  log.debug(() => `Create tx for 'attestation.add'`)

  const blockchain = await getCached()

  const tx = blockchain.api.tx.attestation.add(
    txParams.claimHash,
    txParams.ctypeHash,
    txParams.delegationId
  )
  return blockchain.submitTx(identity, tx)
}

function decode(
  encoded: Option<Tuple> | Tuple,
  claimHash: string
): Attestation | null {
  if (
    encoded instanceof Option ||
    hasNonNullByte(encoded) ||
    !(encoded[0].isEmpty || encoded[1].isEmpty)
  ) {
    const attestationTuple = encoded.toJSON()
    // TODO: use Leon's type guards here once merged
    if (
      attestationTuple instanceof Array &&
      typeof attestationTuple[0] === 'string' &&
      typeof attestationTuple[1] === 'string' &&
      (typeof attestationTuple[2] === 'string' ||
        attestationTuple[2] === null) &&
      typeof attestationTuple[3] === 'boolean'
    ) {
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
async function queryRaw(claimHash: string): Promise<Option<Tuple> | Tuple> {
  log.debug(() => `Query chain for attestations with claim hash ${claimHash}`)
  const blockchain = await getCached()
  const result = await blockchain.api.query.attestation.attestations<
    Option<Tuple> | Tuple
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
): Promise<SubmittableResult> {
  const blockchain = await getCached()
  log.debug(() => `Revoking attestations with claim hash ${claimHash}`)
  const tx: SubmittableExtrinsic = blockchain.api.tx.attestation.revoke(
    claimHash
  )
  return blockchain.submitTx(identity, tx)
}
