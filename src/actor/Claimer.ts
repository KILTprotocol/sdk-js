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

export async function createPresentation(
  identity: Identity,
  request: IRequestClaimsForCTypes,
  credentials: Credential[],
  attesterPubKeys: gabi.AttesterPublicKey[],
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
      attesterPubKeys,
    })
    return {
      type: MessageBodyType.SUBMIT_CLAIMS_FOR_CTYPES_PE,
      content: gabiPresentation,
    }
  }

  const requestedAttributes = request.content.peRequest
    .getRequestedProperties()
    .map(propsPerClaim => parseArgsForKilt(propsPerClaim))

  return {
    type: MessageBodyType.SUBMIT_CLAIMS_FOR_CTYPES_PUBLIC,
    content: credentials.map((cred, i) => {
      const allAttrs = cred.getAttributes()
      requestedAttributes[i].forEach(attr => allAttrs.delete(attr))
      const p = cred.createPresentation(Array.from(allAttrs))
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

export function buildCredential(
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
