/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/* eslint-disable class-methods-use-this */
/* eslint-disable no-empty-pattern */

import type { ApiPromise } from '@polkadot/api'
import { base58Decode, base58Encode } from '@polkadot/util-crypto'

// @ts-expect-error not a typescript module
import jsigs from 'jsonld-signatures' // cjs module

import { ConfigService } from '@kiltprotocol/config'

import {
  AttestationHandler,
  finalizeProof,
  initializeProof,
  verify as verifyProof,
} from '../../KiltAttestationProofV1.js'
import { check as checkStatus } from '../../KiltRevocationStatusV1.js'
import {
  ATTESTATION_PROOF_V1_TYPE,
  KILT_CREDENTIAL_CONTEXT_URL,
} from '../../constants.js'
import { chainIdFromGenesis } from '../../CAIP/caip2.js'
import { includesContext } from './utils.js'
import type {
  KiltAttestationProofV1,
  Proof,
  KiltCredentialV1,
} from '../../types.js'
import type { JSigsVerificationResult } from './types.js'
import type { JsonLdObj } from '../documentLoader.js'

const {
  suites: { LinkedDataProof },
} = jsigs

interface CallArgs {
  proof: Proof
  document?: JsonLdObj
  [key: string]: unknown
}

export class KiltAttestationV1Suite extends LinkedDataProof {
  private api: ApiPromise
  private transactionHandler?: AttestationHandler

  public readonly contextUrl = KILT_CREDENTIAL_CONTEXT_URL
  /**
   * Placeholder value as \@digitalbazaar/vc requires a verificationMethod property on issuance.
   */
  public readonly verificationMethod: string

  constructor({
    api,
    transactionHandler,
  }: {
    api?: ApiPromise
    transactionHandler?: AttestationHandler
  } = {}) {
    super({ type: ATTESTATION_PROOF_V1_TYPE })
    this.api = api ?? ConfigService.get('api')
    this.transactionHandler = transactionHandler
    this.verificationMethod = chainIdFromGenesis(this.api.genesisHash)
  }

  // eslint-disable-next-line jsdoc/require-returns
  /**
   * A function to check the revocation status of KiltAttestationV1 proofs, which is tied to the [[KiltRevocationStatusV1]] method.
   */
  public get checkStatus(): (args: {
    credential: KiltCredentialV1
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
  public async matchProof(options: CallArgs): Promise<boolean> {
    return super.matchProof(options)
  }

  /**
   * @inheritdoc
   */
  public async verifyProof(
    options: CallArgs
  ): Promise<JSigsVerificationResult> {
    try {
      if (!(await this.matchProof(options))) {
        throw new Error('Proof mismatch')
      }
      if (!options.document) {
        throw new TypeError('document is required for verification')
      }
      // TODO: do we have to compact first in order to allow credentials in non-canonical (non-compacted) form?
      const proof = options.proof as KiltAttestationProofV1
      const document = options.document as unknown as KiltCredentialV1
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
   * Ensures the document to be signed contains the required signature suite
   * specific `@context`, by either adding it (if `addSuiteContext` is true),
   * or throwing an error if it's missing.
   *
   * @param options - Options hashmap.
   * @param options.document - JSON-LD document to be signed.
   * @param options.addSuiteContext - Add suite context?
   */
  public ensureSuiteContext({
    document,
    addSuiteContext = true,
  }: {
    document: JsonLdObj
    addSuiteContext: boolean
  }): void {
    const { contextUrl } = this

    if (includesContext({ document, contextUrl })) {
      // document already includes the required context
      return
    }

    if (!addSuiteContext) {
      throw new TypeError(
        `The document to be signed must contain this suite's @context, ` +
          `"${contextUrl}".`
      )
    }

    // enforce the suite's context by adding it to the document
    const existingContext = document['@context'] ?? []

    // eslint-disable-next-line no-param-reassign
    document['@context'] = Array.isArray(existingContext)
      ? [...existingContext, contextUrl]
      : [existingContext, contextUrl]
  }

  /**
   * Initializes a proof for a [[KiltCredentialV1]] type document.
   *
   * _! TO BE VERIFIABLE WITH THIS PROOF, ADJUSTMENTS HAVE TO BE MADE TO THE DOCUMENT !_.
   *
   * To do so, the document, with the proof added, must be processed
   * by the `finalizeProof` method.
   *
   * @param input Object containing the function arguments.
   * @param input.document [[KiltCredentialV1]] object to be signed.
   *
   * @returns Resolves with the created proof object.
   */
  public async createProof({
    document,
  }: {
    document: object
  }): Promise<KiltAttestationProofV1> {
    if (!this.transactionHandler) {
      throw new Error(
        'suite must be configured with a transactionHandler for proof generation'
      )
    }
    const [proof, submissionArgs] = initializeProof(
      document as KiltCredentialV1
    )
    const { blockHash } = await this.transactionHandler(
      this.api.tx.attestation.add(...submissionArgs),
      this.api
    )
    return { ...proof, block: base58Encode(blockHash) }
  }

  /**
   * Processes a preliminary [[KiltCredentialV1]] with a proof created by `createProof` to produce a verifiable [[KiltCredentialV1]].
   *
   * @param credential A (non-finalized) [[KiltCredentialV1]] with a [[KiltAttestationV1]] proof as created by `createProof`.
   *
   * @returns An updated copy of the credential with necessary adjustments to be verifiable with its [[KiltAttestationV1]] proof.
   */
  public async finalizeProof(
    credential: KiltCredentialV1
  ): Promise<KiltCredentialV1> {
    const { proof } = credential
    const attestationProof: KiltAttestationProofV1 | undefined = (
      Array.isArray(proof) ? proof : [proof]
    ).find((p) => p?.type === ATTESTATION_PROOF_V1_TYPE)
    if (!attestationProof) {
      throw new Error(
        `The credential must have a ${ATTESTATION_PROOF_V1_TYPE} type proof as created by the createProof method`
      )
    }
    const blockHash = base58Decode(proof.block)
    const timestamp = (
      await (await this.api.at(blockHash)).query.timestamp.now()
    ).toNumber()
    const updated = finalizeProof(credential, attestationProof, {
      blockHash,
      timestamp,
      genesisHash: this.api.genesisHash,
    })
    return updated
  }
}
