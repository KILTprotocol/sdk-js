/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @packageDocumentation
 * @module MessageUtils
 */

import {
  Attestation,
  CredentialUtils,
  Claim,
  CType,
  Quote,
  RequestForAttestation,
} from '@kiltprotocol/core'
import type {
  ICredential,
  CompressedCredential,
  CompressedMessageBody,
  MessageBody,
  CompressedRequestCredentialContent,
  ICType,
  IMessage,
  IDelegationData,
} from '@kiltprotocol/types'
import { DataUtils, SDKErrors } from '@kiltprotocol/utils'
import { isHex, isJsonObject } from '@polkadot/util'
import { DidUtils } from '@kiltprotocol/did'

import { Message } from './Message.js'

// Had to add the check as differs from the delegation types
export function errorCheckDelegationData(
  delegationData: IDelegationData
): boolean | void {
  const { permissions, id, parentId, isPCR, account } = delegationData

  if (!id) {
    throw SDKErrors.ERROR_DELEGATION_ID_MISSING()
  } else if (typeof id !== 'string') {
    throw SDKErrors.ERROR_DELEGATION_ID_TYPE()
  } else if (!isHex(id)) {
    throw SDKErrors.ERROR_DELEGATION_ID_TYPE()
  }

  if (!account) {
    throw SDKErrors.ERROR_OWNER_NOT_PROVIDED()
  } else DidUtils.validateKiltDid(account)

  if (typeof isPCR !== 'boolean') {
    throw new TypeError('isPCR is expected to be a boolean')
  }

  if (permissions.length === 0 || permissions.length > 3) {
    throw SDKErrors.ERROR_UNAUTHORIZED(
      'Must have at least one permission and no more then two'
    )
  }

  if (parentId) {
    if (typeof parentId !== 'string') {
      throw SDKErrors.ERROR_DELEGATION_ID_TYPE()
    } else if (!isHex(parentId)) {
      throw SDKErrors.ERROR_DELEGATION_ID_TYPE()
    }
  }
}

