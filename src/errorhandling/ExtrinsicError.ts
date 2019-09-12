/**
 * ExtrinsicErrors are KILT-specific errors, with associated codes and descriptions.
 * @module ErrorHandling/ExtrinsicErrors
 */

/**
 * Dummy comment needed for correct doc display, do not remove
 */
export enum ErrorCode {
  ERROR_CTYPE_NOT_FOUND = 1001,
  ERROR_CTYPE_ALREADY_EXISTS = 1002,

  ERROR_ALREADY_ATTESTED = 2001,
  ERROR_ALREADY_REVOKED = 2002,
  ERROR_ATTESTATION_NOT_FOUND = 2003,
  ERROR_DELEGATION_REVOKED = 2004,
  ERROR_NOT_DELEGATED_TO_ATTESTER = 2005,
  ERROR_DELEGATION_NOT_AUTHORIZED_TO_ATTEST = 2006,
  ERROR_CTYPE_OF_DELEGATION_NOT_MATCHING = 2007,
  ERROR_NOT_PERMITTED_TO_REVOKE_ATTESTATION = 2008,

  ERROR_ROOT_ALREADY_EXISTS = 3001,
  ERROR_NOT_PERMITTED_TO_REVOKE = 3002,
  ERROR_DELEGATION_NOT_FOUND = 3003,
  ERROR_DELEGATION_ALREADY_EXISTS = 3004,
  ERROR_BAD_DELEGATION_SIGNATURE = 3005,
  ERROR_NOT_OWNER_OF_PARENT = 3006,
  ERROR_NOT_AUTHORIZED_TO_DELEGATE = 3007,
  ERROR_PARENT_NOT_FOUND = 3008,
  ERROR_NOT_OWNER_OF_ROOT = 3009,
  ERROR_ROOT_NOT_FOUND = 3100,

  ERROR_UNKNOWN = -1,
}

export class ExtrinsicError extends Error {
  public errorCode: ErrorCode

  public constructor(errorCode: ErrorCode, message: string) {
    super(message)
    this.errorCode = errorCode
  }
}

