/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @packageDocumentation
 * @module Attester
 */

import {
  Attestation,
  SDKErrors,
  DelegationNodeUtils,
  RequestForAttestation,
} from '@kiltprotocol/core'
import type {
  IAttestation,
  IDidDetails,
  IDidResolver,
  IMessage,
  IRequestAttestationForClaim,
  KeystoreSigner,
  SubmittableExtrinsic,
} from '@kiltprotocol/types'
import Message from '@kiltprotocol/messaging'
import { DidDetails, DefaultResolver } from '@kiltprotocol/did'

export interface IRevocationHandle {
  claimHash: IAttestation['claimHash']
}

/**
 * [ASYNC] Initiates the [[Attestation]] session.
 *
 * @param identity The [[Identity]] representing the entity which is eligible to attest and sign the [[Claim]].
 * @param claimer The [[PublicIdentity]] representing the entity which is eligible to attest and sign the [[Claim]].
 * @returns A session and a message object.
 * The **message** should be sent over to the Claimer to be used in [[requestAttestation]].
 * The **session** should be kept private and used in [[issueAttestation]].
 */
// export async function initiateAttestation(
//   identity: Identity,
//   claimer: IPublicIdentity
// ): Promise<{
//   message: Message
// }> {
//   return {
//     message: new Message(messageBody, identity, claimer),
//   }
// }

/**
 * [ASYNC] Creates an [[Attestation]] for the [[Claim]] inside the request.
 *
 * @param attester The [[Identity]] representing the entity which should attest the [[Claim]].
 * @param message The message result of the Claimer's attestation request in [[requestAttestation]].
 * @param claimer The [[PublicIdentity]] of the claimer. This is also the receiver of the returned message.
 * @param signer
 * @param root0
 * @param root0.claimerDetails
 * @param root0.resolver
 * @param signer.claimerDetails
 * @param signer.resolver
 * @throws [[ERROR_MESSAGE_TYPE]].
 * @returns The [[Message]] object containing the [[Attestation]] which should be sent to the Claimer and
 * a handle which can be used to revoke the [[Attestation]] in [[revokeAttestation]].
 */
export async function issueAttestation(
  message: IMessage,
  attester: DidDetails,
  signer: KeystoreSigner,
  {
    claimerDetails,
    resolver = DefaultResolver,
  }: { claimerDetails?: IDidDetails; resolver?: IDidResolver } = {}
): Promise<{
  revocationHandle: IRevocationHandle
  message: Message
  addAttestationExtrinsic: SubmittableExtrinsic
}> {
  if (message.body.type !== Message.BodyType.REQUEST_ATTESTATION_FOR_CLAIM) {
    throw SDKErrors.ERROR_MESSAGE_TYPE(
      message.body.type,
      Message.BodyType.REQUEST_ATTESTATION_FOR_CLAIM
    )
  }

  const request: IRequestAttestationForClaim = message.body

  // fetch claimer DID details if not passed in
  const claimer =
    claimerDetails ||
    (await resolver?.resolve({
      did: request.content.requestForAttestation.claim.owner,
    }))

  // make sure claimer details are available
  if (!claimer) {
    throw SDKErrors.ERROR_NOT_FOUND(
      'Claimer DID details missing and could not be resolved'
    )
  }
  // verify claimer signature over request for attestation
  if (
    !RequestForAttestation.verifySignature(
      request.content.requestForAttestation,
      { claimerDid: claimer }
    )
  ) {
    throw SDKErrors.ERROR_SIGNATURE_UNVERIFIABLE()
  }
  // build attestation object
  const attestation = Attestation.fromRequestAndDid(
    request.content.requestForAttestation,
    attester.did
  )
  // build submittable that writes attestation to chain
  const tx = await attestation.store()
  const addAttestationExtrinsic = await attester.authorizeExtrinsic(tx, signer)

  const outgoingMessage = new Message(
    {
      content: {
        attestation,
      },
      type: Message.BodyType.SUBMIT_ATTESTATION_FOR_CLAIM,
    },
    attester.did,
    claimer.did
  )

  const revocationHandle = { claimHash: attestation.claimHash }
  return {
    message: outgoingMessage,
    revocationHandle,
    addAttestationExtrinsic,
  }
}

/**
 * [ASYNC] Revokes an [[Attestation]] created in [[issueAttestation]].
 *
 * @param attester The attester DID which signed the [[Attestation]] in [[issueAttestation]].
 * @param revocationHandle A reference to the [[Attestation]] which was created in [[issueAttestation]].
 * @param signer
 * @throws [[ERROR_UNAUTHORIZED]], [[ERROR_NOT_FOUND]].
 */
export async function revokeAttestation(
  attester: DidDetails,
  revocationHandle: IRevocationHandle,
  signer: KeystoreSigner
): Promise<SubmittableExtrinsic> {
  const attestation = await Attestation.query(revocationHandle.claimHash)

  if (attestation === null) {
    throw SDKErrors.ERROR_NOT_FOUND('Attestation not on chain')
  }
  // count the number of steps we have to go up the delegation tree for calculating the transaction weight
  const delegationTreeTraversalSteps = await DelegationNodeUtils.countNodeDepth(
    attester.did,
    attestation
  )

  const tx = await Attestation.revoke(
    revocationHandle.claimHash,
    delegationTreeTraversalSteps
  )
  return attester.authorizeExtrinsic(tx, signer)
}
