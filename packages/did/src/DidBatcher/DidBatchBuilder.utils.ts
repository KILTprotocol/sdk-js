/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

// This module is not part of the public-facing api.
/* eslint-disable jsdoc/require-jsdoc */

import type { Extrinsic } from '@polkadot/types/interfaces'

import type { VerificationKeyRelationship } from '@kiltprotocol/types'

import { SDKErrors } from '@kiltprotocol/utils'

import { FullDidDetails } from '../DidDetails/FullDidDetails.js'
import { getKeyRelationshipForExtrinsic } from '../DidDetails/FullDidDetails.utils.js'

export function checkExtrinsicInput(
  ext: Extrinsic,
  did: FullDidDetails
): VerificationKeyRelationship {
  const { section, method } = ext.method
  // Cannot batch DID extrinsics
  if (section === 'did') {
    throw new SDKErrors.ERROR_DID_BUILDER_ERROR(
      'DidBatchBuilder.addExtrinsic() cannot be used to queue DID extrinsics. Please use FullDidBuilder and its subclasses for those.'
    )
  }

  const extrinsicKeyRelationship = getKeyRelationshipForExtrinsic(ext)
  if (extrinsicKeyRelationship === 'paymentAccount') {
    throw new SDKErrors.ERROR_DID_ERROR(
      'DidBatchBuilder.addExtrinsic() cannot be used to queue extrinsics that do not require a DID signature.'
    )
  }

  if (did.getVerificationKeys(extrinsicKeyRelationship).length === 0) {
    throw new SDKErrors.ERROR_DID_ERROR(
      `DidBatchBuilder.addExtrinsic() cannot be used with the provided extrinsic "${section}:${method}" because the DID ${did.uri} does not have a valid key to sign the operation.`
    )
  }

  return extrinsicKeyRelationship
}
