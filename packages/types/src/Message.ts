/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { AnyJson } from '@polkadot/types/types'
import type { DidSignature, IDidDetails } from './DidDetails.js'
import type { CompressedAttestation, IAttestation } from './Attestation.js'
import type { CompressedCredential, ICredential } from './Credential.js'
import type { IClaim, PartialClaim } from './Claim.js'
import type { ICType } from './CType.js'
import type { IDelegationNode } from './Delegation.js'
import type { CompressedQuoteAgreed, IQuoteAgreement } from './Quote.js'
import type {
  CompressedRequestForAttestation,
  IRequestForAttestation,
} from './RequestForAttestation.js'
import type { CompressedTerms, ITerms } from './Terms.js'
import type { DidPublicKey, IClaimContents } from './index.js'

export enum MessageBodyType {
  ERROR = 'error',
  REJECT = 'reject',

  REQUEST_TERMS = 'request-terms',
  SUBMIT_TERMS = 'submit-terms',
  REJECT_TERMS = 'reject-terms',

  REQUEST_ATTESTATION = 'request-attestation',
  SUBMIT_ATTESTATION = 'submit-attestation',
  REJECT_ATTESTATION = 'reject-attestation',

  REQUEST_PAYMENT = 'request-payment',
  CONFIRM_PAYMENT = 'confirm-payment',

  REQUEST_CREDENTIAL = 'request-credential',
  SUBMIT_CREDENTIAL = 'submit-credential',
  ACCEPT_CREDENTIAL = 'accept-credential',
  REJECT_CREDENTIAL = 'reject-credential',

  REQUEST_ACCEPT_DELEGATION = 'request-accept-delegation',
  SUBMIT_ACCEPT_DELEGATION = 'submit-accept-delegation',
  REJECT_ACCEPT_DELEGATION = 'reject-accept-delegation',
  INFORM_CREATE_DELEGATION = 'inform-create-delegation',
}

export type CompressedDelegationData = [
  IDelegationNode['account'],
  IDelegationNode['id'],
  IDelegationNode['id'],
  IDelegationNode['permissions'],
  boolean
]

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
  type: MessageBodyType.ERROR
}

export interface IReject extends IMessageBodyBase {
  content: {
    /** Optional machine-readable type of the rejection. */
    name?: string
    /** Optional human-readable description of the rejection. */
    message?: string
  }
  type: MessageBodyType.REJECT
}

export interface IRequestTerms extends IMessageBodyBase {
  content: PartialClaim
  type: MessageBodyType.REQUEST_TERMS
}
export interface ISubmitTerms extends IMessageBodyBase {
  content: ITerms
  type: MessageBodyType.SUBMIT_TERMS
}
export interface IRejectTerms extends IMessageBodyBase {
  content: {
    claim: PartialClaim
    legitimations: ICredential[]
    delegationId?: IDelegationNode['id']
  }
  type: MessageBodyType.REJECT_TERMS
}

export interface ISubmitCredential extends IMessageBodyBase {
  content: ICredential[]
  type: MessageBodyType.SUBMIT_CREDENTIAL
}

export interface IAcceptCredential extends IMessageBodyBase {
  content: Array<ICType['hash']>
  type: MessageBodyType.ACCEPT_CREDENTIAL
}
export interface IRejectCredential extends IMessageBodyBase {
  content: Array<ICType['hash']>
  type: MessageBodyType.REJECT_CREDENTIAL
}

export type CompressedSubmitTerms = [
  MessageBodyType.SUBMIT_TERMS,
  CompressedTerms
]
export type CompressedSubmitAttestation = [
  MessageBodyType.SUBMIT_ATTESTATION,
  CompressedAttestation
]
export type CompressedRejectAttestation = [
  MessageBodyType.REJECT_ATTESTATION,
  IRequestForAttestation['rootHash']
]
export type CompressedSubmitCredentials = [
  MessageBodyType.SUBMIT_CREDENTIAL,
  CompressedCredential[]
]
export type CompressedAcceptCredential = [
  MessageBodyType.ACCEPT_CREDENTIAL,
  Array<ICType['hash']>
]
export type CompressedRejectCredential = [
  MessageBodyType.REJECT_CREDENTIAL,
  Array<ICType['hash']>
]
export type CompressedRejectAcceptDelegation = [
  MessageBodyType.REJECT_ACCEPT_DELEGATION,
  CompressedDelegationData
]

export interface IRequestAttestationContent {
  requestForAttestation: IRequestForAttestation
  quote?: IQuoteAgreement
}

export interface IRequestAttestation extends IMessageBodyBase {
  content: IRequestAttestationContent
  type: MessageBodyType.REQUEST_ATTESTATION
}