export const ERROR_CTYPE_NOT_FOUND: ExtrinsicError = new ExtrinsicError(
  ErrorCode.ERROR_CTYPE_NOT_FOUND,
  'CTYPE not found'
)
export const ERROR_CTYPE_ALREADY_EXISTS: ExtrinsicError = new ExtrinsicError(
  ErrorCode.ERROR_CTYPE_ALREADY_EXISTS,
  'CTYPE already exists'
)
export const ERROR_ALEADY_ATTESTED: ExtrinsicError = new ExtrinsicError(
  ErrorCode.ERROR_ALREADY_ATTESTED,
  'already attested'
)
export const ERROR_ERROR_ALREADY_REVOKED: ExtrinsicError = new ExtrinsicError(
  ErrorCode.ERROR_ALREADY_REVOKED,
  'already revoked'
)
export const ERROR_ATTESTATION_NOT_FOUND: ExtrinsicError = new ExtrinsicError(
  ErrorCode.ERROR_ATTESTATION_NOT_FOUND,
  'attestation not found'
)
export const ERROR_DELEGATION_REVOKED: ExtrinsicError = new ExtrinsicError(
  ErrorCode.ERROR_DELEGATION_REVOKED,
  'delegation is revoked'
)
export const ERROR_NOT_DELEGATED_TO_ATTESTER: ExtrinsicError = new ExtrinsicError(
  ErrorCode.ERROR_NOT_DELEGATED_TO_ATTESTER,
  'not delegated to attester'
)
export const ERROR_DELEGATION_NOT_AUTHORIZED_TO_ATTEST: ExtrinsicError = new ExtrinsicError(
  ErrorCode.ERROR_DELEGATION_NOT_AUTHORIZED_TO_ATTEST,
  'delegation not authorized to attest'
)
export const ERROR_CTYPE_OF_DELEGATION_NOT_MATCHING: ExtrinsicError = new ExtrinsicError(
  ErrorCode.ERROR_CTYPE_OF_DELEGATION_NOT_MATCHING,
  'CTYPE of delegation does not match'
)
export const ERROR_NOT_PERMITTED_TO_REVOKE_ATTESTATION: ExtrinsicError = new ExtrinsicError(
  ErrorCode.ERROR_NOT_PERMITTED_TO_REVOKE_ATTESTATION,
  'not permitted to revoke attestation'
)
export const ERROR_ROOT_ALREADY_EXISTS: ExtrinsicError = new ExtrinsicError(
  ErrorCode.ERROR_ROOT_ALREADY_EXISTS,
  'root already exist'
)
export const ERROR_NOT_PERMITTED_TO_REVOKE: ExtrinsicError = new ExtrinsicError(
  ErrorCode.ERROR_NOT_PERMITTED_TO_REVOKE,
  'not permitted to revoke'
)
export const ERROR_DELEGATION_NOT_FOUND: ExtrinsicError = new ExtrinsicError(
  ErrorCode.ERROR_DELEGATION_NOT_FOUND,
  'delegation not found'
)
export const ERROR_DELEGATION_ALREADY_EXISTS: ExtrinsicError = new ExtrinsicError(
  ErrorCode.ERROR_DELEGATION_ALREADY_EXISTS,
  'delegation already exist'
)
export const ERROR_BAD_DELEGATION_SIGNATURE: ExtrinsicError = new ExtrinsicError(
  ErrorCode.ERROR_BAD_DELEGATION_SIGNATURE,
  'bad delegate signature'
)
export const ERROR_NOT_OWNER_OF_PARENT: ExtrinsicError = new ExtrinsicError(
  ErrorCode.ERROR_NOT_OWNER_OF_PARENT,
  'not owner of parent'
)
export const ERROR_NOT_AUTHORIZED_TO_DELEGATE: ExtrinsicError = new ExtrinsicError(
  ErrorCode.ERROR_NOT_AUTHORIZED_TO_DELEGATE,
  'not authorized to delegate'
)
export const ERROR_PARENT_NOT_FOUND: ExtrinsicError = new ExtrinsicError(
  ErrorCode.ERROR_PARENT_NOT_FOUND,
  'parent not found'
)
export const ERROR_NOT_OWNER_OF_ROOT: ExtrinsicError = new ExtrinsicError(
  ErrorCode.ERROR_NOT_OWNER_OF_ROOT,
  'not owner of root'
)
export const ERROR_ROOT_NOT_FOUND: ExtrinsicError = new ExtrinsicError(
  ErrorCode.ERROR_ROOT_NOT_FOUND,
  'root not found'
)

export const ERROR_UNKNOWN: ExtrinsicError = new ExtrinsicError(
  ErrorCode.ERROR_UNKNOWN,
  'an unknown error ocurred'
)

const errorsByCode: ExtrinsicError[] = []
;[
  ERROR_CTYPE_NOT_FOUND,
  ERROR_CTYPE_ALREADY_EXISTS,

  ERROR_ALEADY_ATTESTED,
  ERROR_ERROR_ALREADY_REVOKED,
  ERROR_ATTESTATION_NOT_FOUND,
  ERROR_DELEGATION_REVOKED,
  ERROR_NOT_DELEGATED_TO_ATTESTER,
  ERROR_DELEGATION_NOT_AUTHORIZED_TO_ATTEST,
  ERROR_CTYPE_OF_DELEGATION_NOT_MATCHING,
  ERROR_NOT_PERMITTED_TO_REVOKE_ATTESTATION,

  ERROR_ROOT_ALREADY_EXISTS,
  ERROR_NOT_PERMITTED_TO_REVOKE,
  ERROR_DELEGATION_NOT_FOUND,
  ERROR_DELEGATION_ALREADY_EXISTS,
  ERROR_BAD_DELEGATION_SIGNATURE,
  ERROR_NOT_OWNER_OF_PARENT,
  ERROR_NOT_AUTHORIZED_TO_DELEGATE,
  ERROR_PARENT_NOT_FOUND,
  ERROR_NOT_OWNER_OF_ROOT,
  ERROR_ROOT_NOT_FOUND,

  ERROR_UNKNOWN,
].forEach(value => {
  errorsByCode[value.errorCode] = value
})

export function errorForCode(errorCode: number): ExtrinsicError {
  return errorsByCode[errorCode]
}
