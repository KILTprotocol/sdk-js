/**
 * @packageDocumentation
 * @module MessageUtils
 */

import {
  AttestationUtils,
  AttestedClaimUtils,
  ClaimUtils,
  CTypeUtils,
  Quote,
  QuoteSchema,
  QuoteUtils,
  RequestForAttestationUtils,
} from '@kiltprotocol/core'
import type {
  IAttestedClaim,
  CompressedAttestedClaim,
  CompressedMessageBody,
  MessageBody,
  CompressedRequestClaimsForCTypesContent,
  IRequestClaimsForCTypesContent,
  ICType,
  IMessage,
  PartialClaim,
  IClaim,
  IDelegationData,
} from '@kiltprotocol/types'
import { DataUtils, SDKErrors } from '@kiltprotocol/utils'
import { isHex, isJsonObject } from '@polkadot/util'

import Message from '.'

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
  } else DataUtils.validateAddress(account, 'delegationNode owner')

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
      ClaimUtils.errorCheck(body.content)
      break
    }
    case Message.BodyType.SUBMIT_TERMS: {
      ClaimUtils.errorCheck(body.content.claim)
      body.content.legitimations.map((attestedClaim: IAttestedClaim) =>
        AttestedClaimUtils.errorCheck(attestedClaim)
      )
      if (body.content.delegationId) {
        DataUtils.validateHash(
          body.content.delegationId,
          'Submit terms delegation id hash invalid'
        )
      }
      if (body.content.quote) {
        Quote.validateQuoteSchema(QuoteSchema, body.content.quote)
      }
      if (body.content.prerequisiteClaims) {
        DataUtils.validateHash(
          body.content.prerequisiteClaims,
          'Submit terms pre-requisite claims invalid'
        )
      }
      break
    }
    case Message.BodyType.REJECT_TERMS: {
      ClaimUtils.errorCheck(body.content.claim)
      if (body.content.delegationId) {
        DataUtils.validateHash(
          body.content.delegationId,
          'Reject terms delegation id hash'
        )
      }
      body.content.legitimations.map((val) =>
        AttestedClaimUtils.errorCheck(val)
      )
      break
    }
    case Message.BodyType.REQUEST_ATTESTATION_FOR_CLAIM: {
      RequestForAttestationUtils.errorCheck(body.content.requestForAttestation)
      if (body.content.quote) {
        Quote.validateQuoteSchema(QuoteSchema, body.content.quote)
      }
      if (body.content.prerequisiteClaims) {
        body.content.prerequisiteClaims.map((claim: IClaim | PartialClaim) =>
          ClaimUtils.errorCheck(claim)
        )
      }
      break
    }
    case Message.BodyType.SUBMIT_ATTESTATION_FOR_CLAIM: {
      AttestationUtils.errorCheck(body.content.attestation)
      break
    }
    case Message.BodyType.REJECT_ATTESTATION_FOR_CLAIM: {
      if (!isHex(body.content)) {
        throw SDKErrors.ERROR_HASH_MALFORMED()
      }
      break
    }
    case Message.BodyType.REQUEST_CLAIMS_FOR_CTYPES: {
      body.content.forEach(
        (requestClaimsForCTypes: IRequestClaimsForCTypesContent): void => {
          DataUtils.validateHash(
            requestClaimsForCTypes.cTypeHash,
            'request claims for ctypes cTypeHash invalid'
          )
          requestClaimsForCTypes.acceptedAttester?.map((address) =>
            DataUtils.validateAddress(
              address,
              'request claims for ctypes attester approved addresses invalid'
            )
          )
          requestClaimsForCTypes.requiredProperties?.map((requiredProps) => {
            if (typeof requiredProps !== 'string')
              throw new TypeError(
                'required properties is expected to be a string'
              )
          })
        }
      )
      break
    }
    case Message.BodyType.SUBMIT_CLAIMS_FOR_CTYPES: {
      body.content.map((attestedClaim) =>
        AttestedClaimUtils.errorCheck(attestedClaim)
      )
      break
    }
    case Message.BodyType.ACCEPT_CLAIMS_FOR_CTYPES: {
      body.content.map((cTypeHash) =>
        DataUtils.validateHash(
          cTypeHash,
          'accept claims for ctypes message ctype hash invalid'
        )
      )
      break
    }
    case Message.BodyType.REJECT_CLAIMS_FOR_CTYPES: {
      body.content.map((cTypeHash) =>
        DataUtils.validateHash(
          cTypeHash,
          'rejected claims for ctypes ctype hashes invalid'
        )
      )
      break
    }
    case Message.BodyType.REQUEST_ACCEPT_DELEGATION: {
      errorCheckDelegationData(body.content.delegationData)
      if (!isHex(body.content.signatures.inviter)) {
        throw SDKErrors.ERROR_SIGNATURE_DATA_TYPE()
      }
      if (!isJsonObject(body.content.metaData)) {
        throw SDKErrors.ERROR_OBJECT_MALFORMED()
      }
      break
    }
    case Message.BodyType.SUBMIT_ACCEPT_DELEGATION: {
      errorCheckDelegationData(body.content.delegationData)
      if (
        !isHex(body.content.signatures.invitee) ||
        !isHex(body.content.signatures.inviter)
      ) {
        throw SDKErrors.ERROR_SIGNATURE_DATA_TYPE()
      }
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
    receiverAddress,
    senderAddress,
    receivedAt,
    senderBoxPublicKey,
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
  DataUtils.validateAddress(receiverAddress, 'receiver address')
  DataUtils.validateAddress(senderAddress, 'sender address')
  if (!isHex(senderBoxPublicKey)) {
    throw SDKErrors.ERROR_ADDRESS_INVALID()
  }
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
  CTypeUtils.errorCheck(cType as ICType)

  const validProperties = requiredProperties.find(
    (property) => !(property in cType.schema.properties)
  )
  if (validProperties) {
    throw SDKErrors.ERROR_CTYPE_PROPERTIES_NOT_MATCHING()
  }

  return true
}

