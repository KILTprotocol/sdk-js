/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import {
  CompressedMessageBody,
  DecryptCallback,
  DidDetails,
  DidEncryptionKey,
  DidResourceUri,
  EncryptCallback,
  EncryptionKeyType,
  ICType,
  IDidResolver,
  IEncryptedMessage,
  IEncryptedMessageContents,
  IMessage,
  MessageBody,
} from '@kiltprotocol/types'
import { SDKErrors, UUID } from '@kiltprotocol/utils'
import { DidResolver } from '@kiltprotocol/did'
import * as Did from '@kiltprotocol/did'
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
   * Verifies that the sender of a [[Message]] is also the owner of it, e.g the owner's and sender's DIDs refer to the same subject.
   *
   * @param message The [[Message]] object which needs to be decrypted.
   * @param message.body The body of the [[Message]] which depends on the [[BodyType]].
   * @param message.sender The sender's DID taken from the [[IMessage]].
   */
  public static ensureOwnerIsSender({ body, sender }: IMessage): void {
    switch (body.type) {
      case 'request-attestation':
        {
          const requestAttestation = body
          if (
            !Did.Utils.isSameSubject(
              requestAttestation.content.credential.claim.owner,
              sender
            )
          ) {
            throw new SDKErrors.IdentityMismatchError('Claim', 'Sender')
          }
        }
        break
      case 'submit-attestation':
        {
          const submitAttestation = body
          if (
            !Did.Utils.isSameSubject(
              submitAttestation.content.attestation.owner,
              sender
            )
          ) {
            throw new SDKErrors.IdentityMismatchError('Attestation', 'Sender')
          }
        }
        break
      case 'submit-credential':
        {
          const submitClaimsForCtype = body
          submitClaimsForCtype.content.forEach((credential) => {
            if (!Did.Utils.isSameSubject(credential.claim.owner, sender)) {
              throw new SDKErrors.IdentityMismatchError('Claims', 'Sender')
            }
          })
        }
        break
      default:
    }
  }

  /**
   * Symmetrically decrypts the result of [[Message.encrypt]].
   *
   * Checks the message structure and body contents (e.g. Hashes match, ensures the owner is the sender).
   *
   * @param encrypted The encrypted message.
   * @param decryptCallback The callback to decrypt with the secret key.
   * @param receiverDetails The DID details of the receiver.
   * @param decryptionOptions Options to perform the decryption operation.
   * @param decryptionOptions.resolver The DID resolver to use.
   * @returns The original [[Message]].
   */
  public static async decrypt(
    encrypted: IEncryptedMessage,
    decryptCallback: DecryptCallback,
    receiverDetails: DidDetails,
    {
      resolver = DidResolver,
    }: {
      resolver?: IDidResolver
    } = {}
  ): Promise<IMessage> {
    const { senderKeyUri, receiverKeyUri, ciphertext, nonce, receivedAt } =
      encrypted

    const senderKeyDetails = await resolver.resolveKey(senderKeyUri)
    if (!senderKeyDetails) {
      throw new SDKErrors.DidError(
        `Could not resolve sender encryption key "${senderKeyUri}"`
      )
    }
    const { fragment } = Did.Utils.parseDidUri(receiverKeyUri)
    if (!fragment) {
      throw new SDKErrors.DidError(
        `No fragment for the receiver key ID "${receiverKeyUri}"`
      )
    }
    const receiverKeyDetails = Did.getKey(receiverDetails, fragment)
    if (!receiverKeyDetails || !Did.Utils.isEncryptionKey(receiverKeyDetails)) {
      throw new SDKErrors.DidError(
        `Could not resolve receiver encryption key "${receiverKeyUri}"`
      )
    }
    const receiverKeyAlgType =
      Did.Utils.getEncryptionAlgorithmForEncryptionKeyType(
        receiverKeyDetails.type as EncryptionKeyType
      )
    if (receiverKeyAlgType !== 'x25519-xsalsa20-poly1305') {
      throw new SDKErrors.EncryptionError(
        'Only the "x25519-xsalsa20-poly1305" encryption algorithm currently supported'
      )
    }

    let data: Uint8Array
    try {
      data = (
        await decryptCallback({
          publicKey: receiverKeyDetails.publicKey,
          alg: receiverKeyAlgType,
          peerPublicKey: senderKeyDetails.publicKey,
          data: hexToU8a(ciphertext),
          nonce: hexToU8a(nonce),
        })
      ).data
    } catch (cause) {
      throw new SDKErrors.DecodingMessageError(undefined, {
        cause: cause as Error,
      })
    }

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
        throw new SDKErrors.IdentityMismatchError('Encryption key', 'Sender')
      }

      // checks the message body
      errorCheckMessageBody(decrypted.body)

      // checks the message structure
      errorCheckMessage(decrypted)
      // make sure the sender is the owner of the identity
      Message.ensureOwnerIsSender(decrypted)

      return decrypted
    } catch (cause) {
      throw new SDKErrors.ParsingMessageError(undefined, {
        cause: cause as Error,
      })
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
   * @param encryptCallback The callback to encrypt with the secret key.
   * @param receiverKeyUri The key URI of the receiver.
   * @param encryptionOptions Options to perform the encryption operation.
   * @param encryptionOptions.resolver The DID resolver to use.
   *
   * @returns The encrypted version of the original [[Message]], see [[IEncryptedMessage]].
   */
  public async encrypt(
    senderKeyId: DidEncryptionKey['id'],
    senderDetails: DidDetails,
    encryptCallback: EncryptCallback,
    receiverKeyUri: DidResourceUri,
    {
      resolver = DidResolver,
    }: {
      resolver?: IDidResolver
    } = {}
  ): Promise<IEncryptedMessage> {
    const receiverKey = await resolver.resolveKey(receiverKeyUri)
    if (!receiverKey) {
      throw new SDKErrors.DidError(`Cannot resolve key "${receiverKeyUri}"`)
    }
    if (this.receiver !== receiverKey.controller) {
      throw new SDKErrors.IdentityMismatchError(
        'receiver public key',
        'receiver'
      )
    }
    if (this.sender !== senderDetails.uri) {
      throw new SDKErrors.IdentityMismatchError('sender public key', 'sender')
    }
    const senderKey = Did.getKey(senderDetails, senderKeyId)
    if (!senderKey || !Did.Utils.isEncryptionKey(senderKey)) {
      throw new SDKErrors.DidError(
        `Cannot find key with ID "${senderKeyId}" for the sender DID`
      )
    }
    const senderKeyAlgType =
      Did.Utils.getEncryptionAlgorithmForEncryptionKeyType(
        senderKey.type as EncryptionKeyType
      )
    if (senderKeyAlgType !== 'x25519-xsalsa20-poly1305') {
      throw new SDKErrors.EncryptionError(
        'Only the "x25519-xsalsa20-poly1305" encryption algorithm currently supported'
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

    const encrypted = await encryptCallback({
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
      senderKeyUri: `${senderDetails.uri}${senderKey.id}`,
      receiverKeyUri: receiverKey.id,
    }
  }

  /**
   * Compresses a [[MessageBody]] depending on the message body type.
   *
   * @returns Returns the compressed message optimised for sending.
   */
  public compress(): CompressedMessageBody {
    return compressMessage(this.body)
  }

  /**
   * Verifies required properties for a given [[CType]] before sending or receiving a message.
   *
   * @param requiredProperties The list of required properties that need to be verified against a [[CType]].
   * @param cType A [[CType]] used to verify the properties.
   */
  public static verifyRequiredCTypeProperties(
    requiredProperties: string[],
    cType: ICType
  ): void {
    verifyRequiredCTypeProperties(requiredProperties, cType)
  }
}
