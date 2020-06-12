/**
 * ObjectsErrors are KILT-specific errors, with associated codes and descriptions.
 *
 * @packageDocumentation
 * @module ObjectsErrors
 * @preferred
 */

import { NonceHash } from '../types/RequestForAttestation'

export enum ErrorCode {
  ERROR_CTYPE_HASH_NOT_PROVIDED = 10001,
  ERROR_CLAIM_HASH_NOT_PROVIDED = 10002,
  ERROR_CLAIM_HASHTREE_NOT_PROVIDED = 10003,
  ERROR_CLAIM_NOT_PROVIDED = 10004,
  ERROR_OWNER_NOT_PROVIDED = 10005,
  ERROR_RFA_NOT_PROVIDED = 10006,
  ERROR_ATTESTATION_NOT_PROVIDED = 10007,
  ERROR_REVOCATION_BIT_MISSING = 10008,
  ERROR_LEGITIMATIONS_NOT_PROVIDED = 10009,
  ERROR_ATTESTATION_SESSION_MISSING = 10010,
  ERROR_PE_MISSING = 10013,
  ERROR_PE_CREDENTIAL_MISSING = 10012,

  ERROR_ADDRESS_TYPE = 20001,
  ERROR_HASH_TYPE = 20002,
  ERROR_HASH_MALFORMED = 20003,
  ERROR_NONCE_HASH_TYPE = 20004,
  ERROR_SIGNATURE_DATA_TYPE = 20005,
  ERROR_CTYPE_OWNER_TYPE = 20006,
  ERROR_DELEGATION_ID_TYPE = 20007,
  ERROR_NONCE_HASH_MALFORMED = 20008,
  ERROR_CLAIM_CONTENTS_MALFORMED = 20009,
  ERROR_CLAIM_HASHTREE_MALFORMED = 20010,
  ERROR_OBJECT_MALFORMED = 20011,
  ERROR_MNEMONIC_PHRASE_MALFORMED = 20012,
  ERROR_QUOTE_MALFORMED = 20013,
  ERROR_CLAIM_HASHTREE_MISMATCH = 20014,
  ERROR_PE_MISMATCH = 20015,
  ERROR_DID_IDENTIFIER_MISMATCH = 20016,

  ERROR_ADDRESS_INVALID = 30001,
  ERROR_NONCE_HASH_INVALID = 30002,
  ERROR_LEGITIMATIONS_UNVERIFIABLE = 30003,
  ERROR_SIGNATURE_UNVERIFIABLE = 30004,
  ERROR_ATTESTEDCLAIM_UNVERIFIABLE = 30005,
  ERROR_CLAIM_UNVERIFIABLE = 30006,
  ERROR_CTYPE_HASH_INVALID = 30007,
  ERROR_MNEMONIC_PHRASE_INVALID = 30008,
  ERROR_IDENTITY_MISMATCH = 30009,
  ERROR_ROOTHASH_UNVERIFIABLE = 30010,

  ERROR_DECOMPRESSION_ARRAY = 40001,
  ERROR_COMPRESS_OBJECT = 40002,
  ERROR_DECODING_MESSAGE = 40003,
  ERROR_PARSING_MESSAGE = 40004,
  ERROR_MESSAGE_TYPE = 40005,

  ERROR_UNKNOWN = -1,
}

export class ObjectsError extends Error {
  public errorCode: ErrorCode

  public constructor(errorCode: ErrorCode, message: string) {
    super(message)
    this.errorCode = errorCode
  }
}

