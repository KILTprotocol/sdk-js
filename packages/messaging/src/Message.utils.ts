/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import {
  Attestation,
  Claim,
  Credential,
  CType,
  Quote,
  RequestForAttestation,
} from '@kiltprotocol/core'
import type {
  CompressedCredential,
  CompressedMessageBody,
  CompressedRequestCredentialContent,
  ICredential,
  ICType,
  IDelegationData,
  IMessage,
  MessageBody,
} from '@kiltprotocol/types'
import { DataUtils, SDKErrors } from '@kiltprotocol/utils'
import { isHex, isJsonObject } from '@polkadot/util'
import { isDidSignature, Utils as DidUtils } from '@kiltprotocol/did'

/**
 * Checks if delegation data is well formed.
 *
 * @param delegationData Delegation data to check.
 * @throws [[SDKError]] if delegationData is not a valid instance of [[IDelegationData]].
 */
export function errorCheckDelegationData(
  delegationData: IDelegationData
): void {
  const { permissions, id, parentId, isPCR, account } = delegationData

  if (!id) {
    throw new SDKErrors.ERROR_DELEGATION_ID_MISSING()
  } else if (typeof id !== 'string') {
    throw new SDKErrors.ERROR_DELEGATION_ID_TYPE()
  } else if (!isHex(id)) {
    throw new SDKErrors.ERROR_DELEGATION_ID_TYPE()
  }

  if (!account) {
    throw new SDKErrors.ERROR_OWNER_NOT_PROVIDED()
  } else DidUtils.validateKiltDidUri(account)

  if (typeof isPCR !== 'boolean') {
    throw new TypeError('isPCR is expected to be a boolean')
  }

  if (permissions.length === 0 || permissions.length > 3) {
    throw new SDKErrors.ERROR_UNAUTHORIZED(
      'Must have at least one permission and no more then two'
    )
  }

  if (parentId) {
    if (typeof parentId !== 'string') {
      throw new SDKErrors.ERROR_DELEGATION_ID_TYPE()
    } else if (!isHex(parentId)) {
      throw new SDKErrors.ERROR_DELEGATION_ID_TYPE()
    }
  }
}

/**
 * Checks if the message body is well-formed.
 *
 * @param body The message body.
 * @throws [[SDKError]] if there are issues with form or content of the message body.
 */
