import * as gabi from '@kiltprotocol/portablegabi'
import {
  ERROR_MESSAGE_TYPE,
  ERROR_PE_MISMATCH,
  ERROR_PE_CREDENTIAL_MISSING,
} from '../errorhandling/SDKErrors'
import IPublicIdentity from '../types/PublicIdentity'
import RequestForAttestation from '../requestforattestation/RequestForAttestation'
import IClaim from '../types/Claim'
import { IDelegationBaseNode } from '../types/Delegation'
import Message, {
  MessageBodyType,
  IInitiateAttestation,
  IRequestAttestationForClaim,
  IMessage,
} from '../messaging/Message'
import AttestedClaim from '../attestedclaim/AttestedClaim'
import Identity from '../identity/Identity'
import IRequestForAttestation from '../types/RequestForAttestation'
import Credential from '../credential/Credential'
import PublicAttesterIdentity from '../identity/PublicAttesterIdentity'

function noNulls<T>(array: Array<T | null>): array is T[] {
  return array.every((c) => c !== null)
}

/**
 * Prepares the requested properties of a [[Claim]] to have the final structure required in [[createPresentation]].
 *
 * @param props The properties of the [[Claim]] which where requested to be publicly shown by the verifier.
 *
 * @returns All properties which can be publicly shown in the correct format.
 */
function finalizeReqProps(props: string[]): string[] {
  return props.map((prop) => prop.replace('claim.contents.', ''))
}

/**
 * [ASYNC] Creates a presentation for an arbitrary amount of [[Credential]]s which can be verified in [[verifyPresentation]].
 *
 * @param identity The Claimer [[Identity]] which owns the [[Credential]]s.
 * @param message The message which represents multiple [[CType]]s, [[IRequestClaimsForCTypes]]s and whether privacy
 * enhancement is supported.
 * @param verifier The [[IPublicIdentity]] of the verifier that requested the presentation.
 * @param credentials The [[Credential]]s which should be verified.
 * @param attesterPubKeys The privacy enhanced public keys of all [[AttesterIdentity]]s which signed the [[Credential]]s.
 * @param requirePE A boolean to force privacy enhancement.
 * @throws [[ERROR_PE_MISMATCH]], [[ERROR_MESSAGE_TYPE]], [[ERROR_PE_CREDENTIAL_MISSING]].
 * @returns A message which represents either an array of [[AttestedClaim]]s if privacy enhancement is not supported
 * or a CombinedPresentation. Both of these options can be verified.
 */
