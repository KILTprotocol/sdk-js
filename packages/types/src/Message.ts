/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @packageDocumentation
 * @module IMessage
 */

import type { AnyJson } from '@polkadot/types/types'
import type { DidSignature, IDidDetails, IDidKeyDetails } from './DidDetails'
import type { CompressedAttestation, IAttestation } from './Attestation'
import type { CompressedAttestedClaim, IAttestedClaim } from './AttestedClaim'
import type {
  CompressedClaim,
  IClaim,
  IClaimContents,
  PartialClaim,
} from './Claim'
import type { ICType } from './CType'
import type { IDelegationNode } from './Delegation'
import type { CompressedQuoteAgreed, IQuoteAgreement } from './Quote'
import type {
  CompressedRequestForAttestation,
  IRequestForAttestation,
} from './RequestForAttestation'
import type { CompressedTerms, ITerms } from './Terms'

export enum MessageBodyType {
  REQUEST_TERMS = 'request-terms',
  SUBMIT_TERMS = 'submit-terms',
  REJECT_TERMS = 'reject-terms',

  REQUEST_ATTESTATION_FOR_CLAIM = 'request-attestation-for-claim',
  SUBMIT_ATTESTATION_FOR_CLAIM = 'submit-attestation-for-claim',
  REJECT_ATTESTATION_FOR_CLAIM = 'reject-attestation-for-claim',

  REQUEST_PAYMENT = 'request-payment',
  CONFIRM_PAYMENT = 'confirm-payment',

  REQUEST_CLAIMS_FOR_CTYPES = 'request-claims-for-ctypes',
  SUBMIT_CLAIMS_FOR_CTYPES = 'submit-claims-for-ctypes-classic',
  ACCEPT_CLAIMS_FOR_CTYPES = 'accept-claims-for-ctypes',
  REJECT_CLAIMS_FOR_CTYPES = 'reject-claims-for-ctypes',

  REQUEST_ACCEPT_DELEGATION = 'request-accept-delegation',
  SUBMIT_ACCEPT_DELEGATION = 'submit-accept-delegation',
  REJECT_ACCEPT_DELEGATION = 'reject-accept-delegation',
  INFORM_CREATE_DELEGATION = 'inform-create-delegation',
}

/**
 * - `body` - The body of the message, see [[MessageBody]].
 * - `createdAt` - The timestamp of the message construction.
 * - `receiverAddress` - The public SS58 address of the receiver.
 * - `senderAddress` - The public SS58 address of the sender.
 * - `senderBoxPublicKex` - The public encryption key of the sender.
 * - `messageId` - The message id.
 * - `inReplyTo` - The id of the parent-message.
 * - `references` - The references or the in-reply-to of the parent-message followed by the message-id of the parent-message.
 */
export interface IMessage {
  body: MessageBody
  createdAt: number
  sender: IDidDetails['did']
  receiver: IDidDetails['did']
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
 * - `receiverKeyId` - The identifier of a DID-associated public key to which to encrypt.
 * - `senderKeyId` - The identifier of a DID-associated private key with which to which to encrypt.
 */
export type IEncryptedMessage = Pick<IMessage, 'receivedAt'> & {
  receiverKeyId: IDidKeyDetails['id']
  senderKeyId: IDidKeyDetails['id']
  ciphertext: string
  nonce: string
}

interface IMessageBodyBase {
  content: any
  type: MessageBodyType
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
    legitimations: IAttestedClaim[]
    delegationId?: IDelegationNode['id']
  }
  type: MessageBodyType.REJECT_TERMS
}

export interface IRequestAttestationForClaim extends IMessageBodyBase {
  content: IRequestAttestationForClaimContent
  type: MessageBodyType.REQUEST_ATTESTATION_FOR_CLAIM
}
export interface ISubmitAttestationForClaim extends IMessageBodyBase {
  content: ISubmitAttestationForClaimContent
  type: MessageBodyType.SUBMIT_ATTESTATION_FOR_CLAIM
}
export interface IRejectAttestationForClaim extends IMessageBodyBase {
  content: IRequestForAttestation['rootHash']
  type: MessageBodyType.REJECT_ATTESTATION_FOR_CLAIM
}

