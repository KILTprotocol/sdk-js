/**
 * @packageDocumentation
 * @module Verifier
 */

import { AttestedClaim, CType, SDKErrors, Identity } from '@kiltprotocol/core'
import { ConfigService } from '@kiltprotocol/config'
import type {
  IPublicIdentity,
  IAttestedClaim,
  IRequestForAttestation,
  IMessage,
  IRequestClaimsForCTypesContent,
} from '@kiltprotocol/types'
import Message from '@kiltprotocol/messaging'

const log = ConfigService.LoggingFactory.getLogger('Verifier')

export interface IPresentationReq {
  properties: string[]
  ctypeHash?: CType['hash']
  legitimations?: boolean
  delegation?: boolean
  requestUpdatedAfter?: Date
}

export interface IPartialRequest {
  ctype: CType['hash']
  properties: string[]
}

export interface IVerifierSession {
  requestedProperties: IPartialRequest[]
}

/**
 * A helper class to initiate a verification by creating a presentation request which is built
 * on a specific [[CType]] and attributes of the [[Claim]] the verifier requires to see.
 */
export class PresentationRequestBuilder {
  private partialReq: IPartialRequest[]
  constructor() {
    this.partialReq = []
  }

  /**
   * Initiates a verification by creating a presentation request for a specific [[CType]].
   * Note that you are required to call [[finalize]] on the request to conclude it.
   *
   * @param p The parameter object.
   * @param p.ctypeHash The SHA-256 hash of the [[CType]].
   * @param p.properties A list of properties of the [[Credential]]s the verifier has to see in order to verify it.
   * @param p.legitimations An optional boolean representing whether the verifier requests to see the legitimations of the attesters which signed the [[Credential]]s.
   * @param p.delegation An optional boolean representing whether the verifier requests to see the attesters' unique delegation identifiers.
   * The default value for this is the current date.
   * @returns A [[PresentationRequestBuilder]] on which you need to call [[finalize]] to complete the presentation request.
   */
  public requestPresentationForCtype({
    ctypeHash,
    properties,
    legitimations,
    delegation,
  }: IPresentationReq): PresentationRequestBuilder {
    // since we are building always a pe request, we need to translate the attribute names to
    // absolute property paths. The PE credential contains a RequestForAttestation
    const rawProperties = properties.map((attr) => `claim.contents.${attr}`)
    if (typeof ctypeHash !== 'undefined') {
      rawProperties.push('claim.cTypeHash')
    }
    if (legitimations === true) {
      rawProperties.push('legitimation')
    }
    if (delegation === true) {
      rawProperties.push('delegationId')
    }
    if (!ctypeHash) throw SDKErrors.ERROR_CTYPE_HASH_NOT_PROVIDED()
    this.partialReq.push({
      ctype: ctypeHash,
      properties: rawProperties,
    })
    return this
  }

  /**
   * Concludes the presentation request.
   *
   * @param verifier The [[Identity]] of the verifier used to sign.
   * @param claimer The [[IPublicIdentity]] for which the message should be encrypted (note: the message will be return unencrypted. Use Message.getEncryptedMessage to encrypt the message).
   * @returns A session and a message object.
   * The **session** object will be used in [[verifyPresentation]] and should be kept private by the verifier.
   * The **message** object should be sent to the Claimer and used in [[createPresentation]].
   */
  public finalize(
    verifier: Identity,
    claimer: IPublicIdentity
  ): {
    session: IVerifierSession
    message: Message
  } {
    return {
      session: {
        requestedProperties: this.partialReq,
      },
      message: new Message(
        {
          type: Message.BodyType.REQUEST_CLAIMS_FOR_CTYPES,
          content: this.partialReq.map(
            (pr): IRequestClaimsForCTypesContent => {
              return { cTypeHash: pr.ctype, requiredProperties: pr.properties }
            }
          ),
        },
        verifier,
        claimer
      ),
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
 * [ASYNC] Checks that the submitted attestations fulfil the ones requested upon presentation creation.
 *
 * @param attestedClaims The attested claims submitted by the claimer.
 * @param session The stored session object.
 * @returns An object describing whether the verification was successful.
 */
async function verifyPublicPresentation(
  attestedClaims: AttestedClaim[],
  session: IVerifierSession
): Promise<{
  verified: boolean
  claims: Array<Partial<IAttestedClaim>>
}> {
  if (attestedClaims.length !== session.requestedProperties.length) {
    log.info(
      `Rejected presentation because number of attested claims (${attestedClaims.length}) did not match number of requested claims (${session.requestedProperties.length}).`
    )
    return {
      verified: false,
      claims: [],
    }
  }

  const allVerified = await Promise.all(
    session.requestedProperties.map(async (requested, i) => {
      const ac = attestedClaims[i]
      const providedProperties = ac.getAttributes()
      // map the KILT Style properties to Gabi style properties
      const rawProperties = Array.from(providedProperties.keys()).map(
        (prop) => `claim.contents.${prop}`
      )
      // FIXME: types are strange. if you can remove them, the claim types are wrong...
      rawProperties.push('claim.cTypeHash')
      rawProperties.push('claim.owner')
      return (
        requested.properties.every((p) => {
          return rawProperties.includes(p)
        }) && ac.verify()
      )
    })
  )
  const verified = !allVerified.includes(false)
  return { verified, claims: verified ? attestedClaims : [] }
}

/**
 * [ASYNC] Verifies the Claimer's presentation of [[Credential]]s.
 *
 * @param message The Claimer's presentation of the [[Credential]]s that should be verified, the result of [[createPresentation]].
 * @param session The Verifier's private verification session created in [[finalize]].
 * @throws [[ERROR_MESSAGE_TYPE]].
 * @returns An object containing the keys
 * **verified** (which describes whether the [[Credential]]s could be verified)
 * and **claims** (an array of [[Claim]]s restricted on the disclosed attributes selected in [[requestPresentationForCtype]]).
 */
export async function verifyPresentation(
  message: IMessage,
  session: IVerifierSession
): Promise<{
  verified: boolean
  claims: Array<Partial<IRequestForAttestation | IAttestedClaim>>
}> {
  // Must be SUBMIT_CLAIMS_FOR_CTYPES message type
  if (message.body.type !== Message.BodyType.SUBMIT_CLAIMS_FOR_CTYPES)
    throw SDKErrors.ERROR_MESSAGE_TYPE(
      message.body.type,
      Message.BodyType.SUBMIT_CLAIMS_FOR_CTYPES
    )
  const attestedClaims = message.body.content.map(
    AttestedClaim.fromAttestedClaim
  )
  // currently only supporting id-ed credentials
  return verifyPublicPresentation(attestedClaims, session)
}
