/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/* eslint-disable class-methods-use-this */
/* eslint-disable no-empty-pattern */

// @ts-expect-error not a typescript module
import jsigs from 'jsonld-signatures' // cjs module

import { ConfigService } from '@kiltprotocol/config'
import {
  CType,
  KiltAttestationProofV1,
  KiltRevocationStatusV1,
  Types,
  KiltCredentialV1,
} from '@kiltprotocol/credentials'
import type { DidDocument, Did, ICType } from '@kiltprotocol/types'

import { Caip2 } from '@kiltprotocol/utils'
import type { DocumentLoader, JsonLdObj } from '../documentLoader.js'
import type { JSigsVerificationResult } from './types.js'
import { includesContext } from './utils.js'

const {
  suites: { LinkedDataProof },
} = jsigs

interface CallArgs {
  proof: Types.Proof
  document?: JsonLdObj
  documentLoader?: DocumentLoader
  [key: string]: unknown
}

export type CredentialStub = Pick<
  KiltCredentialV1.Interface,
  'credentialSubject'
> &
  Partial<KiltCredentialV1.Interface>

export class KiltAttestationV1Suite extends LinkedDataProof {
  private ctypes: ICType[]
  private attestationInfo = new Map<
    KiltCredentialV1.Interface['id'],
    KiltAttestationProofV1.Interface
  >()

  public readonly contextUrl = KiltCredentialV1.CONTEXT_URL
  // eslint-disable-next-line jsdoc/require-returns
  /**
   * Placeholder value as \@digitalbazaar/vc requires a verificationMethod property on issuance.
   */
  public get verificationMethod(): string {
    return Caip2.chainIdFromGenesis(ConfigService.get('api').genesisHash)
  }

  constructor({
    ctypes = [],
  }: {
    ctypes?: ICType[]
  } = {}) {
    super({ type: KiltAttestationProofV1.PROOF_TYPE })
    this.ctypes = ctypes
  }

  // eslint-disable-next-line jsdoc/require-returns
  /**
   * A function to check the revocation status of KiltAttestationV1 proofs, which is tied to the {@link KiltRevocationStatusV1} method.
   */
  public get checkStatus(): (args: {
    credential: KiltCredentialV1.Interface
  }) => Promise<{ verified: boolean; error?: unknown }> {
    return async ({ credential }) => {
      return KiltRevocationStatusV1.check(credential)
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
      const proof = options.proof as KiltAttestationProofV1.Interface
      const document = options.document as unknown as KiltCredentialV1.Interface
      const loadCTypes: CType.CTypeLoader = async (id) => {
        const { document: ctype } = (await options.documentLoader?.(id)) ?? {}
        if (!CType.isICType(ctype)) {
          throw new Error(
            `documentLoader failed to resolve to valid CType for ${id}`
          )
        }
        return ctype
      }
      await KiltAttestationProofV1.verify(document, proof, {
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
   * Adds a proof to a {@link KiltCredentialV1} type document.
   *
   * ! __This will fail unless the document has been created with `anchorCredential` by the same class instance prior to calling `createProof`__ !
   *
   * @param input Object containing the function arguments.
   * @param input.document A {@link KiltCredentialV1} object to be signed.
   *
   * @returns Resolves with the created proof object.
   */
  public async createProof({
    document,
  }: {
    document: object
  }): Promise<KiltAttestationProofV1.Interface> {
    const credential = document as KiltCredentialV1.Interface
    KiltCredentialV1.validateStructure(credential)
    const { id } = credential
    const proof = this.attestationInfo.get(id)
    if (!proof) {
      throw new Error(
        `No attestation information available for the credential ${id}. Make sure you have called anchorCredential on the same instance of this class.`
      )
    }
    return proof
  }

  /**
   * Processes a {@link KiltCredentialV1} stub to produce a verifiable {@link KiltCredentialV1} which is anchored on the Kilt blockchain via an attestation.
   * The class instance keeps track of attestation-related data.
   * You can then add a proof about the successful attestation to the credential using `createProof`.
   *
   * @param input A partial {@link KiltCredentialV1} `credentialSubject` is required.
   * @param issuer The DID Document or, alternatively, the DID of the issuer.
   * @param submissionOptions Authorization and submission handlers, or alternatively signers, to be passed to {@link KiltAttestationProofV1.issue | issue} for authorizing the on-chain anchoring of the credential with the issuer's signature.
   *
   * @returns A copy of the input updated to fit the {@link KiltCredentialV1} and to align with the attestation record (concerns, e.g., the `issuanceDate` which is set to the block time at which the credential was anchored).
   */
  public async anchorCredential(
    input: CredentialStub,
    issuer: DidDocument | Did,
    submissionOptions: Parameters<typeof KiltAttestationProofV1.issue>['2']
  ): Promise<Omit<KiltCredentialV1.Interface, 'proof'>> {
    const { credentialSubject, type } = input

    let cType = type?.find((str): str is ICType['$id'] =>
      str.startsWith('kilt:ctype:')
    )
    if (!cType) {
      cType = credentialSubject['@context']['@vocab'].slice(
        0,
        -1
      ) as ICType['$id']
    } else {
      credentialSubject['@context']['@vocab'] = `${cType}#`
    }

    const credentialStub = {
      ...input,
      '@context': KiltCredentialV1.DEFAULT_CREDENTIAL_CONTEXTS,
      type: [...KiltCredentialV1.DEFAULT_CREDENTIAL_TYPES, cType],
      nonTransferable: true as const,
      credentialSubject,
      credentialSchema: {
        id: KiltCredentialV1.credentialSchema.$id as string,
        type: KiltCredentialV1.CREDENTIAL_SCHEMA_TYPE,
      } as const,
    }

    const { proof, ...credential } = await KiltAttestationProofV1.issue(
      credentialStub,
      issuer,
      submissionOptions
    )

    this.attestationInfo.set(credential.id, proof)
    return credential
  }
}
