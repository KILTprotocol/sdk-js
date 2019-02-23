import {
  ICType,
  IClaim,
  Claim,
  IRequestForAttestation,
  IAttestedClaim,
  IPublicIdentity,
  Identity,
} from '..'

import { EncryptedAsymmetricString } from 'src/crypto/Crypto'
import Crypto from '../crypto'

export interface IMessage {
  messageId?: string
  receivedAt?: number
  body?: MessageBody
  createdAt: number
  receiverAddress: IPublicIdentity['address']
  senderAddress: IPublicIdentity['address']
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
}

export default class Message implements IMessage {
  public static createFromEncryptedMessage(
    encrypted: IEncryptedMessage,
    sender: IPublicIdentity,
    receiver: Identity
  ): IMessage {
    const ea: EncryptedAsymmetricString = {
      box: encrypted.message,
      nonce: encrypted.nonce,
    }
    const decoded: string | false = receiver.decryptAsymmetricAsStr(
      ea,
      sender.boxPublicKeyAsHex
    )
    if (!decoded) {
      throw new Error('Error decoding message')
    }

    const hashInput: string =
      encrypted.message + encrypted.nonce + encrypted.createdAt
    const hash = Crypto.hashStr(hashInput)
    if (hash !== encrypted.hash) {
      throw new Error('Hash of message not correct')
    }
    if (!Crypto.verify(hash, encrypted.signature, sender.address)) {
      throw new Error('Signature of message not correct')
    }

    try {
      const meesageBody = JSON.parse(decoded)
      return {
        messageId: encrypted.messageId,
        receivedAt: encrypted.receivedAt,
        body: meesageBody,
        createdAt: encrypted.createdAt,
        receiverAddress: encrypted.receiverAddress,
        senderAddress: encrypted.senderAddress,
      } as IMessage
    } catch (error) {
      throw new Error('Error parsing message body')
    }
  }

  public messageId?: string
  public receivedAt?: number
  public body?: MessageBody
  public createdAt: number
  public receiverAddress: IPublicIdentity['address']
  public senderAddress: IPublicIdentity['address']

  public constructor(
    body: MessageBody,
    sender: Identity,
    receiver: IPublicIdentity
  ) {
    this.body = body
    this.createdAt = Date.now()
    this.receiverAddress = receiver.address
    this.senderAddress = sender.address

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
    } as IEncryptedMessage
  }
}

export enum MessageBodyType {
  REQUEST_LEGITIMATIONS = 'request-legitimations',
  SUBMIT_LEGITIMATIONS = 'submit-legitimations',
  REQUEST_ATTESTATION_FOR_CLAIM = 'request-attestation-for-claim',
  SUBMIT_ATTESTATION_FOR_CLAIM = 'submit-attestation-for-claim',
  REQUEST_CLAIMS_FOR_CTYPE = 'request-claims-for-ctype',
  SUBMIT_CLAIMS_FOR_CTYPE = 'submit-claims-for-ctype',
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
  }
  type: MessageBodyType.SUBMIT_LEGITIMATIONS
}

export interface IRequestAttestationForClaim extends IMessageBodyBase {
  content: IRequestForAttestation
  type: MessageBodyType.REQUEST_ATTESTATION_FOR_CLAIM
}

export interface ISubmitAttestationForClaim extends IMessageBodyBase {
  content: IAttestedClaim
  type: MessageBodyType.SUBMIT_ATTESTATION_FOR_CLAIM
}

export interface IRequestClaimsForCtype extends IMessageBodyBase {
  content: ICType['hash']
  type: MessageBodyType.REQUEST_CLAIMS_FOR_CTYPE
}

export interface ISubmitClaimsForCtype extends IMessageBodyBase {
  content: IAttestedClaim[]
  type: MessageBodyType.SUBMIT_CLAIMS_FOR_CTYPE
}

export interface IPartialClaim extends Partial<IClaim> {
  cType: Claim['cType']
}

export type MessageBody =
  | IRequestLegitimations
  | ISubmitLegitimations
  | IRequestAttestationForClaim
  | ISubmitAttestationForClaim
  | IRequestClaimsForCtype
  | ISubmitClaimsForCtype
