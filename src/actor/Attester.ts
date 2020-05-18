import * as gabi from '@kiltprotocol/portablegabi'
import { getCached } from '../blockchainApiConnection'
import PublicAttesterIdentity from '../attesteridentity/PublicAttesterIdentity'
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
 * The **message** should be sent over to the Claimer to be used in [[requestAttestation]].
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
  if (request.type !== MessageBodyType.REQUEST_ATTESTATION_FOR_CLAIM) {
    throw new TypeError(
      `Unexpected message type. Received ${request.type}, expected ${MessageBodyType.REQUEST_ATTESTATION_FOR_CLAIM}`
    )
  }
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

/**
 * [ASYNC] Updates the current [[Accumulator]].
 *
 * @param identity The [[AttesterIdentity]] who owns the [[Accumulator]].
 * @param accumulator The current [[Accumulator]] of the [[AttesterIdentity]].
 */
export async function updateAccumulator(
  identity: AttesterIdentity,
  accumulator: gabi.Accumulator
): Promise<void> {
  identity.updateAccumulator(accumulator)
}

/**
 * [ASYNC] Returns an [[Accumulator]] for a given chain address.
 *
 * @param identity The [[PublicAttesterIdentity]] for which you can query an [[Accumulator]] on the chain.
 * @param index The index of the [[Accumulator]] which you want to query from the on-chain array of accumulators.
 * @returns An [[Accumulator]] for a chain address.
 */
export async function getAccumulator(
  identity: PublicAttesterIdentity,
  index: number
): Promise<gabi.Accumulator> {
  const bc = await getCached()
  return bc.portablegabi.getAccumulator(identity.address, index)
}

/**
 * [ASYNC] Returns the current [[Accumulator]] for a given chain address.
 *
 * @param identity The [[PublicAttesterIdentity]] for which you can query the [[Accumulator]] on the chain.
 * @returns The current [[Accumulator]] for a chain address.
 */
export async function getLatestAccumulator(
  identity: PublicAttesterIdentity
): Promise<gabi.Accumulator> {
  const bc = await getCached()
  return bc.portablegabi.getLatestAccumulator(identity.address)
}

/**
 * [ASYNC] Returns an an array of [[Accumulator]] for a given chain address.
 *
 * @param identity The [[PublicAttesterIdentity]] for which you can query an the array of [[Accumulator]]s on the chain.
 * @param startIndex The start index of the [[Accumulator]] array which you want to query.
 * @param _endIndex The optional end index of the [[Accumulator]] array which you want to query.
 * The default value is the maximum index which corresponds to the most recent [[Accumulator]].
 * @returns An array of [[Accumulator]]s for a chain address.
 */
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

/**
 * [ASYNC] Creates an [[Accumulator]] for a given chain address.
 *
 * @param identity The [[AttesterIdentity]] which should own the [[Accumulator]].
 * @returns An [[Accumulator]] tied to the supplied [[AttesterIdentity]].
 */
export async function buildAccumulator(
  identity: AttesterIdentity
): Promise<gabi.Accumulator> {
  return identity.buildAccumulator()
}
