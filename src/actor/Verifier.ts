import * as gabi from '@kiltprotocol/portablegabi'
import CType from '../ctype/CType'
import {
  IRequestClaimsForCTypes,
  MessageBodyType,
  ISubmitClaimsForCTypes,
} from '../messaging/Message'
import AttestedClaim from '../attestedclaim/AttestedClaim'
import PublicAttesterIdentity from '../attesteridentity/PublicAttesterIdentity'

export interface IVerifierSession {
  privacyEnhancement: gabi.CombinedVerificationSession
  allowedPrivacyEnhancement: boolean
}

/**
 * A helper class to initiate a verification by creating a presentation request which is built
 * on a specific [[CType]] and attributes of the [[Claim]] the verifier requires to see.
 */
export class PresentationRequestBuilder {
  private builder: gabi.CombinedRequestBuilder
  private ctypes: Array<CType['hash']>
  constructor() {
    this.builder = new gabi.CombinedRequestBuilder()
    this.ctypes = []
  }

  /**
   * Initiates a verification by creating a presentation request for a specific [[CType]].
   * Note that you are required to call [[finalize]] on the request to conclude it.
   *
   * @param p The parameter object.
   * @param p.ctypehash The SHA-256 hash of the [[CType]].
   * @param p.properties A list of properties of the [[Credential]]s the Verifier has to see in order to verify it.
   * @param p.legitimations An optional boolean representing whether the Verifier requests to see the legitimations of the Attesters which signed the [[Credential]]s.
   * @param p.delegation An optional boolean representing whether the Verifier requests to see the Attesters' unique delegation identifiers.
   * @param p.requestUpdatedAfter The optional minimum required timestamp on which the [[Credential]] needs to be updated.
   * The default value for this is the current date.
   * @returns A [[PresentationRequestBuilder]] on which you need to call [[finalize]] to complete the presentation request.
   */
  public requestPresentationForCtype({
    ctypeHash,
    properties,
    legitimations,
    delegation,
    requestUpdatedAfter = new Date(),
  }: {
    properties: string[]
    ctypeHash: CType['hash']
    legitimations?: boolean
    delegation?: boolean
    requestUpdatedAfter?: Date
  }): PresentationRequestBuilder {
    const rawAttribute = properties.map(attr => `claim.contents.${attr}`)
    rawAttribute.push('claim.cTypeHash')
    if (typeof legitimations !== 'undefined' && legitimations) {
      rawAttribute.push('legitimation')
    }
    if (typeof delegation !== 'undefined' && delegation) {
      rawAttribute.push('delegationId')
    }
    this.builder.requestPresentation({
      requestedAttributes: rawAttribute,
      reqUpdatedAfter: requestUpdatedAfter,
    })
    this.ctypes.push(ctypeHash)
    return this
  }

  /**
   * [ASYNC] Concludes the presentation request.
   *
   * @param allowPE A boolean representing whether the verifier accepts a privacy enhanced presentation.
   * @returns A session and a message object.
   * The **session** object will be used in [[verifyPresentation]] and should be kept private by the verifier.
   * The **message** object should be sent to the Claimer and used in [[createPresentation]].
   */
  public async finalize(
    allowPE: boolean
  ): Promise<{
    session: IVerifierSession
    message: IRequestClaimsForCTypes
  }> {
    const { session, message } = await this.builder.finalise()
    return {
      session: {
        privacyEnhancement: session,
        allowedPrivacyEnhancement: allowPE,
      },
      message: {
        type: MessageBodyType.REQUEST_CLAIMS_FOR_CTYPES,
        content: {
          ctypes: this.ctypes,
          peRequest: message,
          allowPE,
        },
      },
    }
  }
}

/**
 * Initiates a verification by creating a request on the Verifier's side.
 *
 * @returns A [[PresentationRequestBuilder]] based on a [[CType]] and a list of required disclosed attributes of the [[Credential]]s.
 */
export function newRequestBuilder(): PresentationRequestBuilder {
  return new PresentationRequestBuilder()
}

/**
 * [ASYNC] Verifies the Claimer's presentation of [[Credential]]s.
 *
 * @param presentation The Claimer's presentation of the [[Credential]]s that should be verified, the result of [[createPresentation]].
 * @param session The Verifier's private verification session created in [[finalize]].
 * @param latestAccumulators The list of the latest accumulators for each [[Attester]] which signed a [[Credential]] of this presentation.
 * @param attesterPubKeys The privacy enhanced public keys of all [[AttesterIdentity]]s which signed the [[Credential]]s.
 * @returns An array representing
 * **at index 0** whether the [[Credential]]s could be verified
 * and **at index 1** an array of [[Claim]]s restricted on the disclosed attributes selected in [[requestPresentationForCtype]].
 */
export async function verifyPresentation(
  presentation: ISubmitClaimsForCTypes,
  session?: IVerifierSession,
  latestAccumulators?: gabi.Accumulator[],
  attesterPubKeys?: PublicAttesterIdentity[]
): Promise<{
  verified: boolean
  claims: any[]
}> {
  // If we got a public presentation, check that the attestation is valid
  if (presentation.type === MessageBodyType.SUBMIT_CLAIMS_FOR_CTYPES_PUBLIC) {
    const attestedClaims = presentation.content.map(
      AttestedClaim.fromAttestedClaim
    )
    const allVerified = await Promise.all(attestedClaims.map(ac => ac.verify()))
    return { verified: !allVerified.includes(false), claims: attestedClaims }
  }

  // if we got a privacy enhanced attestation, check that this was allowed by the verifier and
  // verify the attestation
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
    if (session.allowedPrivacyEnhancement) {
      const {
        verified,
        claims,
      } = await gabi.Verifier.verifyCombinedPresentation({
        proof: presentation.content,
        verifierSession: session.privacyEnhancement,
        latestAccumulators,
        attesterPubKeys: attesterPubKeys.map(
          (ai: PublicAttesterIdentity) => ai.publicGabiKey
        ),
      })
      return { verified, claims }
    }
  }
  return { verified: false, claims: [] }
}
