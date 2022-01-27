/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * SDKErrors are KILT-specific errors, with associated codes and descriptions.
 *
 * @packageDocumentation
 * @module SDKErrors
 */

import type { NonceHash } from '@kiltprotocol/types'

export enum ErrorCode {
  ERROR_UNAUTHORIZED = 1016,
  ERROR_NOT_FOUND = 1017,

  // Data is missing
  ERROR_CTYPE_HASH_NOT_PROVIDED = 10001,
  ERROR_CLAIM_HASH_NOT_PROVIDED = 10002,
  ERROR_CLAIM_NONCE_MAP_NOT_PROVIDED = 10003,
  ERROR_CLAIM_NOT_PROVIDED = 10004,
  ERROR_OWNER_NOT_PROVIDED = 10005,
  ERROR_RFA_NOT_PROVIDED = 10006,
  ERROR_ATTESTATION_NOT_PROVIDED = 10007,
  ERROR_REVOCATION_BIT_MISSING = 10008,
  ERROR_LEGITIMATIONS_NOT_PROVIDED = 10009,
  ERROR_ATTESTATION_SESSION_MISSING = 10010,
  ERROR_PE_MISSING = 10011,
  ERROR_PE_CREDENTIAL_MISSING = 10012,
  ERROR_CTYPE_ID_NOT_MATCHING = 10013,
  ERROR_PE_VERIFICATION = 10014,
  ERROR_NO_PROOF_FOR_STATEMENT = 10015,
  ERROR_IDENTITY_NOT_PE_ENABLED = 10016,
  ERROR_WS_ADDRESS_NOT_SET = 10017,
  ERROR_DELEGATION_ID_MISSING = 10018,
  ERROR_HIERARCHY_DETAILS_MISSING = 10019,
  ERROR_DELEGATION_SIGNATURE_MISSING = 10020,
  ERROR_DELEGATION_PARENT_MISSING = 10021,
  ERROR_INVALID_ROOT_NODE = 10022,
  ERROR_INVALID_DELEGATION_NODE = 10023,

  // Data type is wrong or malformed
  ERROR_ADDRESS_TYPE = 20001,
  ERROR_HASH_TYPE = 20002,
  ERROR_HASH_MALFORMED = 20003,
  ERROR_SIGNATURE_DATA_TYPE = 20005,
  ERROR_CTYPE_OWNER_TYPE = 20006,
  ERROR_DELEGATION_ID_TYPE = 20007,
  ERROR_CLAIM_CONTENTS_MALFORMED = 20009,
  ERROR_CLAIM_NONCE_MAP_MALFORMED = 20010,
  ERROR_OBJECT_MALFORMED = 20011,
  ERROR_MNEMONIC_PHRASE_MALFORMED = 20012,
  ERROR_QUOTE_MALFORMED = 20013,
  ERROR_CLAIM_HASHTREE_MISMATCH = 20014,
  ERROR_PE_MISMATCH = 20015,
  ERROR_DID_IDENTIFIER_MISMATCH = 20016,
  ERROR_HIERARCHY_QUERY = 20017,
  ERROR_INVALID_DID_FORMAT = 20018,
  ERROR_MESSAGE_BODY_MALFORMED = 20019,
  ERROR_NODE_QUERY = 20020,
  ERROR_UNSUPPORTED_DID = 20021,

  // Data is invalid
  ERROR_ADDRESS_INVALID = 30001,
  ERROR_NONCE_HASH_INVALID = 30002,
  ERROR_LEGITIMATIONS_UNVERIFIABLE = 30003,
  ERROR_SIGNATURE_UNVERIFIABLE = 30004,
  ERROR_CREDENTIAL_UNVERIFIABLE = 30005,
  ERROR_CLAIM_UNVERIFIABLE = 30006,
  ERROR_CTYPE_HASH_INVALID = 30007,
  ERROR_MNEMONIC_PHRASE_INVALID = 30008,
  ERROR_IDENTITY_MISMATCH = 30009,
  ERROR_ROOT_HASH_UNVERIFIABLE = 30010,
  ERROR_NESTED_CLAIM_UNVERIFIABLE = 30011,
  ERROR_INVALID_PROOF_FOR_STATEMENT = 30012,
  ERROR_CTYPE_PROPERTIES_NOT_MATCHING = 30013,
  ERROR_UNSUPPORTED_KEY = 30014,
  ERROR_DID_ERROR = 30014,
  ERROR_KEYSTORE_ERROR = 30015,
  ERROR_DID_EXPORTER_ERROR = 30016,

