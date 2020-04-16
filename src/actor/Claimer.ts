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

const log = LoggerFactory.getLogger('Claimer')

function noNulls<T>(array: Array<T | null>): array is T[] {
  return array.every((c) => c !== null)
}

function parseArgsForKilt(args: string[]): string[] {
  return args
    .map((arg) => arg.replace('claim.contents.', ''))
    .filter((arg: string) => {
      if (arg.match(/claim\.cTypeHash/)) {
        log.warn('Cannot remove cTypeHash from claim.')
        return false
      }
      return true
    })
}

export async function createPresentation(
  identity: Identity,
  request: IRequestClaimsForCTypes,
  attestedClaims: AttestedClaim[],
  attesterPubKeys: gabi.AttesterPublicKey[],
  forcePE = true
): Promise<ISubmitClaimsForCTypes> {
  if (!request.content.allowPE && forcePE) {
    throw new Error(
      'Verifier requested public presentation, but privacy enhancement was forced.'
    )
  }

  if (request.content.allowPE) {
    const credentials = attestedClaims.map((c) => c.credential)
    if (!noNulls(credentials)) {
      throw new Error('Missing credential for privacy enhanced presentation.')
    }
    const gabiPresentation = await identity.claimer.buildCombinedPresentation({
      credentials,
      combinedPresentationReq: request.content.peRequest,
      attesterPubKeys,
    })
    return {
      type: MessageBodyType.SUBMIT_CLAIMS_FOR_CTYPES_PE,
      content: gabiPresentation,
    }
  }

  const requestedAttributes = request.content.peRequest
    .getRequestedProperties()
    .map((propsPerClaim) => parseArgsForKilt(propsPerClaim))

  return {
    type: MessageBodyType.SUBMIT_CLAIMS_FOR_CTYPES_PUBLIC,
    content: attestedClaims.map((ac, i) => {
      const allAttrs = ac.getAttributes()
      requestedAttributes[i].forEach((attr) => allAttrs.delete(attr))
      const p = ac.createPresentation(Array.from(allAttrs))
      delete p.credential
      delete p.request.privacyEnhanced
      return p
    }),
  }
}

type ClaimerAttestationSession = {
  peSession: gabi.ClaimerAttestationSession | null
  requestForAttestation: IRequestForAttestation
}

export async function requestAttestation(parameter: {
  claim: IClaim
  identity: Identity
  legitimations?: AttestedClaim[]
  delegationId?: IDelegationBaseNode['id']
  initiateAttestationMsg?: IInitiateAttestation
  attesterPubKey?: gabi.AttesterPublicKey
}): Promise<{
  message: IRequestAttestationForClaim
  session: ClaimerAttestationSession
}> {
  const [request, session] = await RequestForAttestation.fromClaimAndIdentity(
    parameter
  )
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

export function buildAttestedClaim(
  identity: Identity,
  message: ISubmitAttestationForClaim,
  session: ClaimerAttestationSession
): Promise<AttestedClaim> {
  return AttestedClaim.fromRequestAndAttestation(
    identity,
    session.requestForAttestation,
    message.content.attestation,
    session.peSession,
    message.content.attestationPE
  )
}
