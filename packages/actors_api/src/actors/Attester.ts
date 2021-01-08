import {
  BlockchainUtils,
  Attestation,
  IMessage,
  IRequestAttestationForClaim,
  Message,
  MessageBodyType,
  PublicIdentity,
  SDKErrors,
  Identity,
  IAttestation,
} from '@kiltprotocol/core'

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
 * @throws [[ERROR_MESSAGE_TYPE]].
 * @returns The [[Attestation]] object which should be sent to the Claimer and
 * a witness which can be used to revoke the [[Attestation]] in [[revokeAttestation]].
 */
export async function issueAttestation(
  attester: Identity,
  message: IMessage,
  claimer: PublicIdentity
): Promise<{
  revocationHandle: IRevocationHandle
  message: Message
}> {
  if (message.body.type !== MessageBodyType.REQUEST_ATTESTATION_FOR_CLAIM) {
    throw SDKErrors.ERROR_MESSAGE_TYPE(
      message.body.type,
      MessageBodyType.REQUEST_ATTESTATION_FOR_CLAIM
    )
  }

  const request: IRequestAttestationForClaim = message.body
  // Lets continue with the original object
  const attestation = Attestation.fromRequestAndPublicIdentity(
    request.content.requestForAttestation,
    attester.getPublicIdentity()
  )

  await attestation
    .store(attester)
    .then((tx) => BlockchainUtils.submitTxWithReSign(tx, attester))

  const revocationHandle = { claimHash: attestation.claimHash }
  return {
    message: new Message(
      {
        content: {
          attestation,
        },
        type: MessageBodyType.SUBMIT_ATTESTATION_FOR_CLAIM,
      },
      attester,
      claimer
    ),
    revocationHandle,
  }
}

/**
 * [ASYNC] Revokes an [[Attestation]] created in [[issueAttestation]].
 *
 * @param attester The [[AttesterIdentity]] which signed the [[Attestation]] in [[issueAttestation]].
 * @param attestation The unique witness for the [[Attestation]] which was created in [[issueAttestation]].
 * @param revocationHandle
 */
export async function revokeAttestation(
  attester: Identity,
  revocationHandle: IRevocationHandle
): Promise<void> {
  await Attestation.revoke(revocationHandle.claimHash, attester).then((tx) =>
    BlockchainUtils.submitTxWithReSign(tx, attester)
  )
}
