/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { RegistryTypes } from '@polkadot/types/types'
import { types10 } from './types_10.js'

export const types12: RegistryTypes = {
  ...types10,
  // Staking updated types
  DelegationCounter: {
    round: 'SessionIndex',
    counter: 'u32',
  },
  // DID updated types
  DidVerificationKey: {
    _enum: {
      Ed25519: '[u8; 32]',
      Sr25519: '[u8; 32]',
      Secp256k1: '[u8; 33]',
    },
  },
  DidSignature: {
    _enum: {
      Ed25519: 'Ed25519Signature',
      Sr25519: 'Sr25519Signature',
      'Ecdsa-Secp256k1': 'EcdsaSignature',
    },
  },
}
