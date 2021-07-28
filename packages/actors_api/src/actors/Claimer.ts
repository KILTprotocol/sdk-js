/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @packageDocumentation
 * @module Claimer
 */

import {
  AttestedClaim,
  Identity,
  RequestForAttestation,
  SDKErrors,
} from '@kiltprotocol/core'
import type {
  IClaim,
  IMessage,
  IRequestAttestationForClaim,
  IDelegationNode,
  IPublicIdentity,
  IRequestForAttestation,
} from '@kiltprotocol/types'
import Message from '@kiltprotocol/messaging'

/**
 * Creates a presentation for an arbitrary amount of [[AttestedClaim]]s which can be verified in [[verifyPresentation]].
 *
 * @param identity The Claimer [[Identity]] which owns the [[AttestedClaim]]s.
 * @param message The message which represents multiple [[CType]]s, [[IRequestClaimsForCTypes]]s and whether privacy
 * enhancement is supported.
 * @param verifier The [[IPublicIdentity]] of the verifier that requested the presentation.
 * @param credentials The [[AttestedClaim]]s which should be verified.
 * @throws [[ERROR_PE_MISMATCH]], [[ERROR_MESSAGE_TYPE]], [[ERROR_PE_CREDENTIAL_MISSING]].
 * @returns A message which represents either an array of [[AttestedClaim]]s if privacy enhancement is not supported
 * or a combined presentation. Both of these options can be verified.
 */
export function createPresentation(
  identity: Identity,
  message: IMessage,
  verifier: IPublicIdentity,
  credentials: AttestedClaim[]
): Message {
  // did we get the right message type?
  if (message.body.type !== Message.BodyType.REQUEST_CLAIMS_FOR_CTYPES) {
    throw SDKErrors.ERROR_MESSAGE_TYPE(
      message.body.type,
      Message.BodyType.REQUEST_CLAIMS_FOR_CTYPES
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
      type: Message.BodyType.SUBMIT_CLAIMS_FOR_CTYPES,
      content: attestedClaims,
    },
    identity.getPublicIdentity(),
    verifier
  )
}

/**
 * The Claimer's [[ClaimerAttestationSession]] session object which is returned in [[requestAttestation]] and required in [[buildCredential]].
 *
 * It includes all [[Claim]] data required for an [[Attestation]]: the [[Claim]], the Claimer's signature,
 * the claimHashTree, the [[cTypeHash]], the unique identifier for the delegation,
 * an array of [[AttestedClaim]]s and the rootHash.
 *
 * In case of enabled privacy enhancement, both the Claimer's Attestation session
 * and the Attester's message from [[issueAttestation]] are included as well.
 * Both of these objects are required for privacy enhancement to prevent replay attacks.
 */
export type ClaimerAttestationSession = {
  requestForAttestation: IRequestForAttestation
}

/**
 * Creates a [[Message]] containing the [[IRequestAttestationForClaim]] generated from the provided [[IClaim]].
 *
 * @param claim The [[Claim]] which should get attested.
 * @param identity The Claimer's [[Identity]] which owns the [[Claim]].
 * @param attesterPublicIdentity The public identity of the attester which should attest the [[Claim]].
 * @param option The option object.
 * @param option.legitimations An Array of [[AttestedClaim]] objects of the Attester which the Claimer requests to
 * include into the [[Attestation]] as legitimations.
 * @param option.delegationId The unique identifier of the desired delegation.
 * @returns A message containing an [[IRequestAttestationForClaim]] and a [[ClaimerAttestationSession]] which together with an [[ISubmitAttestationForClaim]]
 * object can be used to create an [[AttestedClaim]].
 */
export function requestAttestation(
  claim: IClaim,
  identity: Identity,
  attesterPublicIdentity: IPublicIdentity,
  option: {
    legitimations?: AttestedClaim[]
    delegationId?: IDelegationNode['id']
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
    type: Message.BodyType.REQUEST_ATTESTATION_FOR_CLAIM,
  }

  return {
    message: new Message(
      message,
      identity.getPublicIdentity(),
      attesterPublicIdentity
    ),
    session: { requestForAttestation: request },
  }
}

/**
 * Builds a [[AttestedClaim]] which can be verified when used in [[createPresentation]].
 *
 * @param message The session object corresponding to the [[ISubmitAttestationForClaim]].
 * @param session The [[ClaimerAttestationSession]] which corresponds to the message and [[AttestedClaim]].
 * @returns A signed and valid [[AttestedClaim]].
 */
export function buildCredential(
  message: IMessage,
  session: ClaimerAttestationSession
): AttestedClaim {
  if (message.body.type !== Message.BodyType.SUBMIT_ATTESTATION_FOR_CLAIM) {
    throw SDKErrors.ERROR_MESSAGE_TYPE(
      message.body.type,
      Message.BodyType.SUBMIT_ATTESTATION_FOR_CLAIM
    )
  }
  return AttestedClaim.fromRequestAndAttestation(
    session.requestForAttestation,
    message.body.content.attestation
  )
}