export const ERROR_CTYPE_HASH_NOT_PROVIDED: ObjectsError = new ObjectsError(
  ErrorCode.ERROR_CTYPE_HASH_NOT_PROVIDED,
  'CType hash missing'
)
export const ERROR_CLAIM_HASH_NOT_PROVIDED: ObjectsError = new ObjectsError(
  ErrorCode.ERROR_CLAIM_HASH_NOT_PROVIDED,
  'Claim hash missing'
)
export const ERROR_REVOCATION_BIT_MISSING: ObjectsError = new ObjectsError(
  ErrorCode.ERROR_REVOCATION_BIT_MISSING,
  'Revoked identifier missing'
)
export const ERROR_OWNER_NOT_PROVIDED: ObjectsError = new ObjectsError(
  ErrorCode.ERROR_OWNER_NOT_PROVIDED,
  'Owner missing'
)
export const ERROR_ATTESTATION_NOT_PROVIDED: ObjectsError = new ObjectsError(
  ErrorCode.ERROR_ATTESTATION_NOT_PROVIDED,
  'Attestation missing'
)
export const ERROR_RFA_NOT_PROVIDED: ObjectsError = new ObjectsError(
  ErrorCode.ERROR_RFA_NOT_PROVIDED,
  'RequestForAttestation missing'
)
export const ERROR_LEGITIMATIONS_NOT_PROVIDED: ObjectsError = new ObjectsError(
  ErrorCode.ERROR_LEGITIMATIONS_NOT_PROVIDED,
  'Legitimations missing'
)
export const ERROR_ATTESTATION_SESSION_MISSING: ObjectsError = new ObjectsError(
  ErrorCode.ERROR_ATTESTATION_SESSION_MISSING,
  'Privacy enhancement was forced, but attestation session is missing.'
)
export const ERROR_PE_MISSING: ObjectsError = new ObjectsError(
  ErrorCode.ERROR_PE_MISSING,
  'Privacy enhancement is missing.'
)

export const ERROR_PE_CREDENTIAL_MISSING: ObjectsError = new ObjectsError(
  ErrorCode.ERROR_PE_CREDENTIAL_MISSING,
  'Missing privacy enhanced credential.'
)
export const ERROR_CLAIM_HASHTREE_NOT_PROVIDED: ObjectsError = new ObjectsError(
  ErrorCode.ERROR_CLAIM_HASHTREE_NOT_PROVIDED,
  'Hashtree in Claim missing'
)
export const ERROR_CLAIM_NOT_PROVIDED: ObjectsError = new ObjectsError(
  ErrorCode.ERROR_CLAIM_NOT_PROVIDED,
  'Hashtree in Claim missing'
)
export const ERROR_ADDRESS_TYPE: ObjectsError = new ObjectsError(
  ErrorCode.ERROR_ADDRESS_TYPE,
  'Address of wrong type'
)
export const ERROR_HASH_TYPE: ObjectsError = new ObjectsError(
  ErrorCode.ERROR_HASH_TYPE,
  'Hash of wrong type'
)

export const ERROR_HASH_MALFORMED: (
  hash?: string,
  type?: string
) => ObjectsError = (hash?: string, type?: string) => {
  if (hash && type) {
    return new ObjectsError(
      ErrorCode.ERROR_HASH_MALFORMED,
      `Provided ${type} hash invalid or malformed \nHash: ${hash}`
    )
  }
  if (hash) {
    return new ObjectsError(
      ErrorCode.ERROR_HASH_MALFORMED,
      `Provided hash invalid or malformed \nHash: ${hash}`
    )
  }

  return new ObjectsError(
    ErrorCode.ERROR_HASH_MALFORMED,
    `Provided hash invalid or malformed`
  )
}
export const ERROR_NONCE_HASH_TYPE: ObjectsError = new ObjectsError(
  ErrorCode.ERROR_NONCE_HASH_TYPE,
  'NonceHash of wrong type'
)

export const ERROR_NONCE_HASH_MALFORMED: (
  nonceHash?: NonceHash,
  type?: string
) => ObjectsError = (nonceHash?: NonceHash, type?: string) => {
  if (nonceHash && type) {
    return new ObjectsError(
      ErrorCode.ERROR_NONCE_HASH_MALFORMED,
      `Provided ${type} NonceHash malformed \n
      Hash: ${nonceHash.hash} \n
      Nonce: ${nonceHash.nonce}`
    )
  }
  if (nonceHash) {
    return new ObjectsError(
      ErrorCode.ERROR_NONCE_HASH_MALFORMED,
      `Provided NonceHash malformed \nHash: ${JSON.stringify(
        nonceHash,
        null,
        2
      )}`
    )
  }

  return new ObjectsError(
    ErrorCode.ERROR_NONCE_HASH_MALFORMED,
    `Provided hash malformed`
  )
}
export const ERROR_DELEGATION_ID_TYPE: ObjectsError = new ObjectsError(
  ErrorCode.ERROR_DELEGATION_ID_TYPE,
  'DelegationId of wrong type'
)
export const ERROR_CLAIM_CONTENTS_MALFORMED: ObjectsError = new ObjectsError(
  ErrorCode.ERROR_CLAIM_CONTENTS_MALFORMED,
  'Claim contents malformed'
)
export const ERROR_OBJECT_MALFORMED: ObjectsError = new ObjectsError(
  ErrorCode.ERROR_OBJECT_MALFORMED,
  'Object form is not verifiable'
)
export const ERROR_CTYPE_OWNER_TYPE: ObjectsError = new ObjectsError(
  ErrorCode.ERROR_CTYPE_OWNER_TYPE,
  'CType owner of wrong type'
)
export const ERROR_MNEMONIC_PHRASE_MALFORMED: ObjectsError = new ObjectsError(
  ErrorCode.ERROR_MNEMONIC_PHRASE_MALFORMED,
  'Mnemonic phrase malformed or too short'
)
export const ERROR_QUOTE_MALFORMED: ObjectsError = new ObjectsError(
  ErrorCode.ERROR_QUOTE_MALFORMED,
  'Quote form is not verifiable'
)
export const ERROR_CLAIM_HASHTREE_MALFORMED: ObjectsError = new ObjectsError(
  ErrorCode.ERROR_CLAIM_HASHTREE_MALFORMED,
  'Claim HashTree malformed'
)

