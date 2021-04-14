/* eslint-disable class-methods-use-this */
import {
  DocumentLoader,
  ExpansionMap,
  purposes,
  suites,
} from 'jsonld-signatures'
import { JsonLdObj } from 'jsonld/jsonld-spec'
import jsonld from 'jsonld'
import {
  VerifiableCredential,
  DEFAULT_VERIFIABLECREDENTIAL_CONTEXT,
  Proof,
} from '../types'
import defaultDocumentLoader from './documentLoader'
import { KILT_CREDENTIAL_CONTEXT_URL } from './kiltContexts'

export default abstract class KiltAbstractSuite extends suites.LinkedDataProof {
  // vc-js complains when there is no verificationMethod
  public readonly verificationMethod = '<none>'

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
}
