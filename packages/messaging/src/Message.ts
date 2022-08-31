/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type {
  DecryptCallback,
  DidDetails,
  DidEncryptionKey,
  DidResolveKey,
  DidResourceUri,
  EncryptCallback,
  EncryptionKeyType,
  IEncryptedMessage,
  IEncryptedMessageContents,
  ICType,
  IDelegationData,
  IMessage,
  MessageBody,
} from '@kiltprotocol/types'
import { encryptionKeyTypes } from '@kiltprotocol/types'
import {
  Attestation,
  Claim,
  Credential,
  CType,
  Quote,
} from '@kiltprotocol/core'
import { DataUtils, SDKErrors, UUID } from '@kiltprotocol/utils'
import * as Did from '@kiltprotocol/did'
import {
  hexToU8a,
  stringToU8a,
  u8aToHex,
  u8aToString,
  isHex,
  isJsonObject,
} from '@polkadot/util'

/**
 * Checks if delegation data is well formed.
 *
 * @param delegationData Delegation data to check.
 */
export function errorCheckDelegationData(
  delegationData: IDelegationData
): void {
  const { permissions, id, parentId, isPCR, account } = delegationData

  if (!id) {
    throw new SDKErrors.DelegationIdMissingError()
  } else if (typeof id !== 'string' || !isHex(id)) {
    throw new SDKErrors.DelegationIdTypeError()
  }

  if (!account) {
    throw new SDKErrors.OwnerMissingError()
  }
  Did.Utils.validateKiltDidUri(account)

  if (typeof isPCR !== 'boolean') {
    throw new TypeError('isPCR is expected to be a boolean')
  }

  if (permissions.length === 0 || permissions.length > 3) {
    throw new SDKErrors.UnauthorizedError(
      'Must have at least one permission and no more then two'
    )
  }

  if (parentId && (typeof parentId !== 'string' || !isHex(parentId))) {
    throw new SDKErrors.DelegationIdTypeError()
  }
}

/**
 * Checks if the message body is well-formed.
 *
 * @param body The message body.
 */
export function errorCheckMessageBody(body: MessageBody): void {
  switch (body.type) {
    case 'request-terms': {
      Claim.verifyDataStructure(body.content)
      break
    }
    case 'submit-terms': {
      Claim.verifyDataStructure(body.content.claim)
      body.content.legitimations.forEach((credential) =>
        Credential.verifyDataStructure(credential)
      )
      if (body.content.delegationId) {
        DataUtils.validateHash(
          body.content.delegationId,
          'Submit terms delegation id hash invalid'
        )
      }
      if (body.content.quote) {
        Quote.validateQuoteSchema(Quote.QuoteSchema, body.content.quote)
      }
      if (body.content.cTypes) {
        body.content.cTypes.forEach((val) => CType.verifyDataStructure(val))
      }
      break
    }
    case 'reject-terms': {
      Claim.verifyDataStructure(body.content.claim)
      if (body.content.delegationId) {
        DataUtils.validateHash(
          body.content.delegationId,
          'Reject terms delegation id hash'
        )
      }
      body.content.legitimations.forEach((val) =>
        Credential.verifyDataStructure(val)
      )
      break
    }
    case 'request-attestation': {
      Credential.verifyDataStructure(body.content.credential)
      if (body.content.quote) {
        Quote.validateQuoteSchema(Quote.QuoteSchema, body.content.quote)
      }
      break
    }
    case 'submit-attestation': {
      Attestation.verifyDataStructure(body.content.attestation)
      break
    }
    case 'reject-attestation': {
      if (!isHex(body.content)) {
        throw new SDKErrors.HashMalformedError()
      }
      break
    }
    case 'request-credential': {
      body.content.cTypes.forEach(
        ({ cTypeHash, trustedAttesters, requiredProperties }): void => {
          DataUtils.validateHash(
            cTypeHash,
            'request credential cTypeHash invalid'
          )
          trustedAttesters?.forEach((did) => Did.Utils.validateKiltDidUri(did))
          requiredProperties?.forEach((requiredProps) => {
            if (typeof requiredProps !== 'string')
              throw new TypeError(
                'Required properties is expected to be a string'
              )
          })
        }
      )
      break
    }
    case 'submit-credential': {
      body.content.forEach((credential) =>
        Credential.verifyDataStructure(credential)
      )
      break
    }
    case 'accept-credential': {
      body.content.forEach((cTypeHash) =>
        DataUtils.validateHash(
          cTypeHash,
          'accept credential message ctype hash invalid'
        )
      )
      break
    }
    case 'reject-credential': {
      body.content.forEach((cTypeHash) =>
        DataUtils.validateHash(
          cTypeHash,
          'rejected credential ctype hashes invalid'
        )
      )
      break
    }
    case 'request-accept-delegation': {
      errorCheckDelegationData(body.content.delegationData)
      Did.isDidSignature(body.content.signatures.inviter)
      if (!isJsonObject(body.content.metaData)) {
        throw new SDKErrors.ObjectUnverifiableError()
      }
      break
    }
    case 'submit-accept-delegation': {
      errorCheckDelegationData(body.content.delegationData)
      Did.isDidSignature(body.content.signatures.inviter)
      Did.isDidSignature(body.content.signatures.invitee)
      break
    }

    case 'reject-accept-delegation': {
      errorCheckDelegationData(body.content)
      break
    }
    case 'inform-create-delegation': {
      DataUtils.validateHash(
        body.content.delegationId,
        'inform create delegation message delegation id invalid'
      )
      break
    }

    default:
      throw new SDKErrors.UnknownMessageBodyTypeError()
  }
}

