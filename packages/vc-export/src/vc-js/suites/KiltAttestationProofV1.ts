/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/* eslint-disable class-methods-use-this */
/* eslint-disable no-empty-pattern */

import type { Signer } from '@polkadot/types/types'

// @ts-expect-error not a typescript module
import jsigs from 'jsonld-signatures' // cjs module

import { Blockchain } from '@kiltprotocol/chain-helpers'
import { ConfigService } from '@kiltprotocol/config'
import { CType } from '@kiltprotocol/core'
import type {
  DidUri,
  ICType,
  KiltAddress,
  SignExtrinsicCallback,
} from '@kiltprotocol/types'

import { chainIdFromGenesis } from '../../CAIP/caip2.js'
import {
  AttestationHandler,
  issue,
  verify as verifyProof,
} from '../../KiltAttestationProofV1.js'
import type { CTypeLoader } from '../../KiltCredentialV1.js'
import {
  fromInput as credentialFromInput,
  validateStructure as validateCredentialStructure,
} from '../../KiltCredentialV1.js'
import { check as checkStatus } from '../../KiltRevocationStatusV1.js'
import {
  ATTESTATION_PROOF_V1_TYPE,
  KILT_CREDENTIAL_CONTEXT_URL,
} from '../../constants.js'
import type {
  KiltAttestationProofV1,
  KiltCredentialV1,
  Proof,
} from '../../types.js'
import type { DocumentLoader, JsonLdObj } from '../documentLoader.js'
import type { JSigsVerificationResult } from './types.js'
import { includesContext } from './utils.js'

const {
  suites: { LinkedDataProof },
} = jsigs

interface CallArgs {
  proof: Proof
  document?: JsonLdObj
  documentLoader?: DocumentLoader
  [key: string]: unknown
}

export type CredentialStub = Pick<KiltCredentialV1, 'credentialSubject'> &
  Partial<KiltCredentialV1>

export interface DidSigner {
  did: DidUri
  signer: SignExtrinsicCallback
}

export type TxHandler = {
  account: KiltAddress
  signAndSubmit?: AttestationHandler
  signer?: Signer
}

function makeDefaultTxSubmit(
  transactionHandler: TxHandler
): AttestationHandler {
  return async (tx, api) => {
    const signed = await api.tx(tx).signAsync(transactionHandler.account, {
      signer: transactionHandler.signer,
    })
    const result = await Blockchain.submitSignedTx(signed, {
      resolveOn: Blockchain.IS_FINALIZED,
    })
    const blockHash = result.status.asFinalized
    return { blockHash }
  }
}

export class KiltAttestationV1Suite extends LinkedDataProof {
  private ctypes: ICType[]
  private didSigner?: DidSigner
  private transactionHandler?: TxHandler &
    Required<Pick<TxHandler, 'signAndSubmit'>>

  private attestationInfo = new Map<
    KiltCredentialV1['id'],
    KiltAttestationProofV1
  >()

  public readonly contextUrl = KILT_CREDENTIAL_CONTEXT_URL
  // eslint-disable-next-line jsdoc/require-returns
  /**
   * Placeholder value as \@digitalbazaar/vc requires a verificationMethod property on issuance.
   */
  public get verificationMethod(): string {
    return chainIdFromGenesis(ConfigService.get('api').genesisHash)
  }

  constructor({
    ctypes = [],
    transactionHandler,
    didSigner,
  }: {
    ctypes?: ICType[]
    transactionHandler?: TxHandler
    didSigner?: DidSigner
  } = {}) {
    super({ type: ATTESTATION_PROOF_V1_TYPE })
    this.ctypes = ctypes
    this.didSigner = didSigner
    if (transactionHandler) {
      this.transactionHandler = {
        ...transactionHandler,
        signAndSubmit:
          transactionHandler.signAndSubmit ??
          makeDefaultTxSubmit(transactionHandler),
      }
    }
  }

  // eslint-disable-next-line jsdoc/require-returns
  /**
   * A function to check the revocation status of KiltAttestationV1 proofs, which is tied to the [[KiltRevocationStatusV1]] method.
   */
  public get checkStatus(): (args: {
    credential: KiltCredentialV1
  }) => Promise<{ verified: boolean; error?: unknown }> {
    return async ({ credential }) => {
      return checkStatus(credential)
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
   * Adds a proof to a [[KiltCredentialV1]] type document.
   *
   * ! __This will fail unless the document has been created with `anchorCredential` by the same class instance prior to calling `createProof`__ !
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
    const credential = document as KiltCredentialV1
    validateCredentialStructure(credential)
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
   * Processes a [[KiltCredentialV1]] stub to produce a verifiable [[KiltCredentialV1]], which is anchored on the Kilt blockchain via an attestation.
   * The class instance keeps track of attestation-related data.
   * You can then add a proof about the successful attestation to the credential using `createProof`.
   *
   * @param input A partial [[KiltCredentialV1]]; `credentialSubject` is required.
   *
   * @returns A copy of the input updated to fit the [[KiltCredentialV1]] and to align with the attestation record (concerns, e.g., the `issuanceDate` which is set to the block time at which the credential was anchored).
   */
  public async anchorCredential(
    input: CredentialStub
  ): Promise<Omit<KiltCredentialV1, 'proof'>> {
    if (!this.transactionHandler || !this.didSigner) {
      throw new Error(
        'suite must be configured with a transactionHandler & didSigner for proof generation'
      )
    }
    const {
      credentialSubject: {
        id: subject,
        '@context': { '@vocab': vocab },
        ...claims
      },
      type,
    } = input
    const cType = (type?.find((str) => str.startsWith('kilt:ctype:')) ??
      vocab.slice(0, -1)) as ICType['$id']

    const credentialStub = credentialFromInput({
      subject,
      claims,
      cType,
      issuer: this.didSigner.did,
    })

    const { proof, ...credential } = await issue(credentialStub, {
      did: this.didSigner.did,
      didSigner: this.didSigner.signer,
      submitterAddress: this.transactionHandler.account,
      txSubmissionHandler: this.transactionHandler.signAndSubmit,
    })

    this.attestationInfo.set(credential.id, proof)
    return credential
  }
}