  // Compression / Decompressions
  ERROR_DECOMPRESSION_ARRAY = 40001,
  ERROR_COMPRESS_OBJECT = 40002,
  ERROR_DECODING_MESSAGE = 40003,
  ERROR_PARSING_MESSAGE = 40004,
  ERROR_MESSAGE_TYPE = 40005,

  ERROR_UNKNOWN = -1,
  ERROR_TIMEOUT = -2,
}

export class SDKError extends Error {
  public errorCode: ErrorCode

  public constructor(errorCode: ErrorCode, message: string) {
    super(message)
    this.errorCode = errorCode
  }
}

export function isSDKError(input: unknown): input is SDKError {
  return (
    ((i: unknown): i is Error & Partial<SDKError> => i instanceof Error)(
      input
    ) &&
    input.errorCode !== undefined &&
    input.errorCode in ErrorCode
  )
}

export const ERROR_UNAUTHORIZED: (msg: string) => SDKError = (msg: string) => {
  return new SDKError(ErrorCode.ERROR_UNAUTHORIZED, msg)
}
export const ERROR_NOT_FOUND: (msg: string) => SDKError = (msg: string) => {
  return new SDKError(ErrorCode.ERROR_NOT_FOUND, msg)
}

export const ERROR_CTYPE_HASH_NOT_PROVIDED: () => SDKError = () => {
  return new SDKError(
    ErrorCode.ERROR_CTYPE_HASH_NOT_PROVIDED,
    'CType hash missing'
  )
}

export const ERROR_CTYPE_ID_NOT_MATCHING: (
  fromSchema: string,
  provided: string
) => SDKError = (fromSchema: string, provided: string) => {
  return new SDKError(
    ErrorCode.ERROR_CTYPE_ID_NOT_MATCHING,
    `Provided $id "${provided}" and schema $id "${fromSchema}" are not matching`
  )
}

export const ERROR_CTYPE_PROPERTIES_NOT_MATCHING: () => SDKError = () => {
  return new SDKError(
    ErrorCode.ERROR_CTYPE_PROPERTIES_NOT_MATCHING,
    'Required properties do not match CType properties'
  )
}

export const ERROR_UNSUPPORTED_KEY: (keyType: string) => SDKError = (
  keyType: string
) => {
  return new SDKError(
    ErrorCode.ERROR_UNSUPPORTED_KEY,
    `The provided key type "${keyType}" is currently not supported.`
  )
}
export const ERROR_DID_ERROR: (input: string) => SDKError = (input: string) => {
  return new SDKError(ErrorCode.ERROR_DID_ERROR, input)
}
export const ERROR_KEYSTORE_ERROR: (input: string) => SDKError = (
  input: string
) => {
  return new SDKError(ErrorCode.ERROR_KEYSTORE_ERROR, input)
}
export const ERROR_DID_EXPORTER_ERROR: (input: string) => SDKError = (
  input: string
) => {
  return new SDKError(ErrorCode.ERROR_DID_EXPORTER_ERROR, input)
}

export const ERROR_CLAIM_HASH_NOT_PROVIDED: () => SDKError = () => {
  return new SDKError(
    ErrorCode.ERROR_CLAIM_HASH_NOT_PROVIDED,
    'Claim hash missing'
  )
}

export const ERROR_REVOCATION_BIT_MISSING: () => SDKError = () => {
  return new SDKError(
    ErrorCode.ERROR_REVOCATION_BIT_MISSING,
    'Revoked identifier missing'
  )
}
export const ERROR_OWNER_NOT_PROVIDED: () => SDKError = () => {
  return new SDKError(ErrorCode.ERROR_OWNER_NOT_PROVIDED, 'Owner missing')
}
export const ERROR_ATTESTATION_NOT_PROVIDED: () => SDKError = () => {
  return new SDKError(
    ErrorCode.ERROR_ATTESTATION_NOT_PROVIDED,
    'Attestation missing'
  )
}