export interface IRequestPayment extends IMessageBodyBase {
  content: IRequestPaymentContent
  type: MessageBodyType.REQUEST_PAYMENT
}

export interface IConfirmPayment extends IMessageBodyBase {
  content: IConfirmPaymentContent
  type: MessageBodyType.CONFIRM_PAYMENT
}

export interface IRequestClaimsForCTypes extends IMessageBodyBase {
  content: IRequestClaimsForCTypesContent
  type: MessageBodyType.REQUEST_CLAIMS_FOR_CTYPES
}

export interface ISubmitClaimsForCTypes extends IMessageBodyBase {
  content: IAttestedClaim[]
  type: MessageBodyType.SUBMIT_CLAIMS_FOR_CTYPES
}

export interface IAcceptClaimsForCTypes extends IMessageBodyBase {
  content: Array<ICType['hash']>
  type: MessageBodyType.ACCEPT_CLAIMS_FOR_CTYPES
}
export interface IRejectClaimsForCTypes extends IMessageBodyBase {
  content: Array<ICType['hash']>
  type: MessageBodyType.REJECT_CLAIMS_FOR_CTYPES
}

export interface IRequestAcceptDelegation extends IMessageBodyBase {
  content: IRequestDelegationApproval
  type: MessageBodyType.REQUEST_ACCEPT_DELEGATION
}
export interface ISubmitAcceptDelegation extends IMessageBodyBase {
  content: ISubmitDelegationApproval
  type: MessageBodyType.SUBMIT_ACCEPT_DELEGATION
}
export interface IRejectAcceptDelegation extends IMessageBodyBase {
  content: IDelegationData
  type: MessageBodyType.REJECT_ACCEPT_DELEGATION
}
export interface IInformCreateDelegation extends IMessageBodyBase {
  content: IInformDelegationCreation
  type: MessageBodyType.INFORM_CREATE_DELEGATION
}

export type CompressedRequestTerms = [
  MessageBodyType.REQUEST_TERMS,
  CompressedPartialClaim
]
export type CompressedSubmitTerms = [
  MessageBodyType.SUBMIT_TERMS,
  CompressedTerms
]
export type CompressedRejectTerms = [
  MessageBodyType.REJECT_TERMS,
  CompressedRejectedTerms
]
export type CompressedRequestAttestationForClaim = [
  MessageBodyType.REQUEST_ATTESTATION_FOR_CLAIM,
  CompressedRequestAttestationForClaimContent
]
export type CompressedSubmitAttestationForClaim = [
  MessageBodyType.SUBMIT_ATTESTATION_FOR_CLAIM,
  CompressedAttestation
]
export type CompressedRejectAttestationForClaim = [
  MessageBodyType.REJECT_ATTESTATION_FOR_CLAIM,
  IRequestForAttestation['rootHash']
]
export type CompressedRequestClaimsForCTypes = [
  MessageBodyType.REQUEST_CLAIMS_FOR_CTYPES,
  CompressedRequestClaimsForCTypesContent
]
export type CompressedSubmitClaimsForCTypes = [
  MessageBodyType.SUBMIT_CLAIMS_FOR_CTYPES,
  CompressedAttestedClaim[]
]
export type CompressedAcceptClaimsForCTypes = [
  MessageBodyType.ACCEPT_CLAIMS_FOR_CTYPES,
  Array<ICType['hash']>
]
export type CompressedRejectClaimsForCTypes = [
  MessageBodyType.REJECT_CLAIMS_FOR_CTYPES,
  Array<ICType['hash']>
]
export type CompressedRequestAcceptDelegation = [
  MessageBodyType.REQUEST_ACCEPT_DELEGATION,
  CompressedRequestDelegationApproval
]
export type CompressedSubmitAcceptDelegation = [
  MessageBodyType.SUBMIT_ACCEPT_DELEGATION,
  CompressedSubmitDelegationApproval
]
export type CompressedRejectAcceptDelegation = [
  MessageBodyType.REJECT_ACCEPT_DELEGATION,
  CompressedDelegationData
]
export type CompressedInformCreateDelegation = [
  MessageBodyType.INFORM_CREATE_DELEGATION,
  CompressedInformDelegationCreation
]

