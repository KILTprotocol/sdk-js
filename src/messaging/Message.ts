/**
 * KILT participants can communicate via a 1:1 messaging system.
 * ***
 * All messages are **encrypted** with the encryption keys of the involved identities. Every time an actor sends data about an [[Identity]], they have to sign the message to prove access to the corresponding private key.
 * <br>
 * The [[Message]] class exposes methods to construct and verify messages.
 * @module Messaging
 */

/**
 * Dummy comment needed for correct doc display, do not remove
 */
import {
  Claim,
  DelegationNode,
  IAttestedClaim,
  IClaim,
  ICType,
  IDelegationBaseNode,
  IDelegationNode,
  Identity,
  IPublicIdentity,
  IRequestForAttestation,
} from '..'
import Crypto, { EncryptedAsymmetricString } from '../crypto'

/**
 * inReplyTo - should store the id of the parent message
 * references - should store the references or the in-reply-to of the parent-message followed by the message-id of the parent-message
 */
export interface IMessage {
  body: MessageBody
  createdAt: number
  receiverAddress: IPublicIdentity['address']
  senderAddress: IPublicIdentity['address']
  senderBoxPublicKey: IPublicIdentity['boxPublicKeyAsHex']

  messageId?: string
  receivedAt?: number
  inReplyTo?: IMessage['messageId']
  references?: Array<IMessage['messageId']>
}

export interface IEncryptedMessage {
  messageId?: string
  receivedAt?: number
  message: string
  nonce: string
  createdAt: number
  hash: string
  signature: string
  receiverAddress: IPublicIdentity['address']
  senderAddress: IPublicIdentity['address']
  senderBoxPublicKey: IPublicIdentity['boxPublicKeyAsHex']
}

export enum MessageBodyType {
  REQUEST_LEGITIMATIONS = 'request-legitimations',
  SUBMIT_LEGITIMATIONS = 'submit-legitimations',
  REJECT_LEGITIMATIONS = 'reject-legitimations',

  REQUEST_ATTESTATION_FOR_CLAIM = 'request-attestation-for-claim',
  SUBMIT_ATTESTATION_FOR_CLAIM = 'submit-attestation-for-claim',
  REJECT_ATTESTATION_FOR_CLAIM = 'reject-attestation-for-claim',

  REQUEST_CLAIMS_FOR_CTYPES = 'request-claims-for-ctypes',
  SUBMIT_CLAIMS_FOR_CTYPES = 'submit-claims-for-ctypes',
  ACCEPT_CLAIMS_FOR_CTYPES = 'accept-claims-for-ctypes',
  REJECT_CLAIMS_FOR_CTYPES = 'reject-claims-for-ctypes',

  REQUEST_ACCEPT_DELEGATION = 'request-accept-delegation',
  SUBMIT_ACCEPT_DELEGATION = 'submit-accept-delegation',
  REJECT_ACCEPT_DELEGATION = 'reject-accept-delegation',
  INFORM_CREATE_DELEGATION = 'inform-create-delegation',
}

export default class Message implements IMessage {
  public static ensureOwnerIsSender(message: IMessage): void {
    switch (message.body.type) {
      case MessageBodyType.REQUEST_ATTESTATION_FOR_CLAIM:
        {
          const requestAttestation = message.body
          if (
            requestAttestation.content.claim.owner !== message.senderAddress
          ) {
            throw new Error('Sender is not owner of the claim')
          }
        }
        break
      case MessageBodyType.SUBMIT_ATTESTATION_FOR_CLAIM:
        {
          const submitAttestation = message.body
          if (
            submitAttestation.content.attestation.owner !==
            message.senderAddress
          ) {
            throw new Error('Sender is not owner of the attestation')
          }
        }
        break
      case MessageBodyType.SUBMIT_CLAIMS_FOR_CTYPES:
        {
          const submitClaimsForCtype = message.body
          submitClaimsForCtype.content.forEach(claim => {
            if (claim.request.claim.owner !== message.senderAddress) {
              throw new Error('Sender is not owner of the claims')
            }
          })
        }
        break
      default:
    }
  }

  public static ensureHashAndSignature(
    encrypted: IEncryptedMessage,
    senderAddress: IPublicIdentity['address']
  ): void {
    const hashInput: string =
      encrypted.message + encrypted.nonce + encrypted.createdAt
    const hash = Crypto.hashStr(hashInput)
    if (hash !== encrypted.hash) {
      throw new Error('Hash of message not correct')
    }
    if (!Crypto.verify(hash, encrypted.signature, senderAddress)) {
      throw new Error('Signature of message not correct')
    }
  }

  public static createFromEncryptedMessage(
    encrypted: IEncryptedMessage,
    receiver: Identity
  ): IMessage {
    Message.ensureHashAndSignature(encrypted, encrypted.senderAddress)

    const ea: EncryptedAsymmetricString = {
      box: encrypted.message,
      nonce: encrypted.nonce,
    }
    const decoded: string | false = receiver.decryptAsymmetricAsStr(
      ea,
      encrypted.senderBoxPublicKey
    )
    if (!decoded) {
      throw new Error('Error decoding message')
    }

    try {
      const messageBody = JSON.parse(decoded)
      return {
        messageId: encrypted.messageId,
        receivedAt: encrypted.receivedAt,
        body: messageBody,
        createdAt: encrypted.createdAt,
        receiverAddress: encrypted.receiverAddress,
        senderAddress: encrypted.senderAddress,
        senderBoxPublicKey: encrypted.senderBoxPublicKey,
      }
    } catch (error) {
      throw new Error('Error parsing message body')
    }
  }