/**
 * Checks if the message object is well-formed.
 *
 * @param message The message object.
 */
export function errorCheckMessage(message: IMessage): void {
  const {
    body,
    messageId,
    createdAt,
    receiver,
    sender,
    receivedAt,
    inReplyTo,
  } = message
  if (messageId && typeof messageId !== 'string') {
    throw new TypeError('Message id is expected to be a string')
  }
  if (createdAt && typeof createdAt !== 'number') {
    throw new TypeError('Created at is expected to be a number')
  }
  if (receivedAt && typeof receivedAt !== 'number') {
    throw new TypeError('Received at is expected to be a number')
  }
  Did.Utils.validateKiltDidUri(receiver)
  Did.Utils.validateKiltDidUri(sender)
  if (inReplyTo && typeof inReplyTo !== 'string') {
    throw new TypeError('In reply to is expected to be a string')
  }
  errorCheckMessageBody(body)
}

/**
 * Verifies required properties for a given [[CType]] before sending or receiving a message.
 *
 * @param requiredProperties The list of required properties that need to be verified against a [[CType]].
 * @param cType A [[CType]] used to verify the properties.
 */
export function verifyRequiredCTypeProperties(
  requiredProperties: string[],
  cType: ICType
): void {
  CType.verifyDataStructure(cType as ICType)

  const unknownProperties = requiredProperties.find(
    (property) => !(property in cType.schema.properties)
  )
  if (unknownProperties) {
    throw new SDKErrors.CTypeUnknownPropertiesError()
  }
}

/**
 * Verifies that the sender of a [[Message]] is also the owner of it, e.g the owner's and sender's DIDs refer to the same subject.
 *
 * @param message The [[Message]] object which needs to be decrypted.
 * @param message.body The body of the [[Message]] which depends on the [[BodyType]].
 * @param message.sender The sender's DID taken from the [[IMessage]].
 */
