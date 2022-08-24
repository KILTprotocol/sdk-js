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
} from '@kiltprotocol/core'
import type {
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
  DidUtils.validateKiltDidUri(account)

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
          trustedAttesters?.map((did) => DidUtils.validateKiltDidUri(did))
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
        throw new SDKErrors.ObjectUnverifiableError()
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
  DidUtils.validateKiltDidUri(receiver)
  DidUtils.validateKiltDidUri(sender)
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