  public messageId?: string
  public receivedAt?: number
  public body: MessageBody
  public createdAt: number
  public receiverAddress: IPublicIdentity['address']
  public senderAddress: IPublicIdentity['address']
  public senderBoxPublicKey: IPublicIdentity['boxPublicKeyAsHex']

  public constructor(
    body: MessageBody,
    sender: Identity,
    receiver: IPublicIdentity
  ) {
    this.body = body
    this.createdAt = Date.now()
    this.receiverAddress = receiver.address
    this.senderAddress = sender.address
    this.senderBoxPublicKey = sender.boxPublicKeyAsHex

    const encryptedMessage: EncryptedAsymmetricString = sender.encryptAsymmetricAsStr(
      JSON.stringify(body),
      receiver.boxPublicKeyAsHex
    )
    this.message = encryptedMessage.box
    this.nonce = encryptedMessage.nonce

    const hashInput: string = this.message + this.nonce + this.createdAt
    this.hash = Crypto.hashStr(hashInput)
    this.signature = sender.signStr(this.hash)
  }

  private message: string
  private nonce: string
  private hash: string
  private signature: string

  public getEncryptedMessage(): IEncryptedMessage {
    return {
      messageId: this.messageId,
      receivedAt: this.receivedAt,
      message: this.message,
      nonce: this.nonce,
      createdAt: this.createdAt,
      hash: this.hash,
      signature: this.signature,
      receiverAddress: this.receiverAddress,
      senderAddress: this.senderAddress,
      senderBoxPublicKey: this.senderBoxPublicKey,
    }
  }
}

interface IMessageBodyBase {
  content: any
  type: MessageBodyType
}

export interface IRequestLegitimations extends IMessageBodyBase {
  content: IPartialClaim
  type: MessageBodyType.REQUEST_LEGITIMATIONS
}
export interface ISubmitLegitimations extends IMessageBodyBase {
  content: {
    claim: IPartialClaim
    legitimations: IAttestedClaim[]
    delegationId: DelegationNode['id'] | null
  }
  type: MessageBodyType.SUBMIT_LEGITIMATIONS
}
export interface IRejectLegitimations extends IMessageBodyBase {
  content: {
    claim: IPartialClaim
    legitimations: IAttestedClaim[]
    delegationId: DelegationNode['id'] | null
  }
  type: MessageBodyType.REJECT_LEGITIMATIONS
}

export interface IRequestAttestationForClaim extends IMessageBodyBase {
  content: IRequestForAttestation
  type: MessageBodyType.REQUEST_ATTESTATION_FOR_CLAIM
}
export interface ISubmitAttestationForClaim extends IMessageBodyBase {
  content: IAttestedClaim
  type: MessageBodyType.SUBMIT_ATTESTATION_FOR_CLAIM
}
export interface IRejectAttestationForClaim extends IMessageBodyBase {
  content: IRequestForAttestation
  type: MessageBodyType.REJECT_ATTESTATION_FOR_CLAIM
}

export interface IRequestClaimsForCTypes extends IMessageBodyBase {
  content: Array<ICType['hash']>
  type: MessageBodyType.REQUEST_CLAIMS_FOR_CTYPES
}
export interface ISubmitClaimsForCTypes extends IMessageBodyBase {
  content: IAttestedClaim[]
  type: MessageBodyType.SUBMIT_CLAIMS_FOR_CTYPES
}
export interface IAcceptClaimsForCTypes extends IMessageBodyBase {
  content: IAttestedClaim[]
  type: MessageBodyType.ACCEPT_CLAIMS_FOR_CTYPES
}
export interface IRejectClaimsForCTypes extends IMessageBodyBase {
  content: IAttestedClaim[]
  type: MessageBodyType.REJECT_CLAIMS_FOR_CTYPES
}

export interface IRequestAcceptDelegation extends IMessageBodyBase {
  content: {
    delegationData: {
      account: IDelegationBaseNode['account']
      id: IDelegationBaseNode['id']
      parentId: IDelegationNode['id']
      permissions: IDelegationNode['permissions']
      isPCR: boolean
    }
    metaData?: {
      [key: string]: any
    }
    signatures: {
      inviter: string
    }
  }
  type: MessageBodyType.REQUEST_ACCEPT_DELEGATION
}
export interface ISubmitAcceptDelegation extends IMessageBodyBase {
  content: {
    delegationData: IRequestAcceptDelegation['content']['delegationData']
    signatures: {
      inviter: string
      invitee: string
    }
  }
  type: MessageBodyType.SUBMIT_ACCEPT_DELEGATION
}
export interface IRejectAcceptDelegation extends IMessageBodyBase {
  content: IRequestAcceptDelegation['content']
  type: MessageBodyType.REJECT_ACCEPT_DELEGATION
}
export interface IInformCreateDelegation extends IMessageBodyBase {
  content: {
    delegationId: IDelegationBaseNode['id']
    isPCR: boolean
  }
  type: MessageBodyType.INFORM_CREATE_DELEGATION
}

export interface IPartialClaim extends Partial<IClaim> {
  cTypeHash: Claim['cTypeHash']
}

export type MessageBody =
  | IRequestLegitimations
  | ISubmitLegitimations
  | IRejectLegitimations
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