export interface IRequestAttestationForClaimContent {
  requestForAttestation: IRequestForAttestation
  quote?: IQuoteAgreement
  prerequisiteClaims?: Array<IClaim | PartialClaim>
}

export interface ISubmitAttestationForClaimContent {
  attestation: IAttestation
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

export interface IRequestClaimsForCTypesContent {
  cTypes: Record<
    ICType['hash'],
    {
      trustedAttesters?: Array<IDidDetails['did']>
      requiredProperties?: string[]
    }
  >
  challenge?: string
}

export interface IDelegationData {
  account: IDelegationNode['account']
  id: IDelegationNode['id']
  parentId: IDelegationNode['id']
  permissions: IDelegationNode['permissions']
  isPCR: boolean
}
export interface IRequestDelegationApproval {
  delegationData: IDelegationData
  metaData?: AnyJson
  signatures: {
    inviter: DidSignature
  }
}

export interface ISubmitDelegationApproval {
  delegationData: IDelegationData
  signatures: {
    inviter: DidSignature
    invitee: DidSignature
  }
}

export interface IInformDelegationCreation {
  delegationId: IDelegationNode['id']
  isPCR: boolean
}

export type CompressedPartialClaim = [
  IClaim['cTypeHash'],
  IClaim['owner'] | undefined,
  IClaimContents | undefined
]

export type CompressedRejectedTerms = [
  CompressedPartialClaim,
  CompressedAttestedClaim[],
  IDelegationNode['id'] | undefined
]

export type CompressedRequestClaimsForCTypesContent = [
  Array<
    [
      ICType['hash'],
      Array<IDidDetails['did']> | undefined,
      string[] | undefined
    ]
  >,
  string?
]

export type CompressedRequestAttestationForClaimContent = [
  CompressedRequestForAttestation,
  CompressedQuoteAgreed | undefined,
  Array<CompressedPartialClaim | CompressedClaim> | undefined
]

export type CompressedDelegationData = [
  IDelegationNode['account'],
  IDelegationNode['id'],
  IDelegationNode['id'],
  IDelegationNode['permissions'],
  boolean
]

export type CompressedRequestDelegationApproval = [
  CompressedDelegationData,
  [DidSignature['signature'], DidSignature['keyId']],
  AnyJson
]

export type CompressedSubmitDelegationApproval = [
  CompressedDelegationData,
  [DidSignature['signature'], DidSignature['keyId']],
  [DidSignature['signature'], DidSignature['keyId']]
]

export type CompressedInformDelegationCreation = [
  IInformDelegationCreation['delegationId'],
  IInformDelegationCreation['isPCR']
]

export type MessageBody =
  | IRequestTerms
  | ISubmitTerms
  | IRejectTerms
  //
  | IRequestAttestationForClaim
  | ISubmitAttestationForClaim
  | IRejectAttestationForClaim
  //
  | IRequestClaimsForCTypes
  | ISubmitClaimsForCTypes
  | IAcceptClaimsForCTypes
  | IRejectClaimsForCTypes
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
  | CompressedRequestAttestationForClaim
  | CompressedSubmitAttestationForClaim
  | CompressedRejectAttestationForClaim
  //
  | CompressedRequestClaimsForCTypes
  | CompressedSubmitClaimsForCTypes
  | CompressedAcceptClaimsForCTypes
  | CompressedRejectClaimsForCTypes
  //
  | CompressedRequestAcceptDelegation
  | CompressedSubmitAcceptDelegation
  | CompressedRejectAcceptDelegation
  | CompressedInformCreateDelegation
