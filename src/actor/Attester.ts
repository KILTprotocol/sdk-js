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

/**
 * [ASYNC] Initiates the [[Attestation]] session.
 *
 * @param identity The [[Identity]] representing the entity which is eligible to attest and sign the [[Claim]].
 * @returns A session and a message object.
 * The **message** should be sent over to the Claimer to be used in [[requestAttestion]].
 * The **session** should be kept private and used in [[issueAttestation]].
 */
export async function initiateAttestation(
  identity: AttesterIdentity
): Promise<{
  message: IInitiateAttestation
  session: gabi.AttesterAttestationSession
}> {
  return identity.initiateAttestation()
}

/**
 * [ASYNC] Creates an [[Attestation]] for the [[Claim]] inside the request.
 *
 * @param identity The [[AttesterIdentity]] representing the entity which should attest the [[Claim]] and initiated the [[Attestation]]
 * in [[initiateAttestation]].
 * @param request The message result of the Claimer's attestation request in [[requestAttestation]].
 * @param session The [[AttesterIdentity]]'s session created in [[initiateAttestation]].
 * @param forcePE A boolean to force privacy enhancement.
 * @returns The [[Attestation]] object which should be sent to the Claimer and
 * a witness which can be used to revoke the [[Attestation]] in [[revokeAttestation]].
 */
export async function issueAttestation(
  identity: AttesterIdentity,
  request: IRequestAttestationForClaim,
  session: gabi.AttesterAttestationSession | null = null,
  forcePE = false
): Promise<{
  revocationHandle: IRevocationHandle
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
  const revocationHandle: IRevocationHandle = {
    witness,
    attestation,
  }
  return {
    revocationHandle,
    message: {
      content: {
        attestation,
        attestationPE: peAttestation || undefined,
      },
      type: MessageBodyType.SUBMIT_ATTESTATION_FOR_CLAIM,
    },
  }
}

// eslint-disable-next-line jsdoc/require-returns
/**
 * [ASYNC] Revokes an [[Attestation]] created in [[issueAttestation]].
 *
 * @param identity The [[AttesterIdentity]] which signed the [[Attestation]] in [[issueAttestation]].
 * @param attestation The unique witness for the [[Attestation]] which was created in [[issueAttestation]].
 */
export async function revokeAttestation(
  identity: AttesterIdentity,
  attestation: IRevocationHandle
): Promise<void> {
  return identity.revokeAttestation(attestation)
}
