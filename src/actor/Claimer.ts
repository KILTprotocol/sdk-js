import * as gabi from '@kiltprotocol/portablegabi'
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
import { factory as LoggerFactory } from '../config/ConfigLog'
import Credential from '../credential/Credential'
import PublicAttesterIdentity from '../attesteridentity/PublicAttesterIdentity'

const log = LoggerFactory.getLogger('Claimer')

function noNulls<T>(array: Array<T | null>): array is T[] {
  return array.every(c => c !== null)
}

/**
 * Prepares the requested properties of a [[Claim]] to have the final structure required in [[createPresentation]].
 *
 * @param props The properties of the [[Claim]] which where requested to be publicly shown by the verifier.
 *
 * @returns All properties which can be publicly shown in the correct format.
 */
function finalizeReqProps(props: string[]): string[] {
  return props.reduce((finalProps: string[], prop: string) => {
    const attribute = prop.replace('claim.contents.', '')
    if (attribute.match(/claim\.cTypeHash/)) {
      log.warn('Cannot remove cTypeHash from claim.')
      return finalProps
    }
    return [...finalProps, attribute]
  }, [])
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
    throw new Error(
      `Expected message type '${MessageBodyType.REQUEST_CLAIMS_FOR_CTYPES}' but got type '${message.body.type}'`
    )
  }

  // If privacy enhancement was required, but is not allowed, we can't create a presentation.
  if (!message.body.content.allowPE && requirePE) {
    throw new Error(
      'Verifier requested public presentation, but privacy enhancement was forced.'
    )
  }
  const request = message.body

  // if privacy enhancement is allowed, we return a privacy enhanced presentation
  if (request.content.allowPE) {
    const peCreds = credentials.map(c => c.privacyCredential)
    if (!noNulls(peCreds)) {
      throw new Error('Missing privacy enhanced credential')
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
    delete presentation.request.privacyEnhanced
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
 * The Claimer's [[Attestation]] session object which is returned in [[requestAttestations]] and required in [[buildCredential]].
 *
 * It includes all [[Claim]] data required for an [[Attestation]]: The [[Claim]], the Claimer's signature,
 * the [[claimHashTree]], the [[cTypeHash]], the unique identifier for the delegation,
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
 * @param parameter The parameter object.
 * @param parameter.claim The [[Claim]] which should get attested.
 * @param parameter.identity The Claimer's [[Identity]] which owns the [[Claim]].
 * @param parameter.legitimations An Array of [[AttestedClaim]] objects of the Attester which the Claimer requests to
 * include into the [[Attestation]] as legitimations.
 * @param parameter.delegationId The unique identifier of the desired delegation.
 * @param parameter.initiateAttestationMsg The message which the Claimer received from the [[AttesterIdentity]]
 *  after executing [[initiateAttestation]].
 * @param parameter.attesterPubKey The privacy enhanced public key of the [[AttesterIdentity]] which should attest the [[Claim]].
 * @returns An [[IRequestAttestationForClaim]] and a ClaimerAttestationSession which together with an [[ISubmitAttestationForClaim]]
 * object can be used to create a [[Credential]].
 */
export async function requestAttestation(parameter: {
  claim: IClaim
  identity: Identity
  attesterPubKey: PublicAttesterIdentity
  legitimations?: AttestedClaim[]
  delegationId?: IDelegationBaseNode['id']
  initiateAttestationMsg?: IMessage
}): Promise<{
  message: Message
  session: ClaimerAttestationSession
}> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const {
    attesterPubKey,
    initiateAttestationMsg,
    ...paramsNoPubKey
  } = parameter
  if (
    typeof initiateAttestationMsg !== 'undefined' &&
    initiateAttestationMsg.body.type !== MessageBodyType.INITIATE_ATTESTATION
  ) {
    throw new Error(
      `Expected message type '${MessageBodyType.INITIATE_ATTESTATION}' but got type '${initiateAttestationMsg.body.type}'`
    )
  }
  const mappedParams = {
    attesterPubKey: attesterPubKey ? attesterPubKey.publicGabiKey : undefined,
    initiateAttestationMsg: initiateAttestationMsg
      ? (initiateAttestationMsg.body as IInitiateAttestation)
      : undefined,
    ...paramsNoPubKey,
  }
  const {
    message: request,
    session,
  } = await RequestForAttestation.fromClaimAndIdentity(mappedParams)
  const message: IRequestAttestationForClaim = {
    content: {
      requestForAttestation: request,
    },
    type: MessageBodyType.REQUEST_ATTESTATION_FOR_CLAIM,
  }

  return {
    message: new Message(message, parameter.identity, parameter.attesterPubKey),
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
    throw new Error(
      `Expected message type '${MessageBodyType.SUBMIT_ATTESTATION_FOR_CLAIM}' but got type '${message.body.type}'`
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
