/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * ExtrinsicErrors are KILT-specific errors, with associated codes and descriptions.
 *
 * @packageDocumentation
 * @module ErrorHandler
 */

import type { ModuleError } from './ErrorHandler'

/**
 * @internal
 */
export class ExtrinsicError extends Error {
  public errorCode: number

  public constructor(errorCode: number, message: string) {
    super(message)
    this.errorCode = errorCode
  }
}

/**
 * @internal
 */
export const ExtrinsicErrors = {
  CType: {
    ERROR_CTYPE_NOT_FOUND: { code: 11000, message: 'CType not found' },
    ERROR_CTYPE_ALREADY_EXISTS: {
      code: 11001,
      message: 'CType already exists',
    },
    UNKNOWN_ERROR: { code: 11100, message: 'an  unknown CType error occured' },
  },
  Attestation: {
    ERROR_ALREADY_ATTESTED: { code: 12000, message: 'already attested' },
    ERROR_ALREADY_REVOKED: { code: 12001, message: 'already revoked' },
    ERROR_ATTESTATION_NOT_FOUND: {
      code: 12002,
      message: 'attestation not found',
    },
    ERROR_CTYPE_OF_DELEGATION_NOT_MATCHING: {
      code: 12003,
      message: 'CType of delegation does not match',
    },
    ERROR_DELEGATION_NOT_AUTHORIZED_TO_ATTEST: {
      code: 12004,
      message: 'delegation not authorized to attest',
    },
    ERROR_DELEGATION_REVOKED: { code: 12005, message: 'delegation is revoked' },
    ERROR_NOT_DELEGATED_TO_ATTESTER: {
      code: 12006,
      message: 'not delegated to attester',
    },
    ERROR_NOT_PERMITTED_TO_REVOKE_ATTESTATION: {
      code: 12007,
      message: 'not permitted to revoke attestation',
    },
    UNKNOWN_ERROR: {
      code: 12100,
      message: 'an unknown attestation module error occured',
    },
  },
  Delegation: {
    ERROR_DELEGATION_ALREADY_EXISTS: {
      code: 13000,
      message: 'delegation already exists',
    },
    ERROR_BAD_DELEGATION_SIGNATURE: {
      code: 13001,
      message: 'bad delegate signature',
    },
    ERROR_DELEGATION_NOT_FOUND: {
      code: 13002,
      message: 'delegation not found',
    },
    ERROR_DELEGATE_NOT_FOUND: {
      code: 13003,
      message: 'delegate not found',
    },
    ERROR_HIERARCHY_ALREADY_EXISTS: {
      code: 13004,
      message: 'hierarchy already exist',
    },
    ERROR_HIERARCHY_NOT_FOUND: { code: 13005, message: 'hierarchy not found' },
    ERROR_MAX_DELEGATION_SEARCH_DEPTH_REACHED: {
      code: 13006,
      message: 'maximum delegation search depth reached',
    },
    ERROR_NOT_OWNER_OF_PARENT: { code: 13007, message: 'not owner of parent' },
    ERROR_NOT_OWNER_OF_HIERARCHY: {
      code: 13008,
      message: 'not owner of hierarchy',
    },
    ERROR_PARENT_NOT_FOUND: { code: 13009, message: 'parent not found' },
    ERROR_PARENT_REVOKED: {
      code: 13010,
      message: 'parent delegation revoked',
    },
    ERROR_NOT_PERMITTED_TO_REVOKE: {
      code: 13011,
      message: 'not permitted to revoke',
    },
    ERROR_NOT_AUTHORIZED_TO_DELEGATE: {
      code: 13012,
      message: 'not authorized to delegate',
    },
    ERROR_EXCEEDED_REVOCATION_BOUNDS: {
      code: 13013,
      message: 'exceeded revocation bounds',
    },
    ERROR_EXCEEDED_MAX_REVOCATIONS_ALLOWED: {
      code: 13014,
      message: 'exceeded max revocations allowed',
    },
    ERROR_EXCEEDED_MAX_PARENT_CHECKS_ALLOWED: {
      code: 13015,
      message: 'exceeded max parent checks allowed',
    },
    INTERNAL_ERROR: {
      code: 13016,
      message: 'an internal delegation module error occured',
    },
    UNKNOWN_ERROR: {
      code: 13100,
      message: 'an unknown delegation module error occured',
    },
  },
  DID: {
    UNKNOWN_ERROR: {
      code: 14100,
      message: 'an unknown DID module error occured',
    },
  },
  UNKNOWN_ERROR: { code: -1, message: 'an unknown extrinsic error ocurred' },
}

/**
 * @internal
 * PalletIndex reflects the numerical index of a pallet assigned in the chain's metadata.
 */
export enum PalletIndex {
  CType = 9,
  Attestation = 10,
  Delegation = 11,
  DID = 12,
}

/**
 * @internal
 */