export const ERROR_RFA_NOT_PROVIDED: () => SDKError = () => {
  return new SDKError(
    ErrorCode.ERROR_RFA_NOT_PROVIDED,
    'RequestForAttestation missing'
  )
}
export const ERROR_LEGITIMATIONS_NOT_PROVIDED: () => SDKError = () => {
  return new SDKError(
    ErrorCode.ERROR_LEGITIMATIONS_NOT_PROVIDED,
    'Legitimations missing'
  )
}
export const ERROR_ATTESTATION_SESSION_MISSING: () => SDKError = () => {
  return new SDKError(
    ErrorCode.ERROR_ATTESTATION_SESSION_MISSING,
    'Privacy enhancement was forced, but attestation session is missing.'
  )
}
export const ERROR_PE_MISSING: () => SDKError = () => {
  return new SDKError(
    ErrorCode.ERROR_PE_MISSING,
    'Privacy enhancement is missing.'
  )
}
export const ERROR_PE_CREDENTIAL_MISSING: () => SDKError = () => {
  return new SDKError(
    ErrorCode.ERROR_PE_CREDENTIAL_MISSING,
    'Missing privacy enhanced credential.'
  )
}
export const ERROR_CLAIM_NONCE_MAP_NOT_PROVIDED: () => SDKError = () => {
  return new SDKError(
    ErrorCode.ERROR_CLAIM_NONCE_MAP_NOT_PROVIDED,
    'Hashtree in Claim missing'
  )
}
export const ERROR_CLAIM_NOT_PROVIDED: () => SDKError = () => {
  return new SDKError(
    ErrorCode.ERROR_CLAIM_NOT_PROVIDED,
    'Hashtree in Claim missing'
  )
}
export const ERROR_ADDRESS_TYPE: () => SDKError = () => {
  return new SDKError(ErrorCode.ERROR_ADDRESS_TYPE, 'Address of wrong type')
}
export const ERROR_HASH_TYPE: () => SDKError = () => {
  return new SDKError(ErrorCode.ERROR_HASH_TYPE, 'Hash of wrong type')
}

export const ERROR_HASH_MALFORMED: (hash?: string, type?: string) => SDKError =
  (hash?: string, type?: string) => {
    if (hash && type) {
      return new SDKError(
        ErrorCode.ERROR_HASH_MALFORMED,
        `Provided ${type} hash invalid or malformed \nHash: ${hash}`
      )
    }
    if (hash) {
      return new SDKError(
        ErrorCode.ERROR_HASH_MALFORMED,
        `Provided hash invalid or malformed \nHash: ${hash}`
      )
    }

    return new SDKError(
      ErrorCode.ERROR_HASH_MALFORMED,
      `Provided hash invalid or malformed`
    )
  }

export const ERROR_DELEGATION_ID_TYPE: () => SDKError = () => {
  return new SDKError(
    ErrorCode.ERROR_DELEGATION_ID_TYPE,
    'DelegationId of wrong type'
  )
}

export const ERROR_DELEGATION_ID_MISSING: () => SDKError = () => {
  return new SDKError(
    ErrorCode.ERROR_DELEGATION_ID_MISSING,
    'DelegationId is missing'
  )
}

export const ERROR_HIERARCHY_DETAILS_MISSING: () => SDKError = () => {
  return new SDKError(
    ErrorCode.ERROR_HIERARCHY_DETAILS_MISSING,
    'Delegation hierarchy details missing'
  )
}

export const ERROR_DELEGATION_SIGNATURE_MISSING: () => SDKError = () => {
  return new SDKError(
    ErrorCode.ERROR_DELEGATION_SIGNATURE_MISSING,
    "Delegatee's signature missing"
  )
}

export const ERROR_DELEGATION_PARENT_MISSING: () => SDKError = () => {
  return new SDKError(
    ErrorCode.ERROR_DELEGATION_PARENT_MISSING,
    'Delegation parentId missing'
  )
}

export const ERROR_INVALID_ROOT_NODE: () => SDKError = () => {
  return new SDKError(
    ErrorCode.ERROR_INVALID_ROOT_NODE,
    'The given node is not a valid root node'
  )
}

