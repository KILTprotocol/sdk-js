/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/* eslint-disable no-empty-pattern */
/* eslint-disable class-methods-use-this */

import type { Proof } from 'jsonld-signatures'

export class AnyProofPurpose {
  async validate(
    {
      // proof
    },
    {
      /* document, suite, verificationMethod,
      documentLoader, expansionMap */
    }
  ): Promise<object> {
    return { valid: true }
  }

  async update(
    proof: Proof,
    {
      /* document, suite, documentLoader, expansionMap */
    }
  ): Promise<Proof> {
    return proof
  }

  async match(
    {
      // proof
    },
    {
      /* document, documentLoader, expansionMap */
    }
  ) {
    return true
  }
}
