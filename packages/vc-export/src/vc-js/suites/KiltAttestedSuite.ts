/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/* eslint-disable max-classes-per-file */
import { ApiPromise } from '@polkadot/api'
import type {
  DocumentLoader,
  ExpansionMap,
  Proof,
  purposes,
  VerificationResult,
} from 'jsonld-signatures'
import type { JsonLdObj } from 'jsonld/jsonld-spec'

import type { AttestedProof } from '../../types.js'
import {
  verifyAttestedProof,
  AttestationStatus,
} from '../../verificationUtils.js'
import { KILT_ATTESTED_PROOF_TYPE } from '../../constants.js'
import { KiltAbstractSuite } from './KiltAbstractSuite.js'

class AttestationError extends Error {
  public readonly attestationStatus: AttestationStatus

  constructor(message: string, attestationStatus: AttestationStatus) {
    super(message)
    this.name = 'AttestationError'
    this.attestationStatus = attestationStatus
  }
}

export class KiltAttestedSuite extends KiltAbstractSuite {
  private readonly provider: ApiPromise

  constructor(options: { KiltConnection: ApiPromise }) {
    // vc-js complains when there is no verificationMethod
    super({ type: KILT_ATTESTED_PROOF_TYPE, verificationMethod: '<none>' })
    if (!('KiltConnection' in options))
      throw new TypeError('KiltConnection must be a Kilt blockchain connection')
    this.provider = options.KiltConnection
  }

  /**
   * @inheritdoc
   */
  public async verifyProof(options: {
    proof: Proof
    document: JsonLdObj
    purpose?: purposes.ProofPurpose
    documentLoader?: DocumentLoader
    expansionMap?: ExpansionMap
  }): Promise<VerificationResult> {
    try {
      const { document, proof } = options
      if (typeof document !== 'object')
        throw new TypeError('Document must be a JsonLd object')
      if (typeof proof !== 'object')
        throw new TypeError('Proof must be a JsonLd object')
      const compactedDoc = await this.compactDoc(document, options)
      const compactedProof = await this.compactProof<AttestedProof>(
        proof,
        options
      )
      const { verified, errors, status } = await verifyAttestedProof(
        compactedDoc,
        compactedProof,
        this.provider
      )
      if (errors.length > 0)
        return {
          verified,
          error: new AttestationError(errors[0].message, status),
        }
      return { verified }
    } catch (e: any) {
      return { verified: false, error: e }
    }
  }
}
