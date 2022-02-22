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

import {
  CompressedMessageBody,
  IMessage,
  ISubmitCredential,
  IEncryptedMessage,
  MessageBody,
  ICType,
  IDidResolver,
  IEncryptedMessageContents,
  NaclBoxCapable,
  DidPublicKey,
  MessageBodyType,
  DidEncryptionKey,
  EncryptionKeyType,
} from '@kiltprotocol/types'
import { SDKErrors, UUID } from '@kiltprotocol/utils'
import {
  DidDetails,
  DidResolver,
  DidUtils,
  EncryptionAlgorithms,
} from '@kiltprotocol/did'
import { hexToU8a, stringToU8a, u8aToHex, u8aToString } from '@polkadot/util'
import {
  compressMessage,
  decompressMessage,
  errorCheckMessage,
  errorCheckMessageBody,
  verifyRequiredCTypeProperties,
} from './Message.utils.js'

export class Message implements IMessage {
  /**
   * [STATIC] Lists all possible body types of [[Message]].
   */
  public static readonly BodyType = MessageBodyType

  /**
   * [STATIC] Verifies that the sender of a [[Message]] is also the owner of it, e.g the owner's and sender's DIDs refer to the same subject.
   *
   * @param message The [[Message]] object which needs to be decrypted.
   * @param message.body The body of the [[Message]] which depends on the [[BodyType]].
   * @param message.sender The sender's DID taken from the [[IMessage]].
   * @throws [[ERROR_IDENTITY_MISMATCH]] when the sender is not the same subject as the owner of the content embedded in the message, e.g. A request for attestation or an attestation.
   */
  public static ensureOwnerIsSender({ body, sender }: IMessage): void {
    switch (body.type) {
      case Message.BodyType.REQUEST_ATTESTATION:
        {
          const requestAttestation = body
          if (
            !DidUtils.isSameSubject(
              requestAttestation.content.requestForAttestation.claim.owner,
              sender
            )
          ) {
            throw SDKErrors.ERROR_IDENTITY_MISMATCH('Claim', 'Sender')
          }
        }
        break
      case Message.BodyType.SUBMIT_ATTESTATION:
        {
          const submitAttestation = body
          if (
            !DidUtils.isSameSubject(
              submitAttestation.content.attestation.owner,
              sender
            )
          ) {
            throw SDKErrors.ERROR_IDENTITY_MISMATCH('Attestation', 'Sender')
          }
        }
        break
      case Message.BodyType.SUBMIT_CREDENTIAL:
        {
          const submitClaimsForCtype: ISubmitCredential = body
          submitClaimsForCtype.content.forEach((claim) => {
            if (!DidUtils.isSameSubject(claim.request.claim.owner, sender)) {
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
   * @param keystore The keystore used to perform the cryptographic operations.
   * @param receiverDetails The DID details of the receiver.
   * @param decryptionOptions Options to perform the decryption operation.
   * @param decryptionOptions.resolver The DID resolver to use.
   *
   * @throws [[ERROR_DECODING_MESSAGE]] when encrypted message couldn't be decrypted.
   * @throws [[ERROR_PARSING_MESSAGE]] when the decoded message could not be parsed.
   * @returns The original [[Message]].
   */
  public static async decrypt(
    encrypted: IEncryptedMessage,
    keystore: Pick<NaclBoxCapable, 'decrypt'>,
    receiverDetails: DidDetails,
    {
      resolver = DidResolver,
    }: {
      resolver?: IDidResolver
    } = {}
  ): Promise<IMessage> {
    const { senderKeyId, receiverKeyId, ciphertext, nonce, receivedAt } =
      encrypted

    const senderKeyDetails = await resolver.resolveKey(senderKeyId)
    if (!senderKeyDetails) {
      throw SDKErrors.ERROR_DID_ERROR(
        `Could not resolve sender encryption key ${senderKeyId}`
      )
    }
    const { fragment } = DidUtils.parseDidUri(receiverKeyId)
    if (!fragment) {
      throw SDKErrors.ERROR_DID_ERROR(
        `No fragment for the receiver key ID ${receiverKeyId}`
      )
    }
    const receiverKeyDetails = receiverDetails.getKey(fragment)
    if (!receiverKeyDetails || !DidUtils.isEncryptionKey(receiverKeyDetails)) {
      throw SDKErrors.ERROR_DID_ERROR(
        `Could not resolve receiver encryption key ${receiverKeyId}`
      )
    }
    const receiverKeyAlgType =
      DidUtils.getEncryptionAlgorithmForEncryptionKeyType(
        receiverKeyDetails.type as EncryptionKeyType
      )
    if (receiverKeyAlgType !== EncryptionAlgorithms.NaclBox) {
      throw SDKErrors.ERROR_KEYSTORE_ERROR(
        'Only the "x25519-xsalsa20-poly1305" encryption algorithm currently supported.'
      )
    }

    const { data } = await keystore
      .decrypt({
        publicKey: receiverKeyDetails.publicKey,
        alg: receiverKeyAlgType,
        peerPublicKey: senderKeyDetails.publicKey,
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

      // checks the message body
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
   * @param sender The DID of the sender.
   * @param receiver The DID of the receiver.
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
   * @param senderKeyId The sender's encryption key ID, without the DID prefix and '#' symbol.
   * @param senderDetails The sender's DID to use to fetch the right encryption key.
   * @param keystore The keystore used to perform the cryptographic operations.
   * @param receiverKeyId The full key ID of the receiver.
   * @param encryptionOptions Options to perform the encryption operation.
   * @param encryptionOptions.resolver The DID resolver to use.
   *
   * @returns The encrypted version of the original [[Message]], see [[IEncryptedMessage]].
   */
  public async encrypt(
    senderKeyId: DidEncryptionKey['id'],
    senderDetails: DidDetails,
    keystore: Pick<NaclBoxCapable, 'encrypt'>,
    receiverKeyId: DidPublicKey['id'],
    {
      resolver = DidResolver,
    }: {
      resolver?: IDidResolver
    } = {}
  ): Promise<IEncryptedMessage> {
    const receiverKey = await resolver.resolveKey(receiverKeyId)
    if (!receiverKey) {
      throw SDKErrors.ERROR_DID_ERROR(`Cannot resolve key ${receiverKeyId}`)
    }
    if (this.receiver !== receiverKey.controller) {
      throw SDKErrors.ERROR_IDENTITY_MISMATCH('receiver public key', 'receiver')
    }
    if (this.sender !== senderDetails.did) {
      throw SDKErrors.ERROR_IDENTITY_MISMATCH('sender public key', 'sender')
    }
    const senderKey = senderDetails.getKey(senderKeyId)
    if (!senderKey || !DidUtils.isEncryptionKey(senderKey)) {
      throw SDKErrors.ERROR_DID_ERROR(
        `Cannot find key with ID ${senderKeyId} for the sender DID.`
      )
    }
    const senderKeyAlgType =
      DidUtils.getEncryptionAlgorithmForEncryptionKeyType(
        senderKey.type as EncryptionKeyType
      )
    if (senderKeyAlgType !== EncryptionAlgorithms.NaclBox) {
      throw SDKErrors.ERROR_KEYSTORE_ERROR(
        'Only the "x25519-xsalsa20-poly1305" encryption algorithm currently supported.'
      )
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

    const encrypted = await keystore.encrypt({
      alg: senderKeyAlgType,
      data: serialized,
      publicKey: senderKey.publicKey,
      peerPublicKey: receiverKey.publicKey,
    })
    const ciphertext = u8aToHex(encrypted.data)
    const nonce = u8aToHex(encrypted.nonce)

    return {
      receivedAt: this.receivedAt,
      ciphertext,
      nonce,
      senderKeyId: senderDetails.assembleKeyId(senderKey.id),
      receiverKeyId: receiverKey.id,
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
