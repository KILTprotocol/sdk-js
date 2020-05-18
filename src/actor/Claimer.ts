import * as gabi from '@kiltprotocol/portablegabi'
import RequestForAttestation from '../requestforattestation/RequestForAttestation'
import IClaim from '../types/Claim'
import { IDelegationBaseNode } from '../types/Delegation'
import {
  ISubmitClaimsForCTypes,
  IRequestClaimsForCTypes,
  MessageBodyType,
  IInitiateAttestation,
  IRequestAttestationForClaim,
  ISubmitAttestationForClaim,
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

function parseArgsForKilt(args: string[]): string[] {
  return args
    .map(arg => arg.replace('claim.contents.', ''))
    .filter((arg: string) => {
      if (arg.match(/claim\.cTypeHash/)) {
        log.warn('Cannot remove cTypeHash from claim.')
        return false
      }
      return true
    })
}

/**
 * Creates presentations for a verifier which only reveals the requested attributes.
 *
 * @param credentials The [[Credential]]s you want to present to the verifier.
 * @param requestedAttributes The attributes you publicly show and which were requested by the verifier.
 *
 * @returns An array of [[AttestedClaim]]s which can be verified.
 */
function whitelistAttributes(
  credentials: Credential[],
  requestedAttributes: string[][]
): AttestedClaim[] {
  return credentials.map((cred, i) => {
    // get clone of all attributes inside the credential as set
    const allAtts = cred.getAttributes()

    // remove each requested attribute
    requestedAttributes[i].forEach((attr: string) => allAtts.delete(attr))
    const hiddenAtts = Array.from(allAtts)

    // create presentation based on excluded attributes
    const presentation = cred.createPresentation(hiddenAtts)

    // remove to show as few as possible
    delete presentation.request.privacyEnhanced
    return presentation
  })
}

/**
 * [ASYNC] Creates a presentation for an arbitrary amount of [[Credential]]s which can be verified in [[verifyPresentation]].
 *
 * @param identity The Claimer [[Identity]] which owns the [[Credential]]s.
 * @param request The message which represents multiple [[CType]]s, [[IRequestClaimsForCTypes]]s and whether privacy
 * enhancement is supported.
 * @param credentials The [[Credential]]s which should be verified.
 * @param attesterPubKeys The privacy enhanced public keys of all [[AttesterIdentity]]s which signed the [[Credential]]s.
 * @param forcePE A boolean to force privacy enhancement.
 * @returns A message which represents either an array of [[AttestedClaim]]s if privacy enhancement is not supported
 * or a CombinedPresentation. Both of these options can be verified.
 */
export async function createPresentation(
  identity: Identity,
  request: IRequestClaimsForCTypes,
  credentials: Credential[],
  attesterPubKeys: PublicAttesterIdentity[],
  forcePE = true
): Promise<ISubmitClaimsForCTypes> {
  if (!request.content.allowPE && forcePE) {
    throw new Error(
      'Verifier requested public presentation, but privacy enhancement was forced.'
    )
  }

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
    return {
      type: MessageBodyType.SUBMIT_CLAIMS_FOR_CTYPES_PE,
      content: gabiPresentation,
    }
  }

  const requestedAttributes = request.content.peRequest
    .getRequestedProperties()
    .map((propsPerClaim: any[]) => parseArgsForKilt(propsPerClaim))

  const attestedClaims = whitelistAttributes(credentials, requestedAttributes)

  return {
    type: MessageBodyType.SUBMIT_CLAIMS_FOR_CTYPES_PUBLIC,
    content: attestedClaims,
  }
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
type ClaimerAttestationSession = {
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
  legitimations?: AttestedClaim[]
  delegationId?: IDelegationBaseNode['id']
  initiateAttestationMsg?: IInitiateAttestation
  attesterPubKey?: PublicAttesterIdentity
}): Promise<{
  message: IRequestAttestationForClaim
  session: ClaimerAttestationSession
}> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { attesterPubKey, ...paramsNoPubKey } = parameter
  const mappedParams = {
    attesterPubKey: parameter.attesterPubKey
      ? parameter.attesterPubKey.publicGabiKey
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
    message,
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
  message: ISubmitAttestationForClaim,
  session: ClaimerAttestationSession
): Promise<Credential> {
  return Credential.fromRequestAndAttestation(
    identity,
    session.requestForAttestation,
    message.content.attestation,
    session.peSession,
    message.content.attestationPE
  )
}