export const ERROR_INVALID_DELEGATION_NODE: () => SDKError = () => {
  return new SDKError(
    ErrorCode.ERROR_INVALID_DELEGATION_NODE,
    'The given node is not a valid delegation node'
  )
}

export const ERROR_CLAIM_CONTENTS_MALFORMED: () => SDKError = () => {
  return new SDKError(
    ErrorCode.ERROR_CLAIM_CONTENTS_MALFORMED,
    'Claim contents malformed'
  )
}
export const ERROR_OBJECT_MALFORMED: () => SDKError = () => {
  return new SDKError(
    ErrorCode.ERROR_OBJECT_MALFORMED,
    'Object form is not verifiable'
  )
}
export const ERROR_CTYPE_OWNER_TYPE: () => SDKError = () => {
  return new SDKError(
    ErrorCode.ERROR_CTYPE_OWNER_TYPE,
    'CType owner of wrong type'
  )
}
export const ERROR_MNEMONIC_PHRASE_MALFORMED: () => SDKError = () => {
  return new SDKError(
    ErrorCode.ERROR_MNEMONIC_PHRASE_MALFORMED,
    'Mnemonic phrase malformed or too short'
  )
}
export const ERROR_QUOTE_MALFORMED: () => SDKError = () => {
  return new SDKError(
    ErrorCode.ERROR_QUOTE_MALFORMED,
    'Quote form is not verifiable'
  )
}

export const ERROR_CLAIM_NONCE_MAP_MALFORMED: (statement?: string) => SDKError =
  (statement) => {
    let message = ''
    if (statement) {
      message = `Nonce map malformed or incomplete: no nonce for statement "${statement}"`
    } else {
      message = `Nonce map malformed or incomplete`
    }
    return new SDKError(ErrorCode.ERROR_CLAIM_NONCE_MAP_MALFORMED, message)
  }

export const ERROR_MESSAGE_BODY_MALFORMED: () => SDKError = () => {
  return new SDKError(
    ErrorCode.ERROR_MESSAGE_BODY_MALFORMED,
    'Message body is malformed or wrong type'
  )
}

export const ERROR_CLAIM_HASHTREE_MISMATCH: (key?: string) => SDKError = (
  key?: string
) => {
  if (key) {
    return new SDKError(
      ErrorCode.ERROR_CLAIM_HASHTREE_MISMATCH,
      `Property '${key}' not found in claim`
    )
  }

  return new SDKError(
    ErrorCode.ERROR_CLAIM_HASHTREE_MISMATCH,
    `Property not found in claim`
  )
}

export const ERROR_SIGNATURE_DATA_TYPE: () => SDKError = () => {
  return new SDKError(
    ErrorCode.ERROR_SIGNATURE_DATA_TYPE,
    'Signature malformed'
  )
}
export const ERROR_DID_IDENTIFIER_MISMATCH: (
  identifier: string,
  id: string
) => SDKError = (identifier: string, id: string) => {
  return new SDKError(
    ErrorCode.ERROR_DID_IDENTIFIER_MISMATCH,
    `This identifier (${identifier}) doesn't match the DID Document's identifier (${id})`
  )
}
export const ERROR_PE_MISMATCH: () => SDKError = () => {
  return new SDKError(
    ErrorCode.ERROR_PE_MISMATCH,
    'Verifier requested public presentation, but privacy enhancement was forced.'
  )
}
export const ERROR_HIERARCHY_QUERY: (rootId: string) => SDKError = (
  rootId: string
) => {
  return new SDKError(
    ErrorCode.ERROR_HIERARCHY_QUERY,
    `Could not find root node with id ${rootId}`
  )
}
export const ERROR_NODE_QUERY: (nodeId: string) => SDKError = (
  nodeId: string
) => {
  return new SDKError(
    ErrorCode.ERROR_NODE_QUERY,
    `Could not find node with id ${nodeId}`
  )
}
export const ERROR_INVALID_DID_FORMAT: (identifier: string) => SDKError = (
  identifier: string
) => {
  return new SDKError(
    ErrorCode.ERROR_INVALID_DID_FORMAT,
    `Not a valid KILT did: ${identifier}`
  )
}
export const ERROR_UNSUPPORTED_DID: (input: string) => SDKError = (
  input: string
) => {
  return new SDKError(
    ErrorCode.ERROR_UNSUPPORTED_DID,
    `The DID ${input} is not supported.`
  )
}