export function errorCheckMessageBody(body: MessageBody): void {
  switch (body.type) {
    case 'request-terms': {
      Claim.verifyDataStructure(body.content)
      break
    }
    case 'submit-terms': {
      Claim.verifyDataStructure(body.content.claim)
      body.content.legitimations.map((credential) =>
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
        body.content.cTypes.map((val) => CType.verifyDataStructure(val))
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
      body.content.legitimations.map((val) =>
        Credential.verifyDataStructure(val)
      )
      break
    }
    case 'request-attestation': {
      RequestForAttestation.verifyDataStructure(
        body.content.requestForAttestation
      )
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
        throw new SDKErrors.ERROR_HASH_MALFORMED()
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
          trustedAttesters?.map((did) => DidUtils.validateKiltDidUri(did))
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
    case 'submit-credential': {
      body.content.map((credential) =>
        Credential.verifyDataStructure(credential)
      )
      break
    }
    case 'accept-credential': {
      body.content.map((cTypeHash) =>
        DataUtils.validateHash(
          cTypeHash,
          'accept credential message ctype hash invalid'
        )
      )
      break
    }
    case 'reject-credential': {
      body.content.map((cTypeHash) =>
        DataUtils.validateHash(
          cTypeHash,
          'rejected credential ctype hashes invalid'
        )
      )
      break
    }
    case 'request-accept-delegation': {
      errorCheckDelegationData(body.content.delegationData)
      isDidSignature(body.content.signatures.inviter)
      if (!isJsonObject(body.content.metaData)) {
        throw new SDKErrors.ERROR_OBJECT_MALFORMED()
      }
      break
    }
    case 'submit-accept-delegation': {
      errorCheckDelegationData(body.content.delegationData)
      isDidSignature(body.content.signatures.inviter)
      isDidSignature(body.content.signatures.invitee)
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
      throw new SDKErrors.ERROR_MESSAGE_BODY_MALFORMED()
  }
}

/**
 * Checks if the message object is well-formed.
 *
 * @param message The message object.
 * @throws [[SDKError]] if there are issues with form or content of the message object.
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
    throw new TypeError('message id is expected to be a string')
  }
  if (createdAt && typeof createdAt !== 'number') {
    throw new TypeError('created at is expected to be a number')
  }
  if (receivedAt && typeof receivedAt !== 'number') {
    throw new TypeError('received at is expected to be a number')
  }
  DidUtils.validateKiltDidUri(receiver)
  DidUtils.validateKiltDidUri(sender)
  if (inReplyTo && typeof inReplyTo !== 'string') {
    throw new TypeError('in reply to is expected to be a string')
  }
  errorCheckMessageBody(body)
}

/**
 * Verifies required properties for a given [[CType]] before sending or receiving a message.
 *
 * @param requiredProperties The list of required properties that need to be verified against a [[CType]].
 * @param cType A [[CType]] used to verify the properties.
 * @throws [[ERROR_CTYPE_HASH_NOT_PROVIDED]] when the properties do not match the provide [[CType]].
 */
export function verifyRequiredCTypeProperties(
  requiredProperties: string[],
  cType: ICType
): void {
  CType.verifyDataStructure(cType as ICType)

  const validProperties = requiredProperties.find(
    (property) => !(property in cType.schema.properties)
  )
  if (validProperties) {
    throw new SDKErrors.ERROR_CTYPE_PROPERTIES_NOT_MATCHING()
  }
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
    case 'request-terms': {
      compressedContents = Claim.compress(body.content)
      break
    }
    case 'submit-terms': {
      compressedContents = [
        Claim.compress(body.content.claim),
        body.content.legitimations.map(
          (credential: ICredential | CompressedCredential) =>
            Array.isArray(credential)
              ? credential
              : Credential.compress(credential)
        ),
        body.content.delegationId,
        body.content.quote
          ? Quote.compressAttesterSignedQuote(body.content.quote)
          : undefined,
        body.content.cTypes?.map((val) => CType.compress(val)),
      ]
      break
    }
    case 'reject-terms': {
      compressedContents = [
        Claim.compress(body.content.claim),
        body.content.legitimations.map((val) => Credential.compress(val)),
        body.content.delegationId || undefined,
      ]
      break
    }
    case 'request-attestation': {
      compressedContents = [
        RequestForAttestation.compress(body.content.requestForAttestation),
        body.content.quote
          ? Quote.compressQuoteAgreement(body.content.quote)
          : undefined,
      ]
      break
    }
    case 'submit-attestation': {
      compressedContents = Attestation.compress(body.content.attestation)
      break
    }
    case 'request-credential': {
      const compressedCtypes: CompressedRequestCredentialContent[0] =
        body.content.cTypes.map(
          ({ cTypeHash, trustedAttesters, requiredProperties }) => [
            cTypeHash,
            trustedAttesters,
            requiredProperties,
          ]
        )
      compressedContents = [compressedCtypes, body.content.challenge]
      break
    }
    case 'submit-credential': {
      compressedContents = body.content.map(
        (credential: ICredential | CompressedCredential) =>
          Array.isArray(credential)
            ? credential
            : Credential.compress(credential)
      )
      break
    }
    case 'request-accept-delegation': {
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
          body.content.signatures.inviter.keyUri,
        ],
        body.content.metaData,
      ]
      break
    }
    case 'submit-accept-delegation': {
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
          body.content.signatures.inviter.keyUri,
        ],
        [
          body.content.signatures.invitee.signature,
          body.content.signatures.invitee.keyUri,
        ],
      ]
      break
    }
    case 'reject-accept-delegation': {
      compressedContents = [
        body.content.account,
        body.content.id,
        body.content.parentId,
        body.content.permissions,
        body.content.isPCR,
      ]
      break
    }
    case 'inform-create-delegation': {
      compressedContents = [body.content.delegationId, body.content.isPCR]
      break
    }
    default:
      throw new SDKErrors.ERROR_MESSAGE_BODY_MALFORMED()
  }
  return [body.type, compressedContents] as CompressedMessageBody
}

