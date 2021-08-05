/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

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

import type {
  CompressedMessageBody,
  IMessage,
  ISubmitClaimsForCTypes,
  IEncryptedMessage,
  MessageBody,
  ICType,
  IDidDetails,
  IDidResolver,
  IEncryptedMessageContents,
} from '@kiltprotocol/types'
import { MessageBodyType } from '@kiltprotocol/types'
import { SDKErrors, UUID } from '@kiltprotocol/utils'
import { DefaultResolver, DidUtils, DemoKeystore } from '@kiltprotocol/did'
import { hexToU8a, stringToU8a, u8aToHex, u8aToString } from '@polkadot/util'
import {
  compressMessage,
  decompressMessage,
  errorCheckMessage,
  errorCheckMessageBody,
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
   * @param message.sender The sender's DID taken from the [[IMessage]].
   * @throws [[ERROR_IDENTITY_MISMATCH]] when the sender does not match the owner of the content embedded in the message, e.g. A request for attestation or an attestation.
   */
  public static ensureOwnerIsSender({ body, sender }: IMessage): void {
    switch (body.type) {
      case Message.BodyType.REQUEST_ATTESTATION_FOR_CLAIM:
        {
          const requestAttestation = body
          if (
            requestAttestation.content.requestForAttestation.claim.owner !==
            sender
          ) {
            throw SDKErrors.ERROR_IDENTITY_MISMATCH('Claim', 'Sender')
          }
        }
        break
      case Message.BodyType.SUBMIT_ATTESTATION_FOR_CLAIM:
        {
          const submitAttestation = body
          if (submitAttestation.content.attestation.owner !== sender) {
            throw SDKErrors.ERROR_IDENTITY_MISMATCH('Attestation', 'Sender')
          }
        }
        break
      case Message.BodyType.SUBMIT_CLAIMS_FOR_CTYPES:
        {
          const submitClaimsForCtype: ISubmitClaimsForCTypes = body
          submitClaimsForCtype.content.forEach((claim) => {
            if (claim.request.claim.owner !== sender) {
              throw SDKErrors.ERROR_IDENTITY_MISMATCH('Claims', 'Sender')
            }
          })
        }
        break
      default:
    }
  }

  /**
   * [STATIC] Symmetrically decrypts the result of [[Message.encrypt]].
   *
   * Uses [[Message.ensureHashAndSignature]] and [[Message.ensureOwnerIsSender]] internally.
   *
   * @param encrypted The encrypted message.
   * @param keystore
   * @param resolutionOptions
   * @param resolutionOptions.senderDetails
   * @param resolutionOptions.resolver
   * @throws [[ERROR_DECODING_MESSAGE]] when encrypted message couldn't be decrypted.
   * @throws [[ERROR_PARSING_MESSAGE]] when the decoded message could not be parsed.
   * @returns The original [[Message]].
   */
  public static async decrypt(
    encrypted: IEncryptedMessage,
    keystore: { decrypt: DemoKeystore['decrypt'] }, // TODO: use proper interface
    {
      senderDetails,
      resolver = DefaultResolver,
    }: { senderDetails?: IDidDetails; resolver?: IDidResolver } = {}
  ): Promise<IMessage> {
    const {
      senderKeyId,
      receiverKeyId,
      ciphertext,
      nonce,
      receivedAt,
    } = encrypted

    // the key id contains the DID, extract it from there
    const { did: senderDid } = DidUtils.parseDidUrl(senderKeyId)
    // if we don't have the sender DID details already, fetch it via resolver
    const senderDidDetails =
      senderDetails || (await resolver.resolve({ did: senderDid }))
    const senderKeyDetails = senderDidDetails?.getKey(senderKeyId)
    if (
      !senderKeyDetails ||
      !senderDidDetails ||
      senderDidDetails.did !== senderDid
    ) {
      throw Error('sender key cannot be resolved') // TODO: improve error
    }

    const { data } = await keystore
      .decrypt({
        keyId: receiverKeyId,
        alg: 'x25519-xsalsa20-poly1305', // TODO find better ways than hard-coding the alg
        peerPublicKey: hexToU8a(senderKeyDetails.publicKeyHex),
        data: hexToU8a(ciphertext),
        nonce: hexToU8a(nonce),
      })
      .catch(() => {
        throw SDKErrors.ERROR_DECODING_MESSAGE()
      })

    const decoded = u8aToString(data)

    try {
      const {
        body,
        createdAt,
        messageId,
        inReplyTo,
        references,
        sender,
        receiver,
      } = JSON.parse(decoded) as IEncryptedMessageContents
      const decrypted: IMessage = {
        receiver,
        sender,
        createdAt,
        body,
        messageId,
        receivedAt,
        inReplyTo,
        references,
      }

      if (sender !== senderKeyDetails.controller) {
        throw SDKErrors.ERROR_IDENTITY_MISMATCH('Encryption key', 'Sender')
      }

      // checks the messasge body
      errorCheckMessageBody(decrypted.body)

      // checks the message structure
      errorCheckMessage(decrypted)
      // make sure the sender is the owner of the identity
      Message.ensureOwnerIsSender(decrypted)

      return decrypted
    } catch (error) {
      throw SDKErrors.ERROR_PARSING_MESSAGE()
    }
  }

  public messageId: string
  public receivedAt?: number
  public body: MessageBody
  public createdAt: number
  public receiver: IMessage['receiver']
  public sender: IMessage['sender']
  public inReplyTo?: IMessage['messageId']
  public references?: Array<IMessage['messageId']>

  /**
   * Constructs a message which should be encrypted with [[Message.encrypt]] before sending to the receiver.
   *
   * @param body The body of the message.
   * @param sender The [[PublicIdentity]] of the sender.
   * @param receiver The [[PublicIdentity]] of the receiver.
   */
  public constructor(
    body: MessageBody | CompressedMessageBody,
    sender: IMessage['sender'],
    receiver: IMessage['receiver']
  ) {
    if (Array.isArray(body)) {
      this.body = decompressMessage(body)
    } else {
      this.body = body
    }
    this.createdAt = Date.now()
    this.receiver = receiver
    this.sender = sender
    this.messageId = UUID.generate()
  }

  /**
   * Encrypts the [[Message]] as a string. This can be reversed with [[Message.decrypt]].
   *
   * @param senderKeyId
   * @param receiverKeyId
   * @param keystore
   * @param resolutionOptions
   * @param resolutionOptions.receiverDetails
   * @param resolutionOptions.resolver
   * @returns The encrypted version of the original [[Message]], see [[IEncryptedMessage]].
   */
  public async encrypt(
    senderKeyId: string,
    receiverKeyId: string,
    keystore: { encrypt: DemoKeystore['encrypt'] }, // TODO: use proper interface
    {
      receiverDetails,
      resolver = DefaultResolver,
    }: { receiverDetails?: IDidDetails; resolver?: IDidResolver } = {}
  ): Promise<IEncryptedMessage> {
    const receiverDidDetails =
      receiverDetails || (await resolver.resolve({ did: this.receiver }))
    const receiverKeyDetails = receiverDidDetails?.getKey(senderKeyId)
    if (
      !receiverKeyDetails ||
      !receiverDidDetails ||
      receiverDidDetails.did !== this.receiver
    ) {
      throw Error('receiver key cannot be resolved') // TODO: improve error
    }

    const toEncrypt: IEncryptedMessageContents = {
      body: this.body,
      createdAt: this.createdAt,
      sender: this.sender,
      receiver: this.receiver,
      messageId: this.messageId,
      inReplyTo: this.inReplyTo,
      references: this.references,
    }

    const serialized = stringToU8a(JSON.stringify(toEncrypt))

    const encryted = await keystore.encrypt({
      alg: 'x25519-xsalsa20-poly1305',
      data: serialized,
      keyId: senderKeyId,
      peerPublicKey: hexToU8a(receiverKeyDetails.publicKeyHex),
    })
    const ciphertext = u8aToHex(encryted.data)
    const nonce = u8aToHex(encryted.nonce)

    return {
      receivedAt: this.receivedAt,
      ciphertext,
      nonce,
      senderKeyId,
      receiverKeyId,
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