export async function createPresentation(
  identity: Identity,
  message: IMessage,
  verifier: IPublicIdentity,
  credentials: Credential[],
  attesterPubKeys: PublicAttesterIdentity[],
  requirePE = true
): Promise<Message> {
  // did we get the right message type?
  if (message.body.type !== MessageBodyType.REQUEST_CLAIMS_FOR_CTYPES) {
    throw ERROR_MESSAGE_TYPE(
      message.body.type,
      MessageBodyType.REQUEST_CLAIMS_FOR_CTYPES
    )
  }

  // If privacy enhancement was required, but is not allowed, we can't create a presentation.
  if (!message.body.content.allowPE && requirePE) {
    throw ERROR_PE_MISMATCH()
  }
  const request = message.body

  // if privacy enhancement is allowed, we return a privacy enhanced presentation
  if (request.content.allowPE) {
    const peCreds = credentials.map((c) => c.privacyCredential)
    if (!noNulls(peCreds)) {
      throw ERROR_PE_CREDENTIAL_MISSING()
    }
    const gabiPresentation = await identity.claimer.buildCombinedPresentation({
      credentials: peCreds,
      combinedPresentationReq: request.content.peRequest,
      attesterPubKeys: attesterPubKeys.map(
        (ai: PublicAttesterIdentity) => ai.publicGabiKey
      ),
    })
    return new Message(
      {
        type: MessageBodyType.SUBMIT_CLAIMS_FOR_CTYPES_PE,
        content: gabiPresentation,
      },
      identity,
      verifier
    )
  }
  // otherwise we return a public presentation

  // get attributes requested by the verifier
  const requestedAttributes = request.content.peRequest
    .getRequestedProperties()
    .map((propsPerClaim: string[]) => finalizeReqProps(propsPerClaim))

  // create presentation for each credential
  const attestedClaims = credentials.map((cred, i) => {
    const presentation = cred.createPresentation(requestedAttributes[i])

    // remove to show as few as possible
    delete presentation.request.privacyEnhancement
    return presentation
  })

  return new Message(
    {
      type: MessageBodyType.SUBMIT_CLAIMS_FOR_CTYPES_PUBLIC,
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
  peSession: gabi.ClaimerAttestationSession | null
  requestForAttestation: IRequestForAttestation
}

/**
 * [ASYNC] Creates an [[IRequestAttestationForClaim]] using the provided [[IInitiateAttestation]].
 *
 * @param claim The [[Claim]] which should get attested.
 * @param identity The Claimer's [[Identity]] which owns the [[Claim]].
 * @param attesterPubKey The privacy enhanced public key of the [[AttesterIdentity]] which should attest the [[Claim]].
 * @param option The option object.
 * @param option.legitimations An Array of [[AttestedClaim]] objects of the Attester which the Claimer requests to
 * include into the [[Attestation]] as legitimations.
 * @param option.delegationId The unique identifier of the desired delegation.
 * @param option.initiateAttestationMsg The message which the Claimer received from the [[AttesterIdentity]]
 *  after executing [[initiateAttestation]].
 * @returns An [[IRequestAttestationForClaim]] and a ClaimerAttestationSession which together with an [[ISubmitAttestationForClaim]]
 * object can be used to create a [[Credential]].
 */
export async function requestAttestation(
  claim: IClaim,
  identity: Identity,
  attesterPubKey: PublicAttesterIdentity,
  option: {
    legitimations?: AttestedClaim[]
    delegationId?: IDelegationBaseNode['id']
    initiateAttestationMsg?: IMessage
  } = {}
): Promise<{
  message: Message
  session: ClaimerAttestationSession
}> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { initiateAttestationMsg, ...strippedOption } = option
  if (
    typeof initiateAttestationMsg !== 'undefined' &&
    initiateAttestationMsg.body.type !== MessageBodyType.INITIATE_ATTESTATION
  ) {
    throw ERROR_MESSAGE_TYPE(
      initiateAttestationMsg.body.type,
      MessageBodyType.INITIATE_ATTESTATION
    )
  }
  const mappedOptions = {
    attesterPubKey: attesterPubKey ? attesterPubKey.publicGabiKey : undefined,
    initiateAttestationMsg: initiateAttestationMsg
      ? (initiateAttestationMsg.body as IInitiateAttestation)
      : undefined,
    ...strippedOption,
  }
  const {
    message: request,
    session,
  } = await RequestForAttestation.fromClaimAndIdentity(
    claim,
    identity,
    mappedOptions
  )
  const message: IRequestAttestationForClaim = {
    content: {
      requestForAttestation: request,
    },
    type: MessageBodyType.REQUEST_ATTESTATION_FOR_CLAIM,
  }

  return {
    message: new Message(message, identity, attesterPubKey),
    session: {
      peSession: session,
      requestForAttestation: request,
    },
  }
}

/**
 * [ASYNC] Builds a [[Credential]] which can be verified when used in [[createPresentation]].
 *
 * @param identity The Claimer's [[Identity]] which owns the [[AttestedClaim]].
 * @param message The session object corresponding to the [[ISubmitAttestationForClaim]].
 * @param session The ClaimerAttestationSession which corresponds to the message and [[AttestedClaim]].
 * @returns A signed and valid [[Credential]].
 */
export async function buildCredential(
  identity: Identity,
  message: IMessage,
  session: ClaimerAttestationSession
): Promise<Credential> {
  if (message.body.type !== MessageBodyType.SUBMIT_ATTESTATION_FOR_CLAIM) {
    throw ERROR_MESSAGE_TYPE(
      message.body.type,
      MessageBodyType.SUBMIT_ATTESTATION_FOR_CLAIM
    )
  }
  return Credential.fromRequestAndAttestation(
    identity,
    session.requestForAttestation,
    message.body.content.attestation,
    session.peSession,
    message.body.content.attestationPE
  )
}