export interface ISubmitAttestationContent {
  attestation: IAttestation
}

export interface ISubmitAttestation extends IMessageBodyBase {
  content: ISubmitAttestationContent
  type: MessageBodyType.SUBMIT_ATTESTATION
}

export interface IRejectAttestation extends IMessageBodyBase {
  content: IRequestForAttestation['rootHash']
  type: MessageBodyType.REJECT_ATTESTATION
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
  type: MessageBodyType.CONFIRM_PAYMENT
}

export interface IRequestCredentialContent {
  cTypes: Array<{
    cTypeHash: ICType['hash']
    trustedAttesters?: Array<IDidDetails['uri']>
    requiredProperties?: string[]
  }>
  challenge?: string
}

export interface IRequestCredential extends IMessageBodyBase {
  content: IRequestCredentialContent
  type: MessageBodyType.REQUEST_CREDENTIAL
}

export interface IRequestPayment extends IMessageBodyBase {
  content: IRequestPaymentContent
  type: MessageBodyType.REQUEST_PAYMENT
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
  type: MessageBodyType.REJECT_ACCEPT_DELEGATION
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
  type: MessageBodyType.REQUEST_ACCEPT_DELEGATION
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
  type: MessageBodyType.SUBMIT_ACCEPT_DELEGATION
}

export interface IInformDelegationCreation {
  delegationId: IDelegationNode['id']
  isPCR: boolean
}
export interface IInformCreateDelegation extends IMessageBodyBase {
  content: IInformDelegationCreation
  type: MessageBodyType.INFORM_CREATE_DELEGATION
}

export type CompressedInformDelegationCreation = [
  IInformDelegationCreation['delegationId'],
  IInformDelegationCreation['isPCR']
]

export type CompressedInformCreateDelegation = [
  MessageBodyType.INFORM_CREATE_DELEGATION,
  CompressedInformDelegationCreation
]

export type CompressedPartialClaim = [
  IClaim['cTypeHash'],
  IClaim['owner'] | undefined,
  IClaimContents | undefined
]
export type CompressedRequestTerms = [
  MessageBodyType.REQUEST_TERMS,
  CompressedPartialClaim
]

export type CompressedRejectedTerms = [
  CompressedPartialClaim,
  CompressedCredential[],
  IDelegationNode['id'] | undefined
]
export type CompressedRejectTerms = [
  MessageBodyType.REJECT_TERMS,
  CompressedRejectedTerms
]

export type CompressedRequestCredentialContent = [
  Array<
    [
      ICType['hash'],
      Array<IDidDetails['uri']> | undefined,
      string[] | undefined
    ]
  >,
  string?
]

export type CompressedRequestCredentials = [
  MessageBodyType.REQUEST_CREDENTIAL,
  CompressedRequestCredentialContent
]

export type CompressedRequestAttestationContent = [
  CompressedRequestForAttestation,
  CompressedQuoteAgreed | undefined
]

export type CompressedRequestAttestation = [
  MessageBodyType.REQUEST_ATTESTATION,
  CompressedRequestAttestationContent
]

export type CompressedRequestDelegationApproval = [
  CompressedDelegationData,
  [DidSignature['signature'], DidSignature['keyUri']],
  AnyJson
]
export type CompressedRequestAcceptDelegation = [
  MessageBodyType.REQUEST_ACCEPT_DELEGATION,
  CompressedRequestDelegationApproval
]

export type CompressedSubmitDelegationApproval = [
  CompressedDelegationData,
  [DidSignature['signature'], DidSignature['keyUri']],
  [DidSignature['signature'], DidSignature['keyUri']]
]
export type CompressedSubmitAcceptDelegation = [
  MessageBodyType.SUBMIT_ACCEPT_DELEGATION,
  CompressedSubmitDelegationApproval
]

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

export type CompressedMessageBody =
  | CompressedRequestTerms
  | CompressedSubmitTerms
  | CompressedRejectTerms
  //
  | CompressedRequestAttestation
  | CompressedSubmitAttestation
  | CompressedRejectAttestation
  //
  | CompressedRequestCredentials
  | CompressedSubmitCredentials
  | CompressedAcceptCredential
  | CompressedRejectCredential
  //
  | CompressedRequestAcceptDelegation
  | CompressedSubmitAcceptDelegation
  | CompressedRejectAcceptDelegation
  | CompressedInformCreateDelegation

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
  sender: IDidDetails['uri']
  receiver: IDidDetails['uri']
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
  receiverKeyUri: DidPublicKey['uri']
  senderKeyUri: DidPublicKey['uri']
  ciphertext: string
  nonce: string
}
