/**
 * ExtrinsicErrors are KILT-specific errors, with associated codes and descriptions.
 * Note: These codes are not used on chain anymore.
 *
 * @packageDocumentation
 * @module ExtrinsicErrors
 * @preferred
 */

import { ModuleError } from './ErrorHandler'

export enum ErrorCode {
  ERROR_CTYPE_NOT_FOUND = '11_00',
  ERROR_CTYPE_ALREADY_EXISTS = '11_01',
  UNKNOWN_CTYPE_ERROR = '11_02',

  ERROR_ALREADY_ATTESTED = '12_00',
  ERROR_ALREADY_REVOKED = '12_01',
  ERROR_ATTESTATION_NOT_FOUND = '12_02',
  ERROR_CTYPE_OF_DELEGATION_NOT_MATCHING = '12_03',
  ERROR_DELEGATION_NOT_AUTHORIZED_TO_ATTEST = '12_04',
  ERROR_DELEGATION_REVOKED = '12_05',
  ERROR_NOT_DELEGATED_TO_ATTESTER = '12_06',
  ERROR_NOT_PERMITTED_TO_REVOKE_ATTESTATION = '12_07',
  UNKNOWN_ATTESTATION_ERROR = '12_08',

  ERROR_DELEGATION_ALREADY_EXISTS = '13_00',
  ERROR_BAD_DELEGATION_SIGNATURE = '13_01',
  ERROR_DELEGATION_NOT_FOUND = '13_02',
  ERROR_ROOT_ALREADY_EXISTS = '13_03',
  ERROR_ROOT_NOT_FOUND = '13_04',
  ERROR_MAX_DELEGATION_SEARCH_DEPTH_REACHED = '13_05',
  ERROR_NOT_OWNER_OF_PARENT = '13_06',
  ERROR_NOT_OWNER_OF_ROOT = '13_07',
  ERROR_PARENT_NOT_FOUND = '13_08',
  ERROR_NOT_PERMITTED_TO_REVOKE = '13_09',
  ERROR_NOT_AUTHORIZED_TO_DELEGATE = '13_10',
  UNKNOWN_DELEGATION_ERROR = '13_11',

  ERROR_UNKNOWN = '-1',
}

/**
 * PalletIndex reflects the numerical index of a pallet assigned in the chain's metadata.
 *
 * @packageDocumentation
 * @module PalletIndex
 * @preferred
 */
export enum PalletIndex {
  CType = 11,
  Attestation = 12,
  Delegation = 13,
  DID = 14,
}

export class ExtrinsicError extends Error {
  public errorCode: ErrorCode

  public constructor(errorCode: ErrorCode, message: string) {
    super(message)
    this.errorCode = errorCode
  }
}

// CType
export const UNKNOWN_CTYPE_ERROR = (index: number): ExtrinsicError =>
  new ExtrinsicError(
    ErrorCode.UNKNOWN_CTYPE_ERROR,
    `unknown CTYPE module error with index ${index} occured, please contact support`
  )
export const ERROR_CTYPE_NOT_FOUND: ExtrinsicError = new ExtrinsicError(
  ErrorCode.ERROR_CTYPE_NOT_FOUND,
  'CTYPE not found'
)
export const ERROR_CTYPE_ALREADY_EXISTS: ExtrinsicError = new ExtrinsicError(
  ErrorCode.ERROR_CTYPE_ALREADY_EXISTS,
  'CTYPE already exists'
)

// Attestation
export const UNKNOWN_ATTESTATION_ERROR = (index: number): ExtrinsicError =>
  new ExtrinsicError(
    ErrorCode.UNKNOWN_ATTESTATION_ERROR,
    `unknown attestation module error with index ${index} occured, please contact support`
  )

export const ERROR_ALREADY_ATTESTED: ExtrinsicError = new ExtrinsicError(
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

// Delegation
export const UNKNOWN_DELEGATION_ERROR = (index: number): ExtrinsicError =>
  new ExtrinsicError(
    ErrorCode.UNKNOWN_DELEGATION_ERROR,
    `unknown delegation module error with index ${index} occured, please contact support`
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
export const ERROR_MAX_DELEGATION_SEARCH_DEPTH_REACHED: ExtrinsicError = new ExtrinsicError(
  ErrorCode.ERROR_MAX_DELEGATION_SEARCH_DEPTH_REACHED,
  'maximum delegation search depth reached'
)
export const ERROR_UNKNOWN: ExtrinsicError = new ExtrinsicError(
  ErrorCode.ERROR_UNKNOWN,
  'an unknown extrinsic error ocurred'
)

/**
 * Maps an error code to its corresponding [[ModuleError]].
 *
 * @param code The KILT specific error code.
 *
 * @returns The [[ModuleError]] as in the chain's metadata for the KILT specific error code.
 */
export function errorCodeToModuleError(code: ErrorCode): ModuleError['Module'] {
  const [index, error] = code
    .split('_')
    .map((s: string) => Number.parseInt(s, 10))
  return { index, error }
}

/**
 * Maps a [[ModuleError]] to its corresponding [[ExtrinsicError]].
 *
 * @param p The parameter object.
 * @param p.index The index of the KILT pallet in the metadata.
 * @param p.error The index of the position of the pallet's error definition inside the chain code.
 *
 * @returns The [[ExtrinsicError]] for the committed key.
 */
export function errorForPallet({
  index: moduleIndex,
  error: errorCode,
}: ModuleError['Module']): ExtrinsicError {
  switch (moduleIndex) {
    case PalletIndex.CType:
      switch (errorCode) {
        case 0:
          return ERROR_CTYPE_NOT_FOUND
        case 1:
          return ERROR_CTYPE_ALREADY_EXISTS
        default:
          return UNKNOWN_CTYPE_ERROR(errorCode)
      }
    case PalletIndex.Attestation:
      switch (errorCode) {
        case 0:
          return ERROR_ALREADY_ATTESTED
        case 1:
          return ERROR_ERROR_ALREADY_REVOKED
        case 2:
          return ERROR_ATTESTATION_NOT_FOUND
        case 3:
          return ERROR_CTYPE_OF_DELEGATION_NOT_MATCHING
        case 4:
          return ERROR_DELEGATION_NOT_AUTHORIZED_TO_ATTEST
        case 5:
          return ERROR_DELEGATION_REVOKED
        case 6:
          return ERROR_NOT_DELEGATED_TO_ATTESTER
        case 7:
          return ERROR_NOT_PERMITTED_TO_REVOKE_ATTESTATION
        default:
          return UNKNOWN_ATTESTATION_ERROR(errorCode)
      }
    case PalletIndex.Delegation:
      switch (errorCode) {
        case 0:
          return ERROR_DELEGATION_ALREADY_EXISTS
        case 1:
          return ERROR_BAD_DELEGATION_SIGNATURE
        case 2:
          return ERROR_DELEGATION_NOT_FOUND
        case 3:
          return ERROR_ROOT_ALREADY_EXISTS
        case 4:
          return ERROR_ROOT_NOT_FOUND
        case 5:
          return ERROR_MAX_DELEGATION_SEARCH_DEPTH_REACHED
        case 6:
          return ERROR_NOT_OWNER_OF_PARENT
        case 7:
          return ERROR_NOT_OWNER_OF_ROOT
        case 8:
          return ERROR_PARENT_NOT_FOUND
        case 9:
          return ERROR_NOT_PERMITTED_TO_REVOKE
        case 10:
          return ERROR_NOT_AUTHORIZED_TO_DELEGATE
        default:
          return UNKNOWN_DELEGATION_ERROR(errorCode)
      }
    default:
      return ERROR_UNKNOWN
  }
}
