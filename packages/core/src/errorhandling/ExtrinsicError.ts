/**
 * ExtrinsicErrors are KILT-specific errors, with associated codes and descriptions.
 *
 * @packageDocumentation
 * @module ExtrinsicErrors
 * @preferred
 */

import { ModuleError } from './ErrorHandler'

export class ExtrinsicError extends Error {
  public errorCode: number

  public constructor(errorCode: number, message: string) {
    super(message)
    this.errorCode = errorCode
  }
}

/**
 * This dictionary holds all [[ExtrinsicError]]s, divided by pallets.
 *
 * @packageDocumentation
 * @module ExtrinsicErrors
 * @preferred
 */
export const ExtrinsicErrors = {
  CType: {
    ERROR_CTYPE_NOT_FOUND: new ExtrinsicError(2000, 'CType not found'),
    ERROR_CTYPE_ALREADY_EXISTS: new ExtrinsicError(
      2001,
      'CType already exists'
    ),
    UNKNOWN_ERROR: new ExtrinsicError(2100, 'an  unknown CType error occured'),
  },
  Attestation: {
    ERROR_ALREADY_ATTESTED: new ExtrinsicError(3000, 'already attested'),
    ERROR_ALREADY_REVOKED: new ExtrinsicError(3001, 'already revoked'),
    ERROR_ATTESTATION_NOT_FOUND: new ExtrinsicError(
      3002,
      'attestation not found'
    ),
    ERROR_CTYPE_OF_DELEGATION_NOT_MATCHING: new ExtrinsicError(
      3003,
      'CType of delegation does not match'
    ),
    ERROR_DELEGATION_NOT_AUTHORIZED_TO_ATTEST: new ExtrinsicError(
      3004,
      'delegation not authorized to attest'
    ),
    ERROR_DELEGATION_REVOKED: new ExtrinsicError(3005, 'delegation is revoked'),
    ERROR_NOT_DELEGATED_TO_ATTESTER: new ExtrinsicError(
      3006,
      'not delegated to attester'
    ),
    ERROR_NOT_PERMITTED_TO_REVOKE_ATTESTATION: new ExtrinsicError(
      3007,
      'not permitted to revoke attestation'
    ),
    UNKNOWN_ERROR: new ExtrinsicError(
      3100,
      'an unknown attestation module error occured'
    ),
  },
  Delegation: {
    ERROR_DELEGATION_ALREADY_EXISTS: new ExtrinsicError(
      3000,
      'delegation already exists'
    ),
    ERROR_BAD_DELEGATION_SIGNATURE: new ExtrinsicError(
      3001,
      'bad delegate signature'
    ),
    ERROR_DELEGATION_NOT_FOUND: new ExtrinsicError(
      3002,
      'delegation not found'
    ),
    ERROR_ROOT_ALREADY_EXISTS: new ExtrinsicError(3003, 'root already exist'),
    ERROR_ROOT_NOT_FOUND: new ExtrinsicError(3004, 'root not found'),
    ERROR_MAX_DELEGATION_SEARCH_DEPTH_REACHED: new ExtrinsicError(
      3005,
      'maximum delegation search depth reached'
    ),
    ERROR_NOT_OWNER_OF_PARENT: new ExtrinsicError(3006, 'not owner of parent'),
    ERROR_NOT_OWNER_OF_ROOT: new ExtrinsicError(3007, 'not owner of root'),
    ERROR_PARENT_NOT_FOUND: new ExtrinsicError(3008, 'parent not found'),
    ERROR_NOT_PERMITTED_TO_REVOKE: new ExtrinsicError(
      3009,
      'not permitted to revoke'
    ),
    ERROR_NOT_AUTHORIZED_TO_DELEGATE: new ExtrinsicError(
      3010,
      'not authorized to delegate'
    ),
    ERROR_EXCEEDED_REVOCATION_BOUNDS: new ExtrinsicError(
      3011,
      'exceeded revocation bounds'
    ),
    UNKNOWN_ERROR: new ExtrinsicError(
      3100,
      'an unknown delegation module error occured'
    ),
  },
  DID: {
    UNKNOWN_ERROR: new ExtrinsicError(
      4100,
      'an unknown DID module error occured'
    ),
  },
  UNKNOWN_ERROR: new ExtrinsicError(-1, 'an unknown extrinsic error ocurred'),
}

/**
 * PalletIndex reflects the numerical index of a pallet assigned in the chain's metadata.
 *
 * @packageDocumentation
 * @module ExtrinsicErrors
 * @preferred
 */
export enum PalletIndex {
  CType = 11,
  Attestation = 12,
  Delegation = 13,
  DID = 14,
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
  // get moduleName by checking whether moduleIndex is in PalletIndex values
  const [moduleName] = Object.entries(PalletIndex).find(
    ([, value]) => value === moduleIndex
  ) || ['UNKNOWN_ERROR']
  if (moduleName !== 'UNKNOWN_ERROR' && moduleName in ExtrinsicErrors) {
    // get error name for index
    const errorName = Object.keys(ExtrinsicErrors[moduleName])[errorCode]
    // return unknown module error if index is out of bounds
    return errorName
      ? ExtrinsicErrors[moduleName][errorName]
      : ExtrinsicErrors[moduleName].UNKNOWN_ERROR
  }
  // return unknown error per default
  return ExtrinsicErrors.UNKNOWN_ERROR
}
