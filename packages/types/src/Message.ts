/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { AnyJson } from '@polkadot/types/types/codec'

import type { DidResourceUri, DidSignature, DidUri } from './DidDocument.js'
import type { IAttestation } from './Attestation.js'
import type { PartialClaim } from './Claim.js'
import type { IDelegationNode } from './Delegation.js'
import type { IQuoteAgreement } from './Quote.js'
import type { ICredential, ICredentialPresentation } from './Credential.js'
import type { ITerms } from './Terms.js'
import type { CTypeHash } from './CType.js'

export type MessageBodyType =
  | 'error'
  | 'reject'
  | 'request-terms'
  | 'submit-terms'
  | 'reject-terms'
  | 'request-attestation'
  | 'submit-attestation'
  | 'reject-attestation'
  | 'request-payment'
  | 'confirm-payment'
  | 'request-credential'
  | 'submit-credential'
  | 'accept-credential'
  | 'reject-credential'
  | 'request-accept-delegation'
  | 'submit-accept-delegation'
  | 'reject-accept-delegation'
  | 'inform-create-delegation'

interface IMessageBodyBase {
  content: any
  type: MessageBodyType
}

export interface IError extends IMessageBodyBase {
  content: {
    /** Optional machine-readable type of the error. */
    name?: string
    /** Optional human-readable description of the error. */
    message?: string
  }
  type: 'error'
}

export interface IReject extends IMessageBodyBase {
  content: {
    /** Optional machine-readable type of the rejection. */
    name?: string
    /** Optional human-readable description of the rejection. */
    message?: string
  }
  type: 'reject'
}

export interface IRequestTerms extends IMessageBodyBase {
  content: PartialClaim
  type: 'request-terms'
}

export interface ISubmitTerms extends IMessageBodyBase {
  content: ITerms
  type: 'submit-terms'
}

export interface IRejectTerms extends IMessageBodyBase {
  content: {
    claim: PartialClaim
    legitimations: ICredential[]
    delegationId?: IDelegationNode['id']
  }
  type: 'reject-terms'
}

export interface ISubmitCredential extends IMessageBodyBase {
  content: ICredentialPresentation[]
  type: 'submit-credential'
}

export interface IAcceptCredential extends IMessageBodyBase {
  content: CTypeHash[]
  type: 'accept-credential'
}

export interface IRejectCredential extends IMessageBodyBase {
  content: CTypeHash[]
  type: 'reject-credential'
}

export interface IRequestAttestationContent {
  credential: ICredential
  quote?: IQuoteAgreement
}

export interface IRequestAttestation extends IMessageBodyBase {
  content: IRequestAttestationContent
  type: 'request-attestation'
}

export interface ISubmitAttestationContent {
  attestation: IAttestation
}

export interface ISubmitAttestation extends IMessageBodyBase {
  content: ISubmitAttestationContent
  type: 'submit-attestation'
}

export interface IRejectAttestation extends IMessageBodyBase {
  content: ICredential['rootHash']
  type: 'reject-attestation'
}

export interface IRequestPaymentContent {
  // Same as the `rootHash` value of the `'request-attestation'` message */
  claimHash: string
}

export interface IConfirmPaymentContent {
  // Same as the `rootHash` value of the `'request-attestation'` message
  claimHash: string
  // Hash of the payment transaction */
  txHash: string
  // hash of the block which includes the payment transaction
  blockHash: string
}

export interface IConfirmPayment extends IMessageBodyBase {
  content: IConfirmPaymentContent
  type: 'confirm-payment'
}

export interface IRequestCredentialContent {
  cTypes: Array<{
    cTypeHash: CTypeHash
    trustedAttesters?: DidUri[]
    requiredProperties?: string[]
  }>
  challenge?: string
}

export interface IRequestCredential extends IMessageBodyBase {
  content: IRequestCredentialContent
  type: 'request-credential'
}

export interface IRequestPayment extends IMessageBodyBase {
  content: IRequestPaymentContent
  type: 'request-payment'
}

export interface IDelegationData {
  account: IDelegationNode['account']
  id: IDelegationNode['id']
  parentId: IDelegationNode['id']
  permissions: IDelegationNode['permissions']
  isPCR: boolean
}

export interface IRejectAcceptDelegation extends IMessageBodyBase {
  content: IDelegationData
  type: 'reject-accept-delegation'
}

export interface IRequestDelegationApproval {
  delegationData: IDelegationData
  metaData?: AnyJson
  signatures: {
    inviter: DidSignature
  }
}

export interface IRequestAcceptDelegation extends IMessageBodyBase {
  content: IRequestDelegationApproval
  type: 'request-accept-delegation'
}

export interface ISubmitDelegationApproval {
  delegationData: IDelegationData
  signatures: {
    inviter: DidSignature
    invitee: DidSignature
  }
}

export interface ISubmitAcceptDelegation extends IMessageBodyBase {
  content: ISubmitDelegationApproval
  type: 'submit-accept-delegation'
}

export interface IInformDelegationCreation {
  delegationId: IDelegationNode['id']
  isPCR: boolean
}

export interface IInformCreateDelegation extends IMessageBodyBase {
  content: IInformDelegationCreation
  type: 'inform-create-delegation'
}

export type MessageBody =
  | IError
  | IReject
  //
  | IRequestTerms
  | ISubmitTerms
  | IRejectTerms
  //
  | IRequestAttestation
  | ISubmitAttestation
  | IRejectAttestation
  //
  | IRequestCredential
  | ISubmitCredential
  | IAcceptCredential
  | IRejectCredential
  //
  | IRequestAcceptDelegation
  | ISubmitAcceptDelegation
  | IRejectAcceptDelegation
  | IInformCreateDelegation

/**
 * - `body` - The body of the message, see [[MessageBody]].
 * - `createdAt` - The timestamp of the message construction.
 * - `sender` - The DID of the sender.
 * - `receiver` - The DID of the receiver.
 * - `messageId` - The message id.
 * - `receivedAt` - The timestamp of the message reception.
 * - `inReplyTo` - The id of the parent-message.
 * - `references` - The references or the in-reply-to of the parent-message followed by the message-id of the parent-message.
 */
export interface IMessage {
  body: MessageBody
  createdAt: number
  sender: DidUri
  receiver: DidUri
  messageId?: string
  receivedAt?: number
  inReplyTo?: IMessage['messageId']
  references?: Array<IMessage['messageId']>
}

/**
 * Everything which is part of the encrypted and protected part of the [[IMessage]].
 */
export type IEncryptedMessageContents = Omit<IMessage, 'receivedAt'>

/**
 * Removes the plaintext [[IEncryptedMessageContents]] from an [[IMessage]] and instead includes them in encrypted form.
 * This adds the following fields:
 * - `ciphertext` - The encrypted message content.
 * - `nonce` - The encryption nonce.
 * - `receiverKeyUri` - The URI of the receiver's encryption key.
 * - `senderKeyUri` - The URI of the sender's encryption key.
 */
export type IEncryptedMessage = Pick<IMessage, 'receivedAt'> & {
  receiverKeyUri: DidResourceUri
  senderKeyUri: DidResourceUri
  ciphertext: string
  nonce: string
}