export function errorCheckMessageBody(body: MessageBody): boolean | void {
  switch (body.type) {
    case Message.BodyType.REQUEST_TERMS: {
      Claim.verifyDataStructure(body.content)
      break
    }
    case Message.BodyType.SUBMIT_TERMS: {
      Claim.verifyDataStructure(body.content.claim)
      body.content.legitimations.map((credential: ICredential) =>
        CredentialUtils.errorCheck(credential)
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
        body.content.cTypes.map((val) => CType.verifyDataStructure(val))
      }
      break
    }
    case Message.BodyType.REJECT_TERMS: {
      Claim.verifyDataStructure(body.content.claim)
      if (body.content.delegationId) {
        DataUtils.validateHash(
          body.content.delegationId,
          'Reject terms delegation id hash'
        )
      }
      body.content.legitimations.map((val) => CredentialUtils.errorCheck(val))
      break
    }
    case Message.BodyType.REQUEST_ATTESTATION: {
      RequestForAttestation.verifyDataStructure(
        body.content.requestForAttestation
      )
      if (body.content.quote) {
        Quote.validateQuoteSchema(Quote.QuoteSchema, body.content.quote)
      }
      break
    }
    case Message.BodyType.SUBMIT_ATTESTATION: {
      Attestation.errorCheck(body.content.attestation)
      break
    }
    case Message.BodyType.REJECT_ATTESTATION: {
      if (!isHex(body.content)) {
        throw SDKErrors.ERROR_HASH_MALFORMED()
      }
      break
    }
    case Message.BodyType.REQUEST_CREDENTIAL: {
      body.content.cTypes.forEach(
        ({ cTypeHash, trustedAttesters, requiredProperties }): void => {
          DataUtils.validateHash(
            cTypeHash,
            'request credential cTypeHash invalid'
          )
          trustedAttesters?.map((did) => DidUtils.validateKiltDid(did))
          requiredProperties?.forEach((requiredProps) => {
            if (typeof requiredProps !== 'string')
              throw new TypeError(
                'required properties is expected to be a string'
              )
          })
        }
      )
      break
    }
    case Message.BodyType.SUBMIT_CREDENTIAL: {
      body.content.map((credential) => CredentialUtils.errorCheck(credential))
      break
    }
    case Message.BodyType.ACCEPT_CREDENTIAL: {
      body.content.map((cTypeHash) =>
        DataUtils.validateHash(
          cTypeHash,
          'accept credential message ctype hash invalid'
        )
      )
      break
    }
    case Message.BodyType.REJECT_CREDENTIAL: {
      body.content.map((cTypeHash) =>
        DataUtils.validateHash(
          cTypeHash,
          'rejected credential ctype hashes invalid'
        )
      )
      break
    }
    case Message.BodyType.REQUEST_ACCEPT_DELEGATION: {
      errorCheckDelegationData(body.content.delegationData)
      DidUtils.validateDidSignature(body.content.signatures.inviter)
      if (!isJsonObject(body.content.metaData)) {
        throw SDKErrors.ERROR_OBJECT_MALFORMED()
      }
      break
    }
    case Message.BodyType.SUBMIT_ACCEPT_DELEGATION: {
      errorCheckDelegationData(body.content.delegationData)
      DidUtils.validateDidSignature(body.content.signatures.inviter)
      DidUtils.validateDidSignature(body.content.signatures.invitee)
      break
    }

    case Message.BodyType.REJECT_ACCEPT_DELEGATION: {
      errorCheckDelegationData(body.content)
      break
    }
    case Message.BodyType.INFORM_CREATE_DELEGATION: {
      DataUtils.validateHash(
        body.content.delegationId,
        'inform create delegation message delegation id invalid'
      )
      break
    }

    default:
      throw SDKErrors.ERROR_MESSAGE_BODY_MALFORMED()
  }

  return true
}

export function errorCheckMessage(message: IMessage): boolean | void {
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
    throw new TypeError('message id is expected to be a string')
  }
  if (createdAt && typeof createdAt !== 'number') {
    throw new TypeError('created at is expected to be a number')
  }
  if (receivedAt && typeof receivedAt !== 'number') {
    throw new TypeError('received at is expected to be a number')
  }
  DidUtils.validateKiltDid(receiver)
  DidUtils.validateKiltDid(sender)
  if (inReplyTo && typeof inReplyTo !== 'string') {
    throw new TypeError('in reply to is expected to be a string')
  }
  errorCheckMessageBody(body)
  return true
}

/**
 * Verifies required properties for a given [[CType]] before sending or receiving a message.
 *
 * @param requiredProperties The list of required properties that need to be verified against a [[CType]].
 * @param cType A [[CType]] used to verify the properties.
 * @throws [[ERROR_CTYPE_HASH_NOT_PROVIDED]] when the properties do not match the provide [[CType]].
 *
 * @returns Returns the properties back.
 */

export function verifyRequiredCTypeProperties(
  requiredProperties: string[],
  cType: ICType
): boolean {
  CType.verifyDataStructure(cType as ICType)

  const validProperties = requiredProperties.find(
    (property) => !(property in cType.schema.properties)
  )
  if (validProperties) {
    throw SDKErrors.ERROR_CTYPE_PROPERTIES_NOT_MATCHING()
  }

  return true
}

/**
 * Compresses a [[MessageBody]] depending on the message body type.
 *
 * @param body The body of the [[IMessage]] which depends on the [[MessageBodyType]] that needs to be compressed.
 *
 * @returns Returns the compressed message optimised for sending.
 */