export const ERROR_ADDRESS_INVALID: (
  address?: string,
  type?: string
) => SDKError = (address?: string, type?: string) => {
  if (address && type) {
    return new SDKError(
      ErrorCode.ERROR_ADDRESS_INVALID,
      `Provided ${type} address invalid \n\n    Address: ${address}`
    )
  }
  if (address) {
    return new SDKError(
      ErrorCode.ERROR_ADDRESS_INVALID,
      `Provided address invalid \n\n    Address: ${address}`
    )
  }

  return new SDKError(
    ErrorCode.ERROR_ADDRESS_INVALID,
    `Provided address invalid`
  )
}

export const ERROR_NONCE_HASH_INVALID: (
  nonceHash?: NonceHash,
  type?: string
) => SDKError = (nonceHash?: NonceHash, type?: string) => {
  if (nonceHash && type) {
    return new SDKError(
      ErrorCode.ERROR_NONCE_HASH_INVALID,
      `Provided ${type} NonceHash invalid \n    Hash: ${nonceHash.hash} \n    Nonce: ${nonceHash.nonce}`
    )
  }
  if (nonceHash) {
    return new SDKError(
      ErrorCode.ERROR_NONCE_HASH_INVALID,
      `Provided NonceHash invalid \nHash: ${nonceHash}`
    )
  }

  return new SDKError(
    ErrorCode.ERROR_NONCE_HASH_INVALID,
    'NonceHash could not be validated'
  )
}
export const ERROR_LEGITIMATIONS_UNVERIFIABLE: () => SDKError = () => {
  return new SDKError(
    ErrorCode.ERROR_LEGITIMATIONS_UNVERIFIABLE,
    'Legitimations could not be verified'
  )
}
export const ERROR_SIGNATURE_UNVERIFIABLE: () => SDKError = () => {
  return new SDKError(
    ErrorCode.ERROR_SIGNATURE_UNVERIFIABLE,
    'Signature could not be verified'
  )
}
export const ERROR_CREDENTIAL_UNVERIFIABLE: () => SDKError = () => {
  return new SDKError(
    ErrorCode.ERROR_CREDENTIAL_UNVERIFIABLE,
    'Credential could not be verified'
  )
}

export const ERROR_CLAIM_UNVERIFIABLE: () => SDKError = () => {
  return new SDKError(
    ErrorCode.ERROR_CLAIM_UNVERIFIABLE,
    'Claim could not be verified'
  )
}

export const ERROR_NESTED_CLAIM_UNVERIFIABLE: () => SDKError = () => {
  return new SDKError(
    ErrorCode.ERROR_NESTED_CLAIM_UNVERIFIABLE,
    'Nested claim data does not validate against CType'
  )
}

export const ERROR_CTYPE_HASH_INVALID: () => SDKError = () => {
  return new SDKError(
    ErrorCode.ERROR_CTYPE_HASH_INVALID,
    'CType Hash could not be validated'
  )
}

export const ERROR_MNEMONIC_PHRASE_INVALID: () => SDKError = () => {
  return new SDKError(
    ErrorCode.ERROR_MNEMONIC_PHRASE_INVALID,
    'Mnemonic phrase invalid'
  )
}
export const ERROR_IDENTITY_MISMATCH: (
  context?: string,
  type?: string
) => SDKError = (context?: string, type?: string) => {
  if (type && context) {
    return new SDKError(
      ErrorCode.ERROR_IDENTITY_MISMATCH,
      `${type} is not owner of the ${context}`
    )
  }
  if (context) {
    return new SDKError(
      ErrorCode.ERROR_IDENTITY_MISMATCH,
      `Identity is not owner of the ${context}`
    )
  }
  return new SDKError(
    ErrorCode.ERROR_IDENTITY_MISMATCH,
    'Addresses expected to be equal mismatched'
  )
}

