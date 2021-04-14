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
 */

import { Identity } from '@kiltprotocol/core'
import type {
  IPublicIdentity,
  CompressedMessageBody,
  IMessage,
  ISubmitClaimsForCTypes,
  IEncryptedMessage,
  MessageBody,
} from '@kiltprotocol/types'
import { MessageBodyType } from '@kiltprotocol/types'
import { Crypto, DataUtils, SDKErrors } from '@kiltprotocol/utils'
import {
  compressMessage,
  decompressMessage,
  verifyRequiredCTypeProperties,
} from './Message.utils'

export default class Message implements IMessage {
  /**
   * [STATIC] Lists all possible body types of [[Message]].
   */
  public static readonly BodyType = MessageBodyType

  /**
   * [STATIC] Verifies that the sender of a [[Message]] is also the owner of it, e.g the owner's and sender's public keys match.
   *
   * @param message The [[Message]] object which needs to be decrypted.
   * @param message.body The body of the [[Message]] which depends on the [[BodyType]].
   * @param message.senderAddress The sender's public SS58 address of the [[Message]].
   * @throws [[ERROR_IDENTITY_MISMATCH]] when the sender does not match the owner of the content embedded in the message, e.g. A request for attestation or an attestation.
   *
   */
  public static ensureOwnerIsSender({ body, senderAddress }: IMessage): void {
    switch (body.type) {
      case Message.BodyType.REQUEST_ATTESTATION_FOR_CLAIM:
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
      case Message.BodyType.SUBMIT_ATTESTATION_FOR_CLAIM:
        {
          const submitAttestation = body
          if (submitAttestation.content.attestation.owner !== senderAddress) {
            throw SDKErrors.ERROR_IDENTITY_MISMATCH('Attestation', 'Sender')
          }
        }
        break
      case Message.BodyType.SUBMIT_CLAIMS_FOR_CTYPES:
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
   * @throws [[ERROR_NONCE_HASH_INVALID]] when either the hash or the signature could not be verified against the calculations.
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
   * @throws [[ERROR_DECODING_MESSAGE]] when encrypted message couldn't be decrypted.
   * @throws [[ERROR_PARSING_MESSAGE]] when the decoded message could not be parsed.
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
    body: MessageBody | CompressedMessageBody,
    sender: Identity,
    receiver: IPublicIdentity
  ) {
    if (Array.isArray(body)) {
      this.body = decompressMessage(body)
    } else {
      this.body = body
    }
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

  public compress(): CompressedMessageBody {
    return compressMessage(this.body)
  }

  public static verifyRequiredCTypeProperties(
    requiredProperties: string[],
    cType: ICType
  ): boolean {
    return verifyRequiredCTypeProperties(requiredProperties, cType)
  }
}