export function compressMessage(body: MessageBody): CompressedMessageBody {
  let compressedContents: CompressedMessageBody[1]
  switch (body.type) {
    case Message.BodyType.REQUEST_TERMS: {
      compressedContents = Claim.compress(body.content)
      break
    }
    case Message.BodyType.SUBMIT_TERMS: {
      compressedContents = [
        Claim.compress(body.content.claim),
        body.content.legitimations.map(
          (credential: ICredential | CompressedCredential) =>
            Array.isArray(credential)
              ? credential
              : CredentialUtils.compress(credential)
        ),
        body.content.delegationId,
        body.content.quote
          ? Quote.compressAttesterSignedQuote(body.content.quote)
          : undefined,
        body.content.cTypes?.map((val) => CType.compress(val)),
      ]
      break
    }
    case Message.BodyType.REJECT_TERMS: {
      compressedContents = [
        Claim.compress(body.content.claim),
        body.content.legitimations.map((val) => CredentialUtils.compress(val)),
        body.content.delegationId || undefined,
      ]
      break
    }
    case Message.BodyType.REQUEST_ATTESTATION: {
      compressedContents = [
        RequestForAttestation.compress(body.content.requestForAttestation),
        body.content.quote
          ? Quote.compressQuoteAgreement(body.content.quote)
          : undefined,
      ]
      break
    }
    case Message.BodyType.SUBMIT_ATTESTATION: {
      compressedContents = Attestation.compress(body.content.attestation)
      break
    }
    case Message.BodyType.REQUEST_CREDENTIAL: {
      const compressedCtypes: CompressedRequestCredentialContent[0] =
        body.content.cTypes.map(
          ({ cTypeHash, trustedAttesters, requiredProperties }) => {
            return [cTypeHash, trustedAttesters, requiredProperties]
          }
        )
      compressedContents = [compressedCtypes, body.content.challenge]
      break
    }
    case Message.BodyType.SUBMIT_CREDENTIAL: {
      compressedContents = body.content.map(
        (credential: ICredential | CompressedCredential) =>
          Array.isArray(credential)
            ? credential
            : CredentialUtils.compress(credential)
      )
      break
    }
    case Message.BodyType.REQUEST_ACCEPT_DELEGATION: {
      compressedContents = [
        [
          body.content.delegationData.account,
          body.content.delegationData.id,
          body.content.delegationData.parentId,
          body.content.delegationData.permissions,
          body.content.delegationData.isPCR,
        ],
        [
          body.content.signatures.inviter.signature,
          body.content.signatures.inviter.keyId,
        ],
        body.content.metaData,
      ]
      break
    }
    case Message.BodyType.SUBMIT_ACCEPT_DELEGATION: {
      compressedContents = [
        [
          body.content.delegationData.account,
          body.content.delegationData.id,
          body.content.delegationData.parentId,
          body.content.delegationData.permissions,
          body.content.delegationData.isPCR,
        ],
        [
          body.content.signatures.inviter.signature,
          body.content.signatures.inviter.keyId,
        ],
        [
          body.content.signatures.invitee.signature,
          body.content.signatures.invitee.keyId,
        ],
      ]
      break
    }
    case Message.BodyType.REJECT_ACCEPT_DELEGATION: {
      compressedContents = [
        body.content.account,
        body.content.id,
        body.content.parentId,
        body.content.permissions,
        body.content.isPCR,
      ]
      break
    }
    case Message.BodyType.INFORM_CREATE_DELEGATION: {
      compressedContents = [body.content.delegationId, body.content.isPCR]
      break
    }
    default:
      throw SDKErrors.ERROR_MESSAGE_BODY_MALFORMED()
  }
  return [body.type, compressedContents] as CompressedMessageBody
}

/**
 * [STATIC] Takes a compressed [[MessageBody]] and decompresses it depending on the message body type.
 *
 * @param body The body of the compressed [[IMessage]] which depends on the [[MessageBodyType]] that needs to be decompressed.
 *
 * @returns Returns the compressed message back to its original form and more human readable.
 */

