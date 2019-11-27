/**
 * @module Attestation
 */

/**
 * Dummy comment needed for correct doc display, do not remove
 */
import { Option, Text } from '@polkadot/types'
import { Codec } from '@polkadot/types/types'
import { SubmittableExtrinsic } from '@polkadot/api/promise/types'

import { getCached } from '../blockchainApiConnection'
import { QueryResult } from '../blockchain/Blockchain'
import TxStatus from '../blockchain/TxStatus'
import Identity from '../identity/Identity'
import { factory } from '../config/ConfigLog'
import IAttestation from '../types/Attestation'
import Attestation from './Attestation'

const log = factory.getLogger('Attestation')

export async function store(
  attestation: IAttestation,
  identity: Identity
): Promise<TxStatus> {
  const txParams = {
    claimHash: attestation.claimHash,
    ctypeHash: attestation.cTypeHash,
    delegationId: new Option(Text, attestation.delegationId),
  }
  log.debug(() => `Create tx for 'attestation.add'`)

  const blockchain = await getCached()

  const tx = await blockchain.api.tx.attestation.add(
    txParams.claimHash,
    txParams.ctypeHash,
    txParams.delegationId
  )
  return blockchain.submitTx(identity, tx)
}

function decode(encoded: QueryResult, claimHash: string): Attestation | null {
  if (encoded && encoded.encodedLength) {
    const attestationTuple = encoded.toJSON()
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

async function queryRaw(claimHash: string): Promise<Codec | null> {
  log.debug(() => `Query chain for attestations with claim hash ${claimHash}`)
  const blockchain = await getCached()
  const result: QueryResult = await blockchain.api.query.attestation.attestations(
    claimHash
  )
  return result
}

export async function query(claimHash: string): Promise<Attestation | null> {
  const encoded: QueryResult = await queryRaw(claimHash)
  return decode(encoded, claimHash)
}

export async function revoke(
  claimHash: string,
  identity: Identity
): Promise<TxStatus> {
  const blockchain = await getCached()
  log.debug(() => `Revoking attestations with claim hash ${claimHash}`)
  const tx: SubmittableExtrinsic = blockchain.api.tx.attestation.revoke(
    claimHash
  )
  return blockchain.submitTx(identity, tx)
}