export const ERROR_CLAIM_HASHTREE_MISMATCH: (key?: string) => ObjectsError = (
  key?: string
) => {
  if (key) {
    return new ObjectsError(
      ErrorCode.ERROR_CLAIM_HASHTREE_MISMATCH,
      `Property '${key}' not found in claim`
    )
  }

  return new ObjectsError(
    ErrorCode.ERROR_CLAIM_HASHTREE_MISMATCH,
    `Property not found in claim`
  )
}

export const ERROR_SIGNATURE_DATA_TYPE: ObjectsError = new ObjectsError(
  ErrorCode.ERROR_SIGNATURE_DATA_TYPE,
  'Property non existent'
)
export const ERROR_DID_IDENTIFIER_MISMATCH: (
  identifier: string,
  id: string
) => ObjectsError = (identifier: string, id: string) => {
  return new ObjectsError(
    ErrorCode.ERROR_DID_IDENTIFIER_MISMATCH,
    `This identifier (${identifier}) doesn't match the DID Document's identifier (${id})`
  )
}
export const ERROR_PE_MISMATCH: ObjectsError = new ObjectsError(
  ErrorCode.ERROR_PE_MISMATCH,
  'Verifier requested public presentation, but privacy enhancement was forced.'
)

export const ERROR_ADDRESS_INVALID: (
  address?: string,
  type?: string
) => ObjectsError = (address?: string, type?: string) => {
  if (address && type) {
    return new ObjectsError(
      ErrorCode.ERROR_ADDRESS_INVALID,
      `Provided ${type} address invalid \n\n    Address: ${address}`
    )
  }
  if (address) {
    return new ObjectsError(
      ErrorCode.ERROR_ADDRESS_INVALID,
      `Provided address invalid \n\n    Address: ${address}`
    )
  }

  return new ObjectsError(
    ErrorCode.ERROR_ADDRESS_INVALID,
    `Provided address invalid`
  )
}

export const ERROR_NONCE_HASH_INVALID: (
  nonceHash?: NonceHash,
  type?: string
) => ObjectsError = (nonceHash?: NonceHash, type?: string) => {
  if (nonceHash && type) {
    return new ObjectsError(
      ErrorCode.ERROR_NONCE_HASH_INVALID,
      `Provided ${type} NonceHash invalid \n    Hash: ${nonceHash.hash} \n    Nonce: ${nonceHash.nonce}`
    )
  }
  if (nonceHash) {
    return new ObjectsError(
      ErrorCode.ERROR_NONCE_HASH_INVALID,
      `Provided NonceHash invalid \nHash: ${nonceHash}`
    )
  }

  return new ObjectsError(
    ErrorCode.ERROR_NONCE_HASH_INVALID,
    'NonceHash could not be validated'
  )
}
export const ERROR_LEGITIMATIONS_UNVERIFIABLE: ObjectsError = new ObjectsError(
  ErrorCode.ERROR_LEGITIMATIONS_UNVERIFIABLE,
  'Legitimations could not be verified'
)
export const ERROR_SIGNATURE_UNVERIFIABLE: ObjectsError = new ObjectsError(
  ErrorCode.ERROR_SIGNATURE_UNVERIFIABLE,
  'Signature could not be verified'
)
export const ERROR_ATTESTEDCLAIM_UNVERIFIABLE: ObjectsError = new ObjectsError(
  ErrorCode.ERROR_ATTESTEDCLAIM_UNVERIFIABLE,
  'AttestedClaim could not be verified'
)

