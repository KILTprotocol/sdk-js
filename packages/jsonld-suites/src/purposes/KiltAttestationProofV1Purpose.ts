/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/* eslint-disable no-empty-pattern */
/* eslint-disable class-methods-use-this */

// @ts-expect-error not a typescript module
import jsigs from 'jsonld-signatures' // cjs module

import { KiltAttestationProofV1, Types } from '@kiltprotocol/credentials'
import type { JsonLdObj } from '../documentLoader.js'

export class KiltAttestationProofV1Purpose extends jsigs.purposes.ProofPurpose {
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
    return { ...proof, type: KiltAttestationProofV1.PROOF_TYPE }
  }

  async match(
    proof: Types.Proof,
    {
      /* document, documentLoader, expansionMap */
    }
  ): Promise<boolean> {
    return proof.type === KiltAttestationProofV1.PROOF_TYPE
  }
}
