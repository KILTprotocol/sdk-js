/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/* eslint-disable class-methods-use-this */
import {
  DocumentLoader,
  ExpansionMap,
  purposes,
  suites,
} from 'jsonld-signatures'
import type { JsonLdObj } from 'jsonld/jsonld-spec'
import jsonld from 'jsonld'
import type {
  VerifiableCredential,
  Proof,
  IPublicKeyRecord,
} from '../../types.js'
import { documentLoader as defaultDocumentLoader } from '../documentLoader.js'
import {
  KILT_CREDENTIAL_CONTEXT_URL,
  DEFAULT_VERIFIABLECREDENTIAL_CONTEXT,
} from '../../constants.js'

export abstract class KiltAbstractSuite extends suites.LinkedDataProof {
  public readonly verificationMethod?: string | IPublicKeyRecord

  constructor({
    type,
    verificationMethod,
  }: {
    type: string
    verificationMethod?: string | IPublicKeyRecord
  }) {
    super({ type })
    this.verificationMethod = verificationMethod
  }

  protected async compactProof<ProofType extends Proof>(
    proof: JsonLdObj,
    options: {
      documentLoader?: DocumentLoader
      expansionMap?: ExpansionMap
      [key: string]: unknown
    }
  ): Promise<ProofType> {
    const { documentLoader = defaultDocumentLoader, expansionMap } = options
    return jsonld.compact(proof, KILT_CREDENTIAL_CONTEXT_URL, {
      documentLoader,
      expansionMap,
      compactToRelative: false,
    }) as Promise<ProofType>
  }

  protected async compactDoc(
    document: JsonLdObj,
    options: {
      documentLoader?: DocumentLoader
      expansionMap?: ExpansionMap
      [key: string]: unknown
    }
  ): Promise<VerifiableCredential> {
    const { documentLoader = defaultDocumentLoader, expansionMap } = options
    return jsonld.compact(
      document,
      [DEFAULT_VERIFIABLECREDENTIAL_CONTEXT, KILT_CREDENTIAL_CONTEXT_URL],
      { documentLoader, expansionMap, compactToRelative: false }
    ) as Promise<VerifiableCredential>
  }

  /**
   * @inheritdoc
   */
  public async matchProof(options: {
    proof: JsonLdObj
    document?: JsonLdObj
    purpose?: purposes.ProofPurpose
    documentLoader?: DocumentLoader
    expansionMap?: ExpansionMap
  }): Promise<boolean> {
    const { proof } = options
    const compact = await this.compactProof(proof, options)
    const type = compact['@type'] || compact.type
    return type instanceof Array ? type.includes(this.type) : type === this.type
  }

  /**
   * @inheritdoc
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async createProof(options: {
    document: JsonLdObj
    purpose?: purposes.ProofPurpose
    documentLoader?: DocumentLoader
    expansionMap?: ExpansionMap
  }): Promise<never> {
    throw new Error(
      'Credential issuance through vc-js is not supported. For credential issuance, use @kiltprotocol/sdk-js and export your KILT credential to a VC representation using @kiltprotocol/vc-export'
    )
  }
}
