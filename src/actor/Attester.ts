import * as gabi from '@kiltprotocol/portablegabi'
import PublicAttesterIdentity from '../attesteridentity/PublicAttesterIdentity'
import AttesterIdentity from '../attesteridentity/AttesterIdentity'
import {
  IInitiateAttestation,
  IRequestAttestationForClaim,
  ISubmitAttestationForClaim,
  MessageBodyType,
} from '../messaging/Message'
import Attestation from '../attestation/Attestation'
import { IRevocableAttestation } from '../types/Attestation'
import getCached from '../blockchainApiConnection'

export async function initiateAttestation(
  identity: AttesterIdentity
): Promise<{
  message: IInitiateAttestation
  session: gabi.AttesterAttestationSession
}> {
  return identity.initiateAttestation()
}

export async function issueAttestation(
  identity: AttesterIdentity,
  request: IRequestAttestationForClaim,
  session: gabi.AttesterAttestationSession | null = null,
  forcePE = false
): Promise<{
  attestation: IRevocableAttestation
  message: ISubmitAttestationForClaim
}> {
  // Lets continue with the original object
  const attestation = Attestation.fromRequestAndPublicIdentity(
    request.content.requestForAttestation,
    identity.getPublicIdentity()
  )
  let witness: gabi.Witness | null = null
  let peAttestation: gabi.Attestation | null = null
  if (forcePE && session === null) {
    throw new Error(
      'Privacy enhancement was forced, but attestation session is missing.'
    )
  } else if (session !== null) {
    ;[witness, peAttestation] = await identity.issuePrivacyEnhancedAttestation(
      session,
      request.content.requestForAttestation
    )
  }
  await attestation.store(identity)
  const revocableAttestation: IRevocableAttestation = {
    witness,
    ...attestation,
  }
  return {
    attestation: revocableAttestation,
    message: {
      content: {
        attestation,
        attestationPE: peAttestation || undefined,
      },
      type: MessageBodyType.SUBMIT_ATTESTATION_FOR_CLAIM,
    },
  }
}

export async function revokeAttestation(
  identity: AttesterIdentity,
  attestation: IRevocableAttestation
): Promise<void> {
  return identity.revokeAttestation(attestation)
}

export async function updateAccumulator(
  identity: AttesterIdentity,
  accumulator: gabi.Accumulator
): Promise<void> {
  identity.updateAccumulator(accumulator)
}

export async function getAccumulator(
  identity: PublicAttesterIdentity,
  index: number
): Promise<gabi.Accumulator> {
  const bc = await getCached()
  return bc.portablegabi.getAccumulator(identity.address, index)
}

export async function getLatestAccumulator(
  identity: PublicAttesterIdentity
): Promise<gabi.Accumulator> {
  const bc = await getCached()
  return bc.portablegabi.getLatestAccumulator(identity.address)
}

export async function getAccumulatorArray(
  identity: PublicAttesterIdentity,
  startIndex: number,
  _endIndex: number | undefined
): Promise<gabi.Accumulator[]> {
  const bc = await getCached()
  return bc.portablegabi.getAccumulatorArray(
    identity.address,
    startIndex,
    _endIndex
  )
}

export async function buildAccumulator(
  identity: AttesterIdentity
): Promise<gabi.Accumulator> {
  return identity.buildAccumulator()
}