/**
 * Takes a compressed [[MessageBody]] and decompresses it depending on the message body type.
 *
 * @param body The body of the compressed [[IMessage]] which depends on the [[MessageBodyType]] that needs to be decompressed.
 *
 * @returns Returns the compressed message back to its original form and more human-readable.
 */
export function decompressMessage(body: CompressedMessageBody): MessageBody {
  // body[0] is the [[MessageBodyType]] being sent.
  // body[1] is the content order of the [[compressMessage]] for each [[MessageBodyType]].
  // Each index matches the object keys from the given [[MessageBodyType]].
  let decompressedContents: MessageBody['content']
  switch (body[0]) {
    case 'request-terms': {
      decompressedContents = Claim.decompress(body[1])
      break
    }
    case 'submit-terms': {
      decompressedContents = {
        claim: Claim.decompress(body[1][0]),
        legitimations: body[1][1].map(
          (credential: ICredential | CompressedCredential) =>
            !Array.isArray(credential)
              ? credential
              : Credential.decompress(credential)
        ),
        delegationId: body[1][2],
        quote: body[1][3]
          ? Quote.decompressAttesterSignedQuote(body[1][3])
          : undefined,
        cTypes: body[1][4]?.map((val) => CType.decompress(val)),
      }

      break
    }
    case 'reject-terms': {
      decompressedContents = {
        claim: Claim.decompress(body[1][0]),
        legitimations: body[1][1].map((val) => Credential.decompress(val)),
        delegationId: body[1][2] ? body[1][2] : undefined,
      }
      break
    }
    case 'request-attestation': {
      decompressedContents = {
        requestForAttestation: RequestForAttestation.decompress(body[1][0]),
        quote: body[1][1]
          ? Quote.decompressQuoteAgreement(body[1][1])
          : undefined,
      }

      break
    }
    case 'submit-attestation': {
      decompressedContents = {
        attestation: Attestation.decompress(body[1]),
      }
      break
    }
    case 'request-credential': {
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
    case 'submit-credential': {
      decompressedContents = body[1].map(
        (credential: ICredential | CompressedCredential) =>
          !Array.isArray(credential)
            ? credential
            : Credential.decompress(credential)
      )

      break
    }
    case 'request-accept-delegation': {
      decompressedContents = {
        delegationData: {
          account: body[1][0][0],
          id: body[1][0][1],
          parentId: body[1][0][2],
          permissions: body[1][0][3],
          isPCR: body[1][0][4],
        },
        signatures: {
          inviter: { signature: body[1][1][0], keyUri: body[1][1][1] },
        },
        metaData: body[1][2],
      }
      break
    }
    case 'submit-accept-delegation': {
      decompressedContents = {
        delegationData: {
          account: body[1][0][0],
          id: body[1][0][1],
          parentId: body[1][0][2],
          permissions: body[1][0][3],
          isPCR: body[1][0][4],
        },
        signatures: {
          inviter: { signature: body[1][1][0], keyUri: body[1][1][1] },
          invitee: { signature: body[1][2][0], keyUri: body[1][2][1] },
        },
      }
      break
    }
    case 'reject-accept-delegation': {
      decompressedContents = {
        account: body[1][0],
        id: body[1][1],
        parentId: body[1][2],
        permissions: body[1][3],
        isPCR: body[1][4],
      }
      break
    }
    case 'inform-create-delegation': {
      decompressedContents = {
        delegationId: body[1][0],
        isPCR: body[1][1],
      }
      break
    }
    default:
      throw new SDKErrors.ERROR_MESSAGE_BODY_MALFORMED()
  }

  return { type: body[0], content: decompressedContents } as MessageBody
}
