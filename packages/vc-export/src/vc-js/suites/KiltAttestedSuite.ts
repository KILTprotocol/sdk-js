/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/* eslint-disable max-classes-per-file */
import {
  Blockchain,
  BlockchainApiConnection,
} from '@kiltprotocol/chain-helpers'
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
  private readonly provider: Blockchain

  constructor(options: { KiltConnection: Blockchain }) {
    // vc-js complains when there is no verificationMethod
    super({ type: KILT_ATTESTED_PROOF_TYPE, verificationMethod: '<none>' })
    if (
      !options.KiltConnection ||
      !(options.KiltConnection instanceof Blockchain)
    )
      throw new TypeError('KiltConnection must be a Kilt blockchain connection')
    this.provider = options.KiltConnection
  }

  private setConnection(): void {
    BlockchainApiConnection.setConnection(Promise.resolve(this.provider))
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
      if (!document || typeof document !== 'object')
        throw new TypeError('document must be a JsonLd object')
      if (!proof || typeof proof !== 'object')
        throw new TypeError('proof must be a JsonLd object')
      const compactedDoc = await this.compactDoc(document, options)
      const compactedProof = await this.compactProof<AttestedProof>(
        proof,
        options
      )
      this.setConnection()
      const { verified, errors, status } = await verifyAttestedProof(
        compactedDoc,
        compactedProof
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