export function ensureOwnerIsSender({ body, sender }: IMessage): void {
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
 * @param encrypted The encrypted message.
 * @param decryptCallback The callback to decrypt with the secret key.
 * @param receiverDetails The DID details of the receiver.
 * @param decryptionOptions Options to perform the decryption operation.
 * @param decryptionOptions.resolveKey The DID key resolver to use.
 * @returns The original [[Message]].
 */
export async function decrypt(
  encrypted: IEncryptedMessage,
  decryptCallback: DecryptCallback,
  receiverDetails: DidDetails,
  {
    resolveKey = Did.resolveKey,
  }: {
    resolveKey?: DidResolveKey
  } = {}
): Promise<IMessage> {
  const { senderKeyUri, receiverKeyUri, ciphertext, nonce, receivedAt } =
    encrypted

  const senderKeyDetails = await resolveKey(senderKeyUri)
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
  if (
    !receiverKeyDetails ||
    !encryptionKeyTypes.includes(receiverKeyDetails.type)
  ) {
    throw new SDKErrors.DidError(
      `Could not resolve receiver encryption key "${receiverKeyUri}"`
    )
  }
  const receiverKeyAlgType =
    Did.Utils.encryptionAlgForKeyType[
      receiverKeyDetails.type as EncryptionKeyType
    ]
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

  return decrypted
}

/**
 * Checks the message structure and body contents (e.g. Hashes match, ensures the owner is the sender).
 * Throws, if a check fails.
 *
 * @param decryptedMessage The decrypted message to check.
 */
export function verify(decryptedMessage: IMessage): void {
  // checks the message body
  errorCheckMessageBody(decryptedMessage.body)
  // checks the message structure
  errorCheckMessage(decryptedMessage)
  // make sure the sender is the owner of the identity
  ensureOwnerIsSender(decryptedMessage)
}

/**
 * Constructs a message from a message body.
 * This should be encrypted with [[Message.encrypt]] before sending to the receiver.
 *
 * @param body The body of the message.
 * @param sender The DID of the sender.
 * @param receiver The DID of the receiver.
 * @returns The message created.
 */
export function fromBody(
  body: MessageBody,
  sender: IMessage['sender'],
  receiver: IMessage['receiver']
): IMessage {
  return {
    body,
    createdAt: Date.now(),
    receiver,
    sender,
    messageId: UUID.generate(),
  }
}

/**
 * Encrypts the [[Message]] as a string. This can be reversed with [[Message.decrypt]].
 *
 * @param message The message to encrypt.
 * @param senderKeyId The sender's encryption key ID, without the DID prefix and '#' symbol.
 * @param senderDetails The sender's DID to use to fetch the right encryption key.
 * @param encryptCallback The callback to encrypt with the secret key.
 * @param receiverKeyUri The key URI of the receiver.
 * @param encryptionOptions Options to perform the encryption operation.
 * @param encryptionOptions.resolveKey The DID key resolver to use.
 *
 * @returns The encrypted version of the original [[Message]], see [[IEncryptedMessage]].
 */
export async function encrypt(
  message: IMessage,
  senderKeyId: DidEncryptionKey['id'],
  senderDetails: DidDetails,
  encryptCallback: EncryptCallback,
  receiverKeyUri: DidResourceUri,
  {
    resolveKey = Did.resolveKey,
  }: {
    resolveKey?: DidResolveKey
  } = {}
): Promise<IEncryptedMessage> {
  const receiverKey = await resolveKey(receiverKeyUri)
  if (!receiverKey) {
    throw new SDKErrors.DidError(`Cannot resolve key "${receiverKeyUri}"`)
  }
  if (message.receiver !== receiverKey.controller) {
    throw new SDKErrors.IdentityMismatchError('receiver public key', 'receiver')
  }
  if (message.sender !== senderDetails.uri) {
    throw new SDKErrors.IdentityMismatchError('sender public key', 'sender')
  }
  const senderKey = Did.getKey(senderDetails, senderKeyId)
  if (!senderKey || !encryptionKeyTypes.includes(senderKey.type)) {
    throw new SDKErrors.DidError(
      `Cannot find key with ID "${senderKeyId}" for the sender DID`
    )
  }
  const senderKeyAlgType =
    Did.Utils.encryptionAlgForKeyType[senderKey.type as EncryptionKeyType]
  if (senderKeyAlgType !== 'x25519-xsalsa20-poly1305') {
    throw new SDKErrors.EncryptionError(
      'Only the "x25519-xsalsa20-poly1305" encryption algorithm currently supported'
    )
  }

  const toEncrypt: IEncryptedMessageContents = {
    body: message.body,
    createdAt: message.createdAt,
    sender: message.sender,
    receiver: message.receiver,
    messageId: message.messageId,
    inReplyTo: message.inReplyTo,
    references: message.references,
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
    receivedAt: message.receivedAt,
    ciphertext,
    nonce,
    senderKeyUri: `${senderDetails.uri}${senderKey.id}`,
    receiverKeyUri: receiverKey.id,
  }
}
