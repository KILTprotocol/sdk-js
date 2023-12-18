/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { base58Decode, base58Encode } from '@polkadot/util-crypto'

// @ts-expect-error not a typescript module
import jsigs from 'jsonld-signatures' // cjs module

import { KiltCredentialV1, Types } from '@kiltprotocol/credentials'
import { context } from '../context/context.js'
import { Sr25519VerificationKey2020 } from './Sr25519VerificationKey.js'
import { includesContext } from './utils.js'
import type { JSigsSigner, JSigsVerifier } from './types.js'
import type { DocumentLoader, JsonLdObj } from '../documentLoader.js'

/* eslint-disable class-methods-use-this */
/* eslint-disable no-use-before-define */
/* eslint-disable jsdoc/require-description-complete-sentence */

const LinkedDataSignature = jsigs.suites.LinkedDataSignature as {
  new (props: any): {
    signer?: JSigsSigner
    verifier?: JSigsVerifier
    key?: Sr25519VerificationKey2020
    LDKeyClass: typeof Sr25519VerificationKey2020
    matchProof(
      ...args: Parameters<Sr25519Signature2020['matchProof']>
    ): ReturnType<Sr25519Signature2020['matchProof']>
  }
}

const SUITE_CONTEXT_URL = KiltCredentialV1.CONTEXT_URL
// multibase base58-btc header
const MULTIBASE_BASE58BTC_HEADER = 'z'

interface VerificationMethod {
  verificationMethod: Record<string, unknown>
}
interface Options extends VerificationMethod {
  proof: Types.Proof & Partial<VerificationMethod>
  document: JsonLdObj
  purpose: any
  documentLoader: DocumentLoader
  verifyData: Uint8Array
}

export class Sr25519Signature2020 extends LinkedDataSignature {
  public static readonly CONTEXT_URL = SUITE_CONTEXT_URL
  public static readonly CONTEXT = context[SUITE_CONTEXT_URL]

  /**
   * Cryptographic suite to produce and verify Sr25519Signature2020 linked data signatures.
   * This is modelled after the {@link https://w3id.org/security/suites/ed25519-2020/v1 | Ed25519Signature2020 suite } but uses the sr25519 signature scheme common in the polkadot ecosystem.
   *
   * @param options - Options hashmap.
   *
   * Either a `key` OR at least one of `signer`/`verifier` is required.
   *
   * @param options.key - An optional key object (containing an
   *   `id` property, and either `signer` or `verifier`, depending on the
   *   intended operation. Useful for when the application is managing keys
   *   itself (when using a KMS, you never have access to the private key,
   *   and so should use the `signer` param instead).
   * @param options.signer - Signer function that returns an
   *   object with an async sign() method. This is useful when interfacing
   *   with a KMS (since you don't get access to the private key and its
   *   `signer()`, the KMS client gives you only the signer function to use).
   * @param options.verifier - Verifier function that returns
   *   an object with an async `verify()` method. Useful when working with a
   *   KMS-provided verifier function.
   *
   * Advanced optional parameters and overrides.
   *
   * @param options.proof - A JSON-LD document with options to use
   *   for the `proof` node (e.g. any other custom fields can be provided here
   *   using a context different from security-v2).
   * @param options.date - Signing date to use if not passed.
   * @param options.useNativeCanonize - Whether to use a native
   *   canonize algorithm.
   */
  constructor({
    key,
    signer,
    verifier,
    proof,
    date,
    useNativeCanonize,
  }: {
    key?: Sr25519VerificationKey2020
    signer?: JSigsSigner
    verifier?: JSigsVerifier
    proof?: Types.Proof
    date?: string | Date
    useNativeCanonize?: boolean
  } = {}) {
    super({
      type: 'Sr25519Signature2020',
      LDKeyClass: Sr25519VerificationKey2020,
      contextUrl: SUITE_CONTEXT_URL,
      key,
      signer,
      verifier,
      proof,
      date,
      useNativeCanonize,
    })
  }

