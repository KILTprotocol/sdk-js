import {
  AttestedClaim,
  Identity,
  IMessage,
  IRequestAttestationForClaim,
  Message,
  MessageBodyType,
  RequestForAttestation,
  SDKErrors,
} from '@kiltprotocol/core'
import {
  IClaim,
  IDelegationBaseNode,
  IPublicIdentity,
  IRequestForAttestation,
} from '@kiltprotocol/types'
import Credential from '../credential/Credential'

/**
 * Creates a presentation for an arbitrary amount of [[Credential]]s which can be verified in [[verifyPresentation]].
 *
 * @param identity The Claimer [[Identity]] which owns the [[Credential]]s.
 * @param message The message which represents multiple [[CType]]s, [[IRequestClaimsForCTypes]]s and whether privacy
 * enhancement is supported.
 * @param verifier The [[IPublicIdentity]] of the verifier that requested the presentation.
 * @param credentials The [[Credential]]s which should be verified.
 * @throws [[ERROR_PE_MISMATCH]], [[ERROR_MESSAGE_TYPE]], [[ERROR_PE_CREDENTIAL_MISSING]].
 * @returns A message which represents either an array of [[AttestedClaim]]s if privacy enhancement is not supported
 * or a CombinedPresentation. Both of these options can be verified.
 */
export function createPresentation(
  identity: Identity,
  message: IMessage,
  verifier: IPublicIdentity,
  credentials: Credential[]
): Message {
  // did we get the right message type?
  if (message.body.type !== MessageBodyType.REQUEST_CLAIMS_FOR_CTYPES) {
    throw SDKErrors.ERROR_MESSAGE_TYPE(
      message.body.type,
      MessageBodyType.REQUEST_CLAIMS_FOR_CTYPES
    )
  }

  // get attributes requested by the verifier
  const requestedAttributes: string[][] = credentials.map((cred) =>
    Array.from(cred.getAttributes())
  )

  // create presentation for each credential
  const attestedClaims = credentials.map((cred, i) => {
    const presentation = cred.createPresentation(requestedAttributes[i])

    // remove to show as few as possible
    return presentation
  })

  return new Message(
    {
      type: MessageBodyType.SUBMIT_CLAIMS_FOR_CTYPES,
      content: attestedClaims,
    },
    identity,
    verifier
  )
}

/**
 * The Claimer's [[Attestation]] session object which is returned in [[requestAttestation]] and required in [[buildCredential]].
 *
 * It includes all [[Claim]] data required for an [[Attestation]]: The [[Claim]], the Claimer's signature,
 * the claimHashTree, the [[cTypeHash]], the unique identifier for the delegation,
 * an array of [[AttestedClaim]]s and the rootHash.
 *
 * In case of enabled privacy enhancement, both the Claimer's Attestation session
 * and the Attester's message from [[initiateAttestation]] are included as well.
 * Both of these objects are required for privacy enhancement to prevent replay attacks.
 */
export type ClaimerAttestationSession = {
  requestForAttestation: IRequestForAttestation
}

/**
 * Creates an [[IRequestAttestationForClaim]] using the provided [[IInitiateAttestation]].
 *
 * @param claim The [[Claim]] which should get attested.
 * @param identity The Claimer's [[Identity]] which owns the [[Claim]].
 * @param attesterPublicIdentity The public identity of the attester which should attest the [[Claim]].
 * @param option The option object.
 * @param option.legitimations An Array of [[AttestedClaim]] objects of the Attester which the Claimer requests to
 * include into the [[Attestation]] as legitimations.
 * @param option.delegationId The unique identifier of the desired delegation.
 * @returns An [[IRequestAttestationForClaim]] and a ClaimerAttestationSession which together with an [[ISubmitAttestationForClaim]]
 * object can be used to create a [[Credential]].
 */
export function requestAttestation(
  claim: IClaim,
  identity: Identity,
  attesterPublicIdentity: IPublicIdentity,
  option: {
    legitimations?: AttestedClaim[]
    delegationId?: IDelegationBaseNode['id']
  } = {}
): {
  message: Message
  session: ClaimerAttestationSession
} {
  const request = RequestForAttestation.fromClaimAndIdentity(
    claim,
    identity,
    option
  )
  const message: IRequestAttestationForClaim = {
    content: {
      requestForAttestation: request,
    },
    type: MessageBodyType.REQUEST_ATTESTATION_FOR_CLAIM,
  }

  return {
    message: new Message(message, identity, attesterPublicIdentity),
    session: { requestForAttestation: request },
  }
}

/**
 * Builds a [[Credential]] which can be verified when used in [[createPresentation]].
 *
 * @param message The session object corresponding to the [[ISubmitAttestationForClaim]].
 * @param session The ClaimerAttestationSession which corresponds to the message and [[AttestedClaim]].
 * @returns A signed and valid [[Credential]].
 */
export function buildCredential(
  message: IMessage,
  session: ClaimerAttestationSession
): Credential {
  if (message.body.type !== MessageBodyType.SUBMIT_ATTESTATION_FOR_CLAIM) {
    throw SDKErrors.ERROR_MESSAGE_TYPE(
      message.body.type,
      MessageBodyType.SUBMIT_ATTESTATION_FOR_CLAIM
    )
  }
  return Credential.fromRequestAndAttestation(
    session.requestForAttestation,
    message.body.content.attestation
  )
}
