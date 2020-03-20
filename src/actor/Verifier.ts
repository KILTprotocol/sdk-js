import * as gabi from '@kiltprotocol/portablegabi'
import CType from '../ctype/CType'
import {
  IRequestClaimsForCTypes,
  MessageBodyType,
  ISubmitClaimsForCTypes,
} from '../messaging/Message'
import AttestedClaim from '../attestedclaim/AttestedClaim'

export class PresentationRequestBuilder {
  private builder: gabi.CombinedRequestBuilder
  private ctypes: Array<CType['hash']>
  constructor() {
    this.builder = new gabi.CombinedRequestBuilder()
    this.ctypes = []
  }

  public requestPresentationForCtype({
    ctypeHash,
    attributes,
    legitimations,
    delegationId,
    reqUpdatedAfter,
  }: {
    attributes: string[]
    ctypeHash: CType['hash']
    legitimations?: boolean
    delegationId?: boolean
    reqUpdatedAfter?: Date
  }): PresentationRequestBuilder {
    const rawAttribute = attributes.map(attr => `claim.contents.${attr}`)
    rawAttribute.push('claim.cTypeHash')
    if (typeof legitimations !== 'undefined' && legitimations) {
      rawAttribute.push('legitimation')
    }
    if (typeof delegationId !== 'undefined' && delegationId) {
      rawAttribute.push('delegationId')
    }
    this.builder.requestPresentation({
      requestedAttributes: rawAttribute,
      reqUpdatedAfter,
    })
    this.ctypes.push(ctypeHash)
    return this
  }

  public async finalize(
    allowPE: boolean
  ): Promise<[gabi.CombinedVerificationSession, IRequestClaimsForCTypes]> {
    const { session, message } = await this.builder.finalise()
    return [
      session,
      {
        type: MessageBodyType.REQUEST_CLAIMS_FOR_CTYPES,
        content: {
          ctypes: this.ctypes,
          peRequest: message,
          allowPE,
        },
      },
    ]
  }
}

export function newRequest(): PresentationRequestBuilder {
  return new PresentationRequestBuilder()
}

export async function verifyPresentation(
  presentation: ISubmitClaimsForCTypes,
  session?: gabi.CombinedVerificationSession,
  latestAccumulators?: gabi.Accumulator[],
  attesterPubKeys?: gabi.AttesterPublicKey[]
): Promise<[boolean, any[]]> {
  if (presentation.type === MessageBodyType.SUBMIT_CLAIMS_FOR_CTYPES_PUBLIC) {
    const attestedClaims = presentation.content.map(
      AttestedClaim.fromAttestedClaim
    )
    const allVerified = await Promise.all(attestedClaims.map(ac => ac.verify()))
    return [allVerified.every(b => b), attestedClaims]
  }
  if (presentation.type === MessageBodyType.SUBMIT_CLAIMS_FOR_CTYPES_PE) {
    if (
      typeof session === 'undefined' ||
      typeof latestAccumulators === 'undefined' ||
      typeof attesterPubKeys === 'undefined'
    ) {
      throw new Error(`Received privacy enhanced presentation. Require:
      Session: ${session}
      accumulators: ${latestAccumulators}
      public keys: ${attesterPubKeys}`)
    }
    const { verified, claims } = await gabi.Verifier.verifyCombinedPresentation(
      {
        proof: presentation.content,
        verifierSession: session,
        latestAccumulators,
        attesterPubKeys,
      }
    )
    return [verified, claims]
  }
  return [false, []]
}
