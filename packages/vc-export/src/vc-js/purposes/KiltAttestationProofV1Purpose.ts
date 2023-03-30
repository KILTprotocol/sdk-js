/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/* eslint-disable no-empty-pattern */
/* eslint-disable class-methods-use-this */

import jsigs from 'jsonld-signatures' // cjs module
import type { JsonLdObj } from 'jsonld/jsonld-spec.js'

import { ATTESTATION_PROOF_V1_TYPE } from '../../constants.js'

export class KiltAttestationProofV1Purpose extends jsigs.purposes.ProofPurpose {
  constructor({
    date,
    maxTimestampDelta = Infinity,
  }: { date?: Date | string | number; maxTimestampDelta?: number } = {}) {
    super({ term: 'none', date, maxTimestampDelta })
  }

  async validate(
    proof: jsigs.Proof,
    {
      document,
    }: /* suite, verificationMethod,
      documentLoader, expansionMap */
    { document: JsonLdObj }
  ): Promise<object> {
    const created: string =
      (proof as any).created ?? (document as any).issuanceDate
    return super.validate<jsigs.Proof & { created: string }>(
      { ...proof, created },
      {}
    )
  }

  async update(
    proof: jsigs.Proof,
    {
      /* document, suite, documentLoader, expansionMap */
    }
  ): Promise<jsigs.Proof> {
    return { ...proof, type: ATTESTATION_PROOF_V1_TYPE }
  }

  async match(
    proof: jsigs.Proof,
    {
      /* document, documentLoader, expansionMap */
    }
  ): Promise<boolean> {
    return proof.type === ATTESTATION_PROOF_V1_TYPE
  }
}