export const ERROR_IDENTITY_NOT_PE_ENABLED: () => SDKError = () => {
  return new SDKError(
    ErrorCode.ERROR_IDENTITY_NOT_PE_ENABLED,
    'Identity is not privacy enhaced'
  )
}
export const ERROR_WS_ADDRESS_NOT_SET: () => SDKError = () => {
  return new SDKError(
    ErrorCode.ERROR_WS_ADDRESS_NOT_SET,
    'Node address to connect to not configured!'
  )
}

export const ERROR_ROOT_HASH_UNVERIFIABLE: () => SDKError = () => {
  return new SDKError(
    ErrorCode.ERROR_ROOT_HASH_UNVERIFIABLE,
    'RootHash could not be verified'
  )
}

export const ERROR_DECOMPRESSION_ARRAY: (type?: string) => SDKError = (
  type?: string
) => {
  if (type) {
    return new SDKError(
      ErrorCode.ERROR_DECOMPRESSION_ARRAY,
      `Provided compressed ${type} not an Array or not of defined length`
    )
  }
  return new SDKError(
    ErrorCode.ERROR_DECOMPRESSION_ARRAY,
    'Provided compressed object not an Array or not of defined length'
  )
}

export const ERROR_COMPRESS_OBJECT: (
  object?: Record<string, any>,
  type?: string
) => SDKError = (object?: Record<string, unknown>, type?: string) => {
  if (object && type) {
    return new SDKError(
      ErrorCode.ERROR_COMPRESS_OBJECT,
      `Property Not Provided while compressing ${type}:\n${JSON.stringify(
        object,
        null,
        2
      )}`
    )
  }
  if (object) {
    return new SDKError(
      ErrorCode.ERROR_COMPRESS_OBJECT,
      `Property Not Provided while compressing object:\n${JSON.stringify(
        object,
        null,
        2
      )}`
    )
  }

  return new SDKError(
    ErrorCode.ERROR_COMPRESS_OBJECT,
    `Property Not Provided while compressing object`
  )
}

export const ERROR_DECODING_MESSAGE: () => SDKError = () => {
  return new SDKError(
    ErrorCode.ERROR_DECODING_MESSAGE,
    'Error decoding message'
  )
}
export const ERROR_PARSING_MESSAGE: () => SDKError = () => {
  return new SDKError(
    ErrorCode.ERROR_PARSING_MESSAGE,
    'Error parsing message body'
  )
}

export const ERROR_MESSAGE_TYPE: (
  type: string,
  expectedType: string,
  alternativeType?: string
) => SDKError = (
  type: string,
  expectedType: string,
  alternativeType?: string
) => {
  if (alternativeType) {
    return new SDKError(
      ErrorCode.ERROR_MESSAGE_TYPE,
      `Unexpected message type. Received ${type}, expected ${expectedType} or ${alternativeType}`
    )
  }
  return new SDKError(
    ErrorCode.ERROR_MESSAGE_TYPE,
    `Unexpected message type. Received ${type}, expected ${expectedType}`
  )
}

export const ERROR_UNKNOWN: () => SDKError = () => {
  return new SDKError(ErrorCode.ERROR_UNKNOWN, 'an unknown error ocurred')
}

export const ERROR_TIMEOUT: () => SDKError = () => {
  return new SDKError(ErrorCode.ERROR_TIMEOUT, 'operation timed out')
}

export const ERROR_PE_VERIFICATION: (
  accFailure: boolean,
  keyFailure: boolean
) => SDKError = (accFailure: boolean, keyFailure: boolean) => {
  return new SDKError(
    ErrorCode.ERROR_PE_VERIFICATION,
    `Received privacy enhanced presentation with insufficient data. 
    \n\tMissing accumulators? ${accFailure}
    \n\tMissing attester public keys? ${keyFailure}
    `
  )
}

export const ERROR_INVALID_PROOF_FOR_STATEMENT: (
  statement: string
) => SDKError = (statement) => {
  return new SDKError(
    ErrorCode.ERROR_INVALID_PROOF_FOR_STATEMENT,
    `Proof could not be verified for statement\n${statement}`
  )
}

export const ERROR_NO_PROOF_FOR_STATEMENT: (statement: string) => SDKError = (
  statement
) => {
  return new SDKError(
    ErrorCode.ERROR_NO_PROOF_FOR_STATEMENT,
    `No matching proof found for statement\n${statement}`
  )
}
