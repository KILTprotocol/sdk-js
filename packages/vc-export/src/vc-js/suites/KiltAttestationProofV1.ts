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
  verifyProof,
} from '../../KiltAttestationProofV1.js'
import { checkStatus } from '../../KiltRevocationStatusV1.js'
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

  /**
   *
   */
  public get checkStatus() {
    const { api } = this
    return async ({
      credential,
    }: {
      credential: VerifiableCredential
    }): Promise<{ verified: boolean; error?: unknown }> => {
      return checkStatus(api, credential.credentialStatus, credential)
        .then(() => ({ verified: true }))
        .catch((error) => ({ verified: false, error }))
    }
  }

  /**
   * @param options
   * @param options.proof
   * @param options.document
   * @param options.purpose
   * @param options.documentLoader
   * @param options.expansionMap
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
      // TODO: maybe I have to compact first
      const proof = options.proof as KiltAttestationProofV1
      const document = options.document as VerifiableCredential
      await verifyProof(document, proof, this.api)
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
   * @inheritdoc
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
      this.transactionHandler(this.api.tx.attestation.add(...submissionArgs))
    )
    return proof
  }

  /**
   * @param credential
   */
  public async finalizeProof(
    credential: VerifiableCredential
  ): Promise<VerifiableCredential> {
    const { proof } = credential
    const rootHash = u8aToHex(calculateRootHash(credential, proof!))
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
    const updated = finalizeProof(credential, proof!, {
      blockHash,
      timestamp,
      genesisHash: this.api.genesisHash,
    })
    this.pendingSubmissions.delete(rootHash)
    return updated
  }
}