/**
 * Compresses a [[Message]] depending on the message body type.
 *
 * @param body The body of the [[Message]] which depends on the [[MessageBodyType]] that needs to be compressed.
 *
 * @returns Returns the compressed message optimised for sending.
 */

export function compressMessage(body: MessageBody): CompressedMessageBody {
  let compressedContents: CompressedMessageBody[1]
  switch (body.type) {
    case Message.BodyType.REQUEST_TERMS: {
      compressedContents = ClaimUtils.compress(body.content)
      break
    }
    case Message.BodyType.SUBMIT_TERMS: {
      compressedContents = [
        ClaimUtils.compress(body.content.claim),
        body.content.legitimations.map(
          (attestedClaim: IAttestedClaim | CompressedAttestedClaim) =>
            Array.isArray(attestedClaim)
              ? attestedClaim
              : AttestedClaimUtils.compress(attestedClaim)
        ),
        body.content.delegationId,
        body.content.quote
          ? QuoteUtils.compressAttesterSignedQuote(body.content.quote)
          : undefined,
        body.content.prerequisiteClaims,
      ]
      break
    }
    case Message.BodyType.REJECT_TERMS: {
      compressedContents = [
        ClaimUtils.compress(body.content.claim),
        body.content.legitimations.map((val) =>
          AttestedClaimUtils.compress(val)
        ),
        body.content.delegationId || undefined,
      ]
      break
    }
    case Message.BodyType.REQUEST_ATTESTATION_FOR_CLAIM: {
      compressedContents = [
        RequestForAttestationUtils.compress(body.content.requestForAttestation),
        body.content.quote
          ? QuoteUtils.compressQuoteAgreement(body.content.quote)
          : undefined,
        body.content.prerequisiteClaims
          ? body.content.prerequisiteClaims.map((claim) =>
              ClaimUtils.compress(claim)
            )
          : undefined,
      ]
      break
    }
    case Message.BodyType.SUBMIT_ATTESTATION_FOR_CLAIM: {
      compressedContents = AttestationUtils.compress(body.content.attestation)
      break
    }
    case Message.BodyType.REQUEST_CLAIMS_FOR_CTYPES: {
      compressedContents = body.content.map(
        (val): CompressedRequestClaimsForCTypesContent => {
          return [val.cTypeHash, val.acceptedAttester, val.requiredProperties]
        }
      )
      break
    }
    case Message.BodyType.SUBMIT_CLAIMS_FOR_CTYPES: {
      compressedContents = body.content.map(
        (attestedClaim: IAttestedClaim | CompressedAttestedClaim) =>
          Array.isArray(attestedClaim)
            ? attestedClaim
            : AttestedClaimUtils.compress(attestedClaim)
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
        body.content.signatures.inviter,
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
        [body.content.signatures.inviter, body.content.signatures.invitee],
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
 * [STATIC] Takes a compressed [[Message]] and decompresses it depending on the message body type.
 *
 * @param body The body of the compressed [[Message]] which depends on the [[MessageBodyType]] that needs to be decompressed.
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
      decompressedContents = ClaimUtils.decompress(body[1])
      break
    }
    case Message.BodyType.SUBMIT_TERMS: {
      decompressedContents = {
        claim: ClaimUtils.decompress(body[1][0]),
        legitimations: body[1][1].map(
          (attestedClaim: IAttestedClaim | CompressedAttestedClaim) =>
            !Array.isArray(attestedClaim)
              ? attestedClaim
              : AttestedClaimUtils.decompress(attestedClaim)
        ),
        delegationId: body[1][2],
        quote: body[1][3]
          ? QuoteUtils.decompressAttesterSignedQuote(body[1][3])
          : undefined,
        prerequisiteClaims: body[1][4],
      }

      break
    }
    case Message.BodyType.REJECT_TERMS: {
      decompressedContents = {
        claim: ClaimUtils.decompress(body[1][0]),
        legitimations: body[1][1].map((val) =>
          AttestedClaimUtils.decompress(val)
        ),
        delegationId: body[1][2] ? body[1][2] : undefined,
      }
      break
    }
    case Message.BodyType.REQUEST_ATTESTATION_FOR_CLAIM: {
      decompressedContents = {
        requestForAttestation: RequestForAttestationUtils.decompress(
          body[1][0]
        ),
        quote: body[1][1]
          ? QuoteUtils.decompressQuoteAgreement(body[1][1])
          : undefined,
        prerequisiteClaims: body[1][2]
          ? body[1][2].map((claim) => ClaimUtils.decompress(claim))
          : undefined,
      }

      break
    }
    case Message.BodyType.SUBMIT_ATTESTATION_FOR_CLAIM: {
      decompressedContents = {
        attestation: AttestationUtils.decompress(body[1]),
      }
      break
    }
    case Message.BodyType.REQUEST_CLAIMS_FOR_CTYPES: {
      decompressedContents = body[1].map(
        (
          val: CompressedRequestClaimsForCTypesContent
        ): IRequestClaimsForCTypesContent => {
          return {
            cTypeHash: val[0],
            acceptedAttester: val[1],
            requiredProperties: val[2],
          }
        }
      )
      break
    }
    case Message.BodyType.SUBMIT_CLAIMS_FOR_CTYPES: {
      decompressedContents = body[1].map(
        (attestedClaim: IAttestedClaim | CompressedAttestedClaim) =>
          !Array.isArray(attestedClaim)
            ? attestedClaim
            : AttestedClaimUtils.decompress(attestedClaim)
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
        signatures: { inviter: body[1][1] },
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
          inviter: body[1][1][0],
          invitee: body[1][1][1],
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
