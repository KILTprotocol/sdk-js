/**
 * KILT participants can communicate via a 1:1 messaging system.
 *
 * All messages are **encrypted** with the encryption keys of the involved identities.
 * Every time an actor sends data about an [[Identity]], they have to sign the message to prove access to the corresponding private key.
 *
 * The [[Message]] class exposes methods to construct and verify messages.
 *
 * @packageDocumentation
 * @module Messaging
 * @preferred
 */

import { AnyJson } from '@polkadot/types/types'
import {
  IAttestedClaim,
  IClaim,
  IDelegationBaseNode,
  IDelegationNode,
  IPublicIdentity,
  IRequestForAttestation,
  IAttestation,
  ICType,
  ITerms,
  IQuoteAgreement,
} from '@kiltprotocol/types'
import { Crypto, DataUtils, SDKErrors } from '@kiltprotocol/utils'
import { Claim, DelegationNode, Identity } from '..'

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
  receiverAddress: IPublicIdentity['address']
  senderAddress: IPublicIdentity['address']
  senderBoxPublicKey: IPublicIdentity['boxPublicKeyAsHex']
  messageId?: string
  receivedAt?: number
  inReplyTo?: IMessage['messageId']
  references?: Array<IMessage['messageId']>
}

/**
 * Removes the [[MessageBody]], parent-id and references from the [[Message]] and adds
 * four new fields: message, nonce, hash and signature.
 * - `message` - The encrypted body of the message.
 * - `nonce` - The encryption nonce.
 * - `hash` - The hash of the concatenation of message + nonce + createdAt.
 * - `signature` - The sender's signature on the hash.
 */
export type IEncryptedMessage = Pick<
  IMessage,
  | 'createdAt'
  | 'receiverAddress'
  | 'senderAddress'
  | 'senderBoxPublicKey'
  | 'messageId'
  | 'receivedAt'
> & {
  message: string
  nonce: string
  hash: string
  signature: string
}

export enum MessageBodyType {
  REQUEST_TERMS = 'request-terms',
  SUBMIT_TERMS = 'submit-terms',
  REJECT_TERMS = 'reject-terms',

  INITIATE_ATTESTATION = 'initiate-attestation',

  REQUEST_ATTESTATION_FOR_CLAIM = 'request-attestation-for-claim',
  SUBMIT_ATTESTATION_FOR_CLAIM = 'submit-attestation-for-claim',
  REJECT_ATTESTATION_FOR_CLAIM = 'reject-attestation-for-claim',

  REQUEST_CLAIMS_FOR_CTYPES = 'request-claims-for-ctypes',
  SUBMIT_CLAIMS_FOR_CTYPES = 'submit-claims-for-ctypes-classic',
  ACCEPT_CLAIMS_FOR_CTYPES = 'accept-claims-for-ctypes',
  REJECT_CLAIMS_FOR_CTYPES = 'reject-claims-for-ctypes',

  REQUEST_ACCEPT_DELEGATION = 'request-accept-delegation',
  SUBMIT_ACCEPT_DELEGATION = 'submit-accept-delegation',
  REJECT_ACCEPT_DELEGATION = 'reject-accept-delegation',
  INFORM_CREATE_DELEGATION = 'inform-create-delegation',
}

export default class Message implements IMessage {
  /**
   * [STATIC] Verifies that the sender of a [[Message]] is also the owner of it, e.g the owner's and sender's public keys match.
   *
   * @param message The [[Message]] object which needs to be decrypted.
   * @param message.body The body of the [[Message]] which depends on the [[MessageBodyType]].
   * @param message.senderAddress The sender's public SS58 address of the [[Message]].
   * @throws When the sender does not match the owner of the in the Message supplied Object.
   * @throws [[SUBMIT_ATTESTATION_FOR_CLAIM]], [[SUBMIT_CLAIMS_FOR_CTYPES_CLASSIC]], [[ERROR_IDENTITY_MISMATCH]].
   *
   */
  public static ensureOwnerIsSender({ body, senderAddress }: IMessage): void {
    switch (body.type) {
      case MessageBodyType.REQUEST_ATTESTATION_FOR_CLAIM:
        {
          const requestAttestation = body
          if (
            requestAttestation.content.requestForAttestation.claim.owner !==
            senderAddress
          ) {
            throw SDKErrors.ERROR_IDENTITY_MISMATCH('Claim', 'Sender')
          }
        }
        break
      case MessageBodyType.SUBMIT_ATTESTATION_FOR_CLAIM:
        {
          const submitAttestation = body
          if (submitAttestation.content.attestation.owner !== senderAddress) {
            throw SDKErrors.ERROR_IDENTITY_MISMATCH('Attestation', 'Sender')
          }
        }
        break
      case MessageBodyType.SUBMIT_CLAIMS_FOR_CTYPES:
        {
          const submitClaimsForCtype: ISubmitClaimsForCTypes = body
          submitClaimsForCtype.content.forEach((claim) => {
            if (claim.request.claim.owner !== senderAddress) {
              throw SDKErrors.ERROR_IDENTITY_MISMATCH('Claims', 'Sender')
            }
          })
        }
        break
      default:
    }
  }

