/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/* eslint-disable class-methods-use-this */
/* eslint-disable no-empty-pattern */

import { u8aToHex } from '@polkadot/util'
import type { ApiPromise } from '@polkadot/api'

// @ts-expect-error not a typescript module
import jsigs from 'jsonld-signatures' // cjs module

import { CType } from '@kiltprotocol/core'
import type { ICType } from '@kiltprotocol/types'

import {
  AttestationHandler,
  calculateRootHash,
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
import type { CTypeLoader } from '../../KiltCredentialV1.js'
import type { JSigsVerificationResult } from './types.js'
import type { DocumentLoader, JsonLdObj } from '../documentLoader.js'

const {
  suites: { LinkedDataProof },
} = jsigs

interface CallArgs {
  proof: Proof
  document?: JsonLdObj
  documentLoader?: DocumentLoader
  [key: string]: unknown
}

export class KiltAttestationV1Suite extends LinkedDataProof {
  private api: ApiPromise
  private ctypes: ICType[]
  private transactionHandler?: AttestationHandler
  private pendingSubmissions = new Map<string, ReturnType<AttestationHandler>>()

  public readonly contextUrl = KILT_CREDENTIAL_CONTEXT_URL
  /**
   * Placeholder value as @digitalbazaar/vc requires a verificationMethod property on issuance.
   */
  public readonly verificationMethod: string

  constructor({
    api,
    ctypes = [],
    transactionHandler,
  }: {
    api: ApiPromise
    ctypes?: ICType[]
    transactionHandler?: AttestationHandler
  }) {
    super({ type: ATTESTATION_PROOF_V1_TYPE })
    this.api = api
    this.ctypes = ctypes
    this.transactionHandler = transactionHandler
    this.verificationMethod = chainIdFromGenesis(api.genesisHash)
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
      const loadCTypes: CTypeLoader = async (id) => {
        const { document: ctype } = (await options.documentLoader?.(id)) ?? {}
        if (!CType.isICType(ctype)) {
          throw new Error(
            `documentLoader failed to resolve to valid CType for ${id}`
          )
        }
        return ctype
      }
      await verifyProof(document, proof, {
        api: this.api,
        loadCTypes,
        cTypes: this.ctypes,
      })
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
   * _! This is not a complete proof yet !_.
   *
   * After adding the proof stub to the credential, the resulting document must be processed
   * by the `finalizeProof` method to make necessary adjustments to the document itself.
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
    credential: KiltCredentialV1
  ): Promise<KiltCredentialV1> {
    const { proof } = credential
    const proofStub: KiltAttestationProofV1 | undefined = (
      Array.isArray(proof) ? proof : [proof]
    ).find((p) => p?.type === ATTESTATION_PROOF_V1_TYPE)
    if (!proofStub) {
      throw new Error(
        'The credential must have a proof property containing a proof stub as created by the `createProof` method'
      )
    }
    const rootHash = u8aToHex(calculateRootHash(credential, proofStub))
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
    const updated = finalizeProof(credential, proofStub, {
      blockHash,
      timestamp,
      genesisHash: this.api.genesisHash,
    })
    this.pendingSubmissions.delete(rootHash)
    return updated
  }
}