export const ERROR_CLAIM_UNVERIFIABLE: ObjectsError = new ObjectsError(
  ErrorCode.ERROR_CLAIM_UNVERIFIABLE,
  'Claim could not be verified'
)

export const ERROR_CTYPE_HASH_INVALID: ObjectsError = new ObjectsError(
  ErrorCode.ERROR_CTYPE_HASH_INVALID,
  'CType Hash could not be validated'
)

export const ERROR_MNEMONIC_PHRASE_INVALID: ObjectsError = new ObjectsError(
  ErrorCode.ERROR_MNEMONIC_PHRASE_INVALID,
  'Mnemonic phrase invalid'
)
export const ERROR_IDENTITY_MISMATCH: (
  context?: string,
  type?: string
) => ObjectsError = (context?: string, type?: string) => {
  if (type && context) {
    return new ObjectsError(
      ErrorCode.ERROR_IDENTITY_MISMATCH,
      `${type} is not owner of the ${context}`
    )
  }
  if (context) {
    return new ObjectsError(
      ErrorCode.ERROR_IDENTITY_MISMATCH,
      `Identity is not owner of the ${context}`
    )
  }
  return new ObjectsError(
    ErrorCode.ERROR_IDENTITY_MISMATCH,
    'Addresses expected to be equal mismatched'
  )
}
export const ERROR_ROOTHASH_UNVERIFIABLE: ObjectsError = new ObjectsError(
  ErrorCode.ERROR_ROOTHASH_UNVERIFIABLE,
  'RootHash could not be verified'
)

export const ERROR_DECOMPRESSION_ARRAY: (type?: string) => ObjectsError = (
  type?: string
) => {
  if (type) {
    return new ObjectsError(
      ErrorCode.ERROR_DECOMPRESSION_ARRAY,
      `Provided compressed ${type} not an Array or not of defined length`
    )
  }
  return new ObjectsError(
    ErrorCode.ERROR_DECOMPRESSION_ARRAY,
    'Provided compressed object not an Array or not of defined length'
  )
}

export const ERROR_COMPRESS_OBJECT: (
  object?: object,
  type?: string
) => ObjectsError = (object?: object, type?: string) => {
  if (object && type) {
    return new ObjectsError(
      ErrorCode.ERROR_COMPRESS_OBJECT,
      `Property Not Provided while compressing ${type}:\n${JSON.stringify(
        object,
        null,
        2
      )}`
    )
  }
  if (object) {
    return new ObjectsError(
      ErrorCode.ERROR_COMPRESS_OBJECT,
      `Property Not Provided while compressing object:\n${JSON.stringify(
        object,
        null,
        2
      )}`
    )
  }

  return new ObjectsError(
    ErrorCode.ERROR_COMPRESS_OBJECT,
    `Property Not Provided while compressing object`
  )
}
export const ERROR_DECODING_MESSAGE: ObjectsError = new ObjectsError(
  ErrorCode.ERROR_DECODING_MESSAGE,
  'Error decoding message'
)

export const ERROR_PARSING_MESSAGE: ObjectsError = new ObjectsError(
  ErrorCode.ERROR_PARSING_MESSAGE,
  'Error parsing message body'
)

export const ERROR_MESSAGE_TYPE: (
  type: string,
  expectedType: string,
  alternativeType?: string
) => ObjectsError = (
  type: string,
  expectedType: string,
  alternativeType?: string
) => {
  if (alternativeType) {
    return new ObjectsError(
      ErrorCode.ERROR_MESSAGE_TYPE,
      `Unexpected message type. Received ${type}, expected ${expectedType} or ${alternativeType}`
    )
  }
  return new ObjectsError(
    ErrorCode.ERROR_MESSAGE_TYPE,
    `Unexpected message type. Received ${type}, expected ${expectedType}`
  )
}

export const ERROR_UNKNOWN: ObjectsError = new ObjectsError(
  ErrorCode.ERROR_UNKNOWN,
  'an unknown error ocurred'
)
