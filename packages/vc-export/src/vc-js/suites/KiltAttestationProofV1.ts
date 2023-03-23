/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/* eslint-disable class-methods-use-this */
/* eslint-disable no-empty-pattern */

import jsigs from 'jsonld-signatures'
import { ApiPromise } from '@polkadot/api'
import { u8aToHex } from '@polkadot/util'
import {
  AttestationHandler,
  calculateRootHash,
  finalizeProof,
  initializeProof,
  verify as verifyProof,
} from '../../KiltAttestationProofV1.js'
import { check as checkStatus } from '../../KiltRevocationStatusV1.js'
import type {
  KiltAttestationProofV1,
  VerifiableCredential,
} from '../../types.js'
import { ATTESTATION_PROOF_V1_TYPE } from '../../constants.js'

const {
  suites: { LinkedDataProof },
} = jsigs

export class KiltAttestationV1Suite extends LinkedDataProof {
  private api: ApiPromise
  private transactionHandler?: AttestationHandler
  private pendingSubmissions = new Map<string, ReturnType<AttestationHandler>>()

  constructor({
    api,
    transactionHandler,
  }: {
    api: ApiPromise
    transactionHandler?: AttestationHandler
  }) {
    super({ type: ATTESTATION_PROOF_V1_TYPE })
    this.api = api
    this.transactionHandler = transactionHandler
  }

  // eslint-disable-next-line jsdoc/require-returns
  /**
   * A function to check the revocation status of KiltAttestationV1 proofs, which is tied to the [[KiltRevocationStatusV1]] method.
   */
  public get checkStatus(): (args: {
    credential: VerifiableCredential
  }) => Promise<{ verified: boolean; error?: unknown }> {
    const { api } = this
    return async ({ credential }) => {
      return checkStatus(credential, { api })
        .then(() => ({ verified: true }))
        .catch((error) => ({ verified: false, error }))
    }
  }

  /**
   * @inheritdoc
   */
  public async verifyProof(options: {
    proof: jsigs.Proof
    document?: object | undefined
    purpose?: jsigs.purposes.ProofPurpose
    documentLoader?: jsigs.DocumentLoader
    expansionMap?: jsigs.ExpansionMap
  }): Promise<jsigs.VerificationResult> {
    try {
      if (!(await this.matchProof(options))) {
        throw new Error('Proof mismatch')
      }
      // TODO: do we have to compact first in order to allow credentials in non-canonical (non-compacted) form?
      const proof = options.proof as KiltAttestationProofV1
      const document = options.document as VerifiableCredential
      await verifyProof(document, proof, { api: this.api })
      return {
        verified: true,
      }
    } catch (error) {
      return {
        verified: false,
        error: error instanceof Error ? error : new Error(String(error)),
      }
    }
  }

  /**
   * Initializes a proof for a [[KiltCredentialV1]] type document.
   *
   * _! This is not a complete proof yet !_.
   *
   * After adding the proof stub to the credential, the resulting document must be processed
   * by the `finalizeProof` method to make necessary adjustments to the document itself.
   *
   * @param input Object containing the function arguments.
   * @param input.document [[KiltCredentialV1]] object to be signed.
   * @param input.purpose Ignored here.
   * @param input.documentLoader Ignored here.
   * @param input.expansionMap Ignored here.
   *
   * @returns Resolves with the created proof object.
   */
  public async createProof({
    document,
  }: {
    document: object
    purpose?: jsigs.purposes.ProofPurpose
    documentLoader?: jsigs.DocumentLoader
    expansionMap?: jsigs.ExpansionMap
  }): Promise<KiltAttestationProofV1> {
    if (!this.transactionHandler) {
      throw new Error(
        'suite must be configured with a transactionHandler for proof generation'
      )
    }
    const [proof, submissionArgs] = initializeProof(
      document as VerifiableCredential
    )
    const [rootHash] = submissionArgs
    this.pendingSubmissions.set(
      u8aToHex(rootHash as Uint8Array),
      this.transactionHandler(
        this.api.tx.attestation.add(...submissionArgs),
        this.api
      )
    )
    return proof
  }

  /**
   * Processes a [[KiltCredentialV1]] with a proof stub created by `createProof` to produce a verifiable credential.
   * The proof must have been created with the same instance of the [[KiltAttestationProofV1Suite]].
   *
   * @param credential A [[KiltCredentialV1]] with a proof stub created by `createProof`.
   *
   * @returns An updated copy of the credential with necessary adjustments, containing a complete [[KiltAttestationV1]] proof.
   */
  public async finalizeProof(
    credential: VerifiableCredential
  ): Promise<VerifiableCredential> {
    const { proof } = credential
    if (!proof) {
      throw new Error(
        'The credential must have a proof property containing a proof stub as created by the `createProof` method'
      )
    }
    const rootHash = u8aToHex(calculateRootHash(credential, proof))
    const submissionPromise = this.pendingSubmissions.get(rootHash)
    if (!submissionPromise) {
      throw new Error('no submission found for this proof')
    }
    const {
      blockHash,
      timestamp = (await this.api.query.timestamp.now.at(blockHash)).toNumber(),
    } = await submissionPromise.catch((e) => {
      this.pendingSubmissions.delete(rootHash)
      throw new Error(`Promise rejected with ${e}`)
    })
    const updated = finalizeProof(credential, proof, {
      blockHash,
      timestamp,
      genesisHash: this.api.genesisHash,
    })
    this.pendingSubmissions.delete(rootHash)
    return updated
  }
}
