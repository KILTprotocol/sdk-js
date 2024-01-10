/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/* eslint-disable no-empty-pattern */
/* eslint-disable class-methods-use-this */

// @ts-expect-error not a typescript module
import jsigs from 'jsonld-signatures' // cjs module

import type { Types } from '@kiltprotocol/credentials'
import type { JsonLdObj } from '../documentLoader.js'

export class NoProofPurpose extends jsigs.purposes.ProofPurpose {
  constructor({
    date,
    maxTimestampDelta = Infinity,
  }: { date?: Date | string | number; maxTimestampDelta?: number } = {}) {
    super({ term: 'none', date, maxTimestampDelta })
  }

  async validate(
    proof: Types.Proof,
    {
      document,
    }: /* suite, verificationMethod,
      documentLoader, expansionMap */
    { document?: JsonLdObj }
  ): Promise<object> {
    const created: string =
      (proof as any)?.created ?? (document as any)?.issuanceDate
    return super.validate({ ...proof, created }, {})
  }

  async update(
    proof: Types.Proof,
    {
      /* document, suite, documentLoader, expansionMap */
    }
  ): Promise<Types.Proof> {
    const proofCopy = { ...proof }
    delete (proofCopy as { proofPurpose?: string }).proofPurpose
    return proofCopy
  }

  async match(
    proof: Types.Proof,
    {
      /* document, documentLoader, expansionMap */
    }
  ): Promise<boolean> {
    return !Object.keys(proof).includes('proofPurpose')
  }
}
