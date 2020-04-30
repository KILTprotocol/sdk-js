import * as gabi from '@kiltprotocol/portablegabi'
import AttesterIdentity from '../attesteridentity/AttesterIdentity'
import {
  IInitiateAttestation,
  IRequestAttestationForClaim,
  ISubmitAttestationForClaim,
  MessageBodyType,
} from '../messaging/Message'
import Attestation from '../attestation/Attestation'
import { IRevocationHandle } from '../types/Attestation'

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
  attestation: IRevocationHandle
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
  const revocableAttestation: IRevocationHandle = {
    witness,
    attestation,
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
  attestation: IRevocationHandle
): Promise<void> {
  return identity.revokeAttestation(attestation)
}