export function decompressMessage(body: CompressedMessageBody): MessageBody {
  // body[0] is the [[MessageBodyType]] being sent.
  // body[1] is the content order of the [[compressMessage]] for each [[MessageBodyType]].
  // Each index matches the object keys from the given [[MessageBodyType]].
  let decompressedContents: MessageBody['content']
  switch (body[0]) {
    case Message.BodyType.REQUEST_TERMS: {
      decompressedContents = Claim.decompress(body[1])
      break
    }
    case Message.BodyType.SUBMIT_TERMS: {
      decompressedContents = {
        claim: Claim.decompress(body[1][0]),
        legitimations: body[1][1].map(
          (credential: ICredential | CompressedCredential) =>
            !Array.isArray(credential)
              ? credential
              : CredentialUtils.decompress(credential)
        ),
        delegationId: body[1][2],
        quote: body[1][3]
          ? Quote.decompressAttesterSignedQuote(body[1][3])
          : undefined,
        cTypes: body[1][4]?.map((val) => CType.decompress(val)),
      }

      break
    }
    case Message.BodyType.REJECT_TERMS: {
      decompressedContents = {
        claim: Claim.decompress(body[1][0]),
        legitimations: body[1][1].map((val) => CredentialUtils.decompress(val)),
        delegationId: body[1][2] ? body[1][2] : undefined,
      }
      break
    }
    case Message.BodyType.REQUEST_ATTESTATION: {
      decompressedContents = {
        requestForAttestation: RequestForAttestation.decompress(body[1][0]),
        quote: body[1][1]
          ? Quote.decompressQuoteAgreement(body[1][1])
          : undefined,
      }

      break
    }
    case Message.BodyType.SUBMIT_ATTESTATION: {
      decompressedContents = {
        attestation: Attestation.decompress(body[1]),
      }
      break
    }
    case Message.BodyType.REQUEST_CREDENTIAL: {
      decompressedContents = {
        cTypes: body[1][0].map((val) => ({
          cTypeHash: val[0],
          trustedAttesters: val[1],
          requiredProperties: val[2],
        })),
        challenge: body[1][1],
      }
      break
    }
    case Message.BodyType.SUBMIT_CREDENTIAL: {
      decompressedContents = body[1].map(
        (credential: ICredential | CompressedCredential) =>
          !Array.isArray(credential)
            ? credential
            : CredentialUtils.decompress(credential)
      )

      break
    }
    case Message.BodyType.REQUEST_ACCEPT_DELEGATION: {
      decompressedContents = {
        delegationData: {
          account: body[1][0][0],
          id: body[1][0][1],
          parentId: body[1][0][2],
          permissions: body[1][0][3],
          isPCR: body[1][0][4],
        },
        signatures: {
          inviter: { signature: body[1][1][0], keyId: body[1][1][1] },
        },
        metaData: body[1][2],
      }
      break
    }
    case Message.BodyType.SUBMIT_ACCEPT_DELEGATION: {
      decompressedContents = {
        delegationData: {
          account: body[1][0][0],
          id: body[1][0][1],
          parentId: body[1][0][2],
          permissions: body[1][0][3],
          isPCR: body[1][0][4],
        },
        signatures: {
          inviter: { signature: body[1][1][0], keyId: body[1][1][1] },
          invitee: { signature: body[1][2][0], keyId: body[1][2][1] },
        },
      }
      break
    }
    case Message.BodyType.REJECT_ACCEPT_DELEGATION: {
      decompressedContents = {
        account: body[1][0],
        id: body[1][1],
        parentId: body[1][2],
        permissions: body[1][3],
        isPCR: body[1][4],
      }
      break
    }
    case Message.BodyType.INFORM_CREATE_DELEGATION: {
      decompressedContents = {
        delegationId: body[1][0],
        isPCR: body[1][1],
      }
      break
    }
    default:
      throw SDKErrors.ERROR_MESSAGE_BODY_MALFORMED()
  }

  return { type: body[0], content: decompressedContents } as MessageBody
}