  /**
   * Adds a signature (proofValue) field to the proof object. Called by
   * LinkedDataSignature.createProof().
   *
   * @param options - The options to use.
   * @param options.verifyData - Data to be signed (extracted
   *   from document, according to the suite's spec).
   * @param options.proof - Types.Proof object (containing the proofPurpose,
   *   verificationMethod, etc).
   *
   * @returns Resolves with the proof containing the signature
   *   value.
   */
  async sign({
    verifyData,
    proof,
  }: Pick<Options, 'proof' | 'verifyData'>): Promise<
    { proofValue: string } & Types.Proof
  > {
    if (!(this.signer && typeof this.signer.sign === 'function')) {
      throw new Error('A signer API has not been specified.')
    }

    const signatureBytes = await this.signer.sign({ data: verifyData })
    const proofValue = MULTIBASE_BASE58BTC_HEADER + base58Encode(signatureBytes)

    return { ...proof, proofValue }
  }

  /**
   * Verifies the proof signature against the given data.
   *
   * @param options - The options to use.
   * @param options.verifyData - Canonicalized hashed data.
   * @param options.verificationMethod - Key object.
   * @param options.proof - The proof to be verified.
   *
   * @returns Resolves with the verification result.
   */
  async verifySignature({
    verifyData,
    verificationMethod,
    proof,
  }: Pick<
    Options,
    'proof' | 'verifyData' | 'verificationMethod'
  >): Promise<boolean> {
    const { proofValue } = proof as Types.Proof & { proofValue: string }
    if (!(Boolean(proofValue) && typeof proofValue === 'string')) {
      throw new TypeError(
        'The proof does not include a valid "proofValue" property.'
      )
    }
    if (proofValue[0] !== MULTIBASE_BASE58BTC_HEADER) {
      throw new Error('Only base58btc multibase encoding is supported.')
    }
    const signatureBytes = base58Decode(proofValue.substring(1))

    const verifier =
      this.verifier ??
      (await this.LDKeyClass.from(verificationMethod as any)).verifier()

    return verifier.verify({
      data: verifyData,
      signature: signatureBytes,
    })
  }

  async assertVerificationMethod({
    verificationMethod,
  }: Pick<Options, 'verificationMethod'>): Promise<void> {
    let contextUrl
    if (verificationMethod.type === 'Sr25519VerificationKey2020') {
      contextUrl = SUITE_CONTEXT_URL
    } else {
      throw new Error(`Unsupported key type "${verificationMethod.type}".`)
    }
    if (
      !includesContext({
        document: verificationMethod,
        contextUrl,
      })
    ) {
      // For DID Documents, since keys do not have their own contexts,
      // the suite context is usually provided by the documentLoader logic
      throw new TypeError(
        `The verification method (key) must contain "${contextUrl}" context.`
      )
    }

    // ensure verification method has not been revoked
    if (verificationMethod.revoked !== undefined) {
      throw new Error('The verification method has been revoked.')
    }
  }

  async getVerificationMethod({
    proof,
    documentLoader,
  }: Pick<Options, 'proof' | 'documentLoader'>): Promise<any> {
    if (typeof this.key === 'object') {
      // This happens most often during sign() operations. For verify(),
      // the expectation is that the verification method will be fetched
      // by the documentLoader (below), not provided as a `key` parameter.
      return this.key.export({ publicKey: true })
    }

    const verificationMethodId =
      typeof proof.verificationMethod === 'object'
        ? proof.verificationMethod.id
        : proof.verificationMethod

    if (typeof verificationMethodId !== 'string') {
      throw new Error('No valid "verificationMethod" found in proof.')
    }

    const { document } = await documentLoader(verificationMethodId)

    const verificationMethod =
      typeof document === 'string' ? JSON.parse(document) : document

    await this.assertVerificationMethod({ verificationMethod })
    const verificationKey = (
      await Sr25519VerificationKey2020.from({
        ...verificationMethod,
      })
    ).export({ publicKey: true, includeContext: true })
    return verificationKey
  }

  async matchProof({
    proof,
    document,
    purpose,
    documentLoader,
  }: Pick<Options, 'proof' | 'document'> &
    Partial<Pick<Options, 'purpose' | 'documentLoader'>>): Promise<boolean> {
    if (!includesContext({ document, contextUrl: SUITE_CONTEXT_URL })) {
      return false
    }

    if (
      (await super.matchProof({ proof, document, purpose, documentLoader })) !==
      true
    ) {
      return false
    }
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (!this.key) {
      // no key specified, so assume this suite matches and it can be retrieved
      return true
    }

    const { verificationMethod } = proof

    // only match if the key specified matches the one in the proof
    if (typeof verificationMethod === 'object') {
      return verificationMethod.id === this.key.id
    }
    return verificationMethod === this.key.id
  }
}