export interface IPalletToExtrinsicErrors {
  [key: number]: {
    [key: number]: {
      code: number
      message: string
    }
  }
}

/**
 * @internal
 */
export const PalletToExtrinsicErrors: IPalletToExtrinsicErrors = {
  [PalletIndex.CType]: {
    0: ExtrinsicErrors.CType.ERROR_CTYPE_NOT_FOUND,
    1: ExtrinsicErrors.CType.ERROR_CTYPE_ALREADY_EXISTS,
    [-1]: ExtrinsicErrors.CType.UNKNOWN_ERROR,
  },
  [PalletIndex.Attestation]: {
    0: ExtrinsicErrors.Attestation.ERROR_ALREADY_ATTESTED,
    1: ExtrinsicErrors.Attestation.ERROR_ALREADY_REVOKED,
    2: ExtrinsicErrors.Attestation.ERROR_ATTESTATION_NOT_FOUND,
    3: ExtrinsicErrors.Attestation.ERROR_CTYPE_OF_DELEGATION_NOT_MATCHING,
    4: ExtrinsicErrors.Attestation.ERROR_DELEGATION_NOT_AUTHORIZED_TO_ATTEST,
    5: ExtrinsicErrors.Attestation.ERROR_DELEGATION_REVOKED,
    6: ExtrinsicErrors.Attestation.ERROR_NOT_DELEGATED_TO_ATTESTER,
    7: ExtrinsicErrors.Attestation.ERROR_NOT_PERMITTED_TO_REVOKE_ATTESTATION,
    [-1]: ExtrinsicErrors.Attestation.UNKNOWN_ERROR,
  },
  [PalletIndex.Delegation]: {
    0: ExtrinsicErrors.Delegation.ERROR_DELEGATION_ALREADY_EXISTS,
    1: ExtrinsicErrors.Delegation.ERROR_BAD_DELEGATION_SIGNATURE,
    2: ExtrinsicErrors.Delegation.ERROR_DELEGATION_NOT_FOUND,
    3: ExtrinsicErrors.Delegation.ERROR_DELEGATE_NOT_FOUND,
    4: ExtrinsicErrors.Delegation.ERROR_HIERARCHY_ALREADY_EXISTS,
    5: ExtrinsicErrors.Delegation.ERROR_HIERARCHY_NOT_FOUND,
    6: ExtrinsicErrors.Delegation.ERROR_MAX_DELEGATION_SEARCH_DEPTH_REACHED,
    7: ExtrinsicErrors.Delegation.ERROR_NOT_OWNER_OF_PARENT,
    8: ExtrinsicErrors.Delegation.ERROR_NOT_OWNER_OF_HIERARCHY,
    9: ExtrinsicErrors.Delegation.ERROR_PARENT_NOT_FOUND,
    10: ExtrinsicErrors.Delegation.ERROR_PARENT_REVOKED,
    11: ExtrinsicErrors.Delegation.ERROR_NOT_PERMITTED_TO_REVOKE,
    12: ExtrinsicErrors.Delegation.ERROR_NOT_AUTHORIZED_TO_DELEGATE,
    13: ExtrinsicErrors.Delegation.ERROR_EXCEEDED_REVOCATION_BOUNDS,
    14: ExtrinsicErrors.Delegation.ERROR_EXCEEDED_MAX_REVOCATIONS_ALLOWED,
    15: ExtrinsicErrors.Delegation.ERROR_EXCEEDED_MAX_PARENT_CHECKS_ALLOWED,
    16: ExtrinsicErrors.Delegation.INTERNAL_ERROR,
    [-1]: ExtrinsicErrors.Delegation.UNKNOWN_ERROR,
  },
  [PalletIndex.DID]: {
    [-1]: ExtrinsicErrors.DID.UNKNOWN_ERROR,
  },
}

/**
 * @internal
 * @param p The parameter object.
 * @param p.index The index of the KILT pallet in the metadata.
 * @param p.error The index of the position of the pallet's error definition inside the chain code.
 * @returns A new corresponding [[ExtrinsicError]].
 */
export function errorForPallet({
  index: moduleIndex,
  error: errorCode,
}: ModuleError['Module']): ExtrinsicError {
  if (!PalletToExtrinsicErrors[moduleIndex]) {
    return new ExtrinsicError(
      ExtrinsicErrors.UNKNOWN_ERROR.code,
      ExtrinsicErrors.UNKNOWN_ERROR.message
    )
  }
  if (!PalletToExtrinsicErrors[moduleIndex][errorCode]) {
    return new ExtrinsicError(
      PalletToExtrinsicErrors[moduleIndex][-1].code,
      PalletToExtrinsicErrors[moduleIndex][-1].message
    )
  }

  return new ExtrinsicError(
    PalletToExtrinsicErrors[moduleIndex][errorCode].code,
    PalletToExtrinsicErrors[moduleIndex][errorCode].message
  )
}