  /**
   * [STATIC] Verifies that neither the hash of [[Message]] nor the sender's signature on the hash have been tampered with.
   *
   * @param encrypted The encrypted [[Message]] object which needs to be decrypted.
   * @param senderAddress The sender's public SS58 address of the [[Message]].
   * @throws When either the hash or the signature could not be verified against the calculations.
   * @throws [[ERROR_NONCE_HASH_INVALID]].
   *
   */
  public static ensureHashAndSignature(
    encrypted: IEncryptedMessage,
    senderAddress: IMessage['senderAddress']
  ): void {
    if (
      Crypto.hashStr(
        encrypted.message + encrypted.nonce + encrypted.createdAt
      ) !== encrypted.hash
    ) {
      throw SDKErrors.ERROR_NONCE_HASH_INVALID(
        { hash: encrypted.hash, nonce: encrypted.nonce },
        'Message'
      )
    }
    DataUtils.validateSignature(
      encrypted.hash,
      encrypted.signature,
      senderAddress
    )
  }

  /**
   * [STATIC] Symmetrically decrypts the result of [[Message.encrypt]].
   *
   * Uses [[Message.ensureHashAndSignature]] and [[Message.ensureOwnerIsSender]] internally.
   *
   * @param encrypted The encrypted message.
   * @param receiver The [[Identity]] of the receiver.
   * @throws When encrypted message couldn't be decrypted.
   * @throws When the decoded message could not be parsed.
   * @throws [[ERROR_DECODING_MESSAGE]], [[ERROR_PARSING_MESSAGE]].
   * @returns The original [[Message]].
   */
  public static decrypt(
    encrypted: IEncryptedMessage,
    receiver: Identity
  ): IMessage {
    // check validity of the message
    Message.ensureHashAndSignature(encrypted, encrypted.senderAddress)

    const ea: Crypto.EncryptedAsymmetricString = {
      box: encrypted.message,
      nonce: encrypted.nonce,
    }
    const decoded: string | false = receiver.decryptAsymmetricAsStr(
      ea,
      encrypted.senderBoxPublicKey
    )
    if (!decoded) {
      throw SDKErrors.ERROR_DECODING_MESSAGE()
    }

    try {
      const messageBody: MessageBody = JSON.parse(decoded)
      const decrypted: IMessage = {
        ...encrypted,
        body: messageBody,
      }
      // make sure the sender is the owner of the identity
      Message.ensureOwnerIsSender(decrypted)

      return decrypted
    } catch (error) {
      throw SDKErrors.ERROR_PARSING_MESSAGE()
    }
  }

  public messageId?: string
  public receivedAt?: number
  public body: MessageBody
  public createdAt: number
  public receiverAddress: IMessage['receiverAddress']
  public senderAddress: IMessage['senderAddress']
  public senderBoxPublicKey: IMessage['senderBoxPublicKey']

  /**
   * Constructs a message which should be encrypted with [[Message.encrypt]] before sending to the receiver.
   *
   * @param body The body of the message.
   * @param sender The [[Identity]] of the sender.
   * @param receiver The [[PublicIdentity]] of the receiver.
   */
  public constructor(
    body: MessageBody,
    sender: Identity,
    receiver: IPublicIdentity
  ) {
    this.body = body
    this.createdAt = Date.now()
    this.receiverAddress = receiver.address
    this.senderAddress = sender.address
    this.senderBoxPublicKey = sender.getBoxPublicKey()

    const encryptedMessage: Crypto.EncryptedAsymmetricString = sender.encryptAsymmetricAsStr(
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

  /**
   * Encrypts the [[Message]] symmetrically as a string. This can be reversed with [[Message.decrypt]].
   *
   * @returns The encrypted version of the original [[Message]], see [[IEncryptedMessage]].
   */
  public encrypt(): IEncryptedMessage {
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

export interface IRequestTerms extends IMessageBodyBase {
  content: IPartialClaim
  type: MessageBodyType.REQUEST_TERMS
}
export interface ISubmitTerms extends IMessageBodyBase {
  content: ITerms
  type: MessageBodyType.SUBMIT_TERMS
}
export interface IRejectTerms extends IMessageBodyBase {
  content: {
    claim: IPartialClaim
    legitimations: IAttestedClaim[]
    delegationId?: DelegationNode['id']
  }
  type: MessageBodyType.REJECT_TERMS
}

export interface IRequestAttestationForClaim extends IMessageBodyBase {
  content: {
    requestForAttestation: IRequestForAttestation
    quote?: IQuoteAgreement
    prerequisiteClaims?: IClaim[]
  }
  type: MessageBodyType.REQUEST_ATTESTATION_FOR_CLAIM
}
export interface ISubmitAttestationForClaim extends IMessageBodyBase {
  content: {
    attestation: IAttestation
  }
  type: MessageBodyType.SUBMIT_ATTESTATION_FOR_CLAIM
}
export interface IRejectAttestationForClaim extends IMessageBodyBase {
  content: IRequestForAttestation['rootHash']
  type: MessageBodyType.REJECT_ATTESTATION_FOR_CLAIM
}

export interface IRequestClaimsForCTypes extends IMessageBodyBase {
  content: {
    ctypes: Array<ICType['hash']>
  }
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
  content: {
    delegationData: {
      account: IDelegationBaseNode['account']
      id: IDelegationBaseNode['id']
      parentId: IDelegationNode['id']
      permissions: IDelegationNode['permissions']
      isPCR: boolean
    }
    metaData?: AnyJson
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
