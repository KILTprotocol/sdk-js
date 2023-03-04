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
import { verifyProof } from '../../KiltAttestationProofV1.js'
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

  constructor({ api }: { api: ApiPromise }) {
    super({ type: ATTESTATION_PROOF_V1_TYPE })
    this.api = api
  }

  /**
   * @param args
   * @param args.credential
   */
  public async checkStatus({
    credential,
  }: {
    credential: VerifiableCredential
  }): Promise<{ verified: boolean; error?: unknown }> {
    return checkStatus(this.api, credential.credentialStatus, credential)
      .then(() => ({ verified: true }))
      .catch((error) => ({ verified: false, error }))
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
        verificationMethod: {
          id: document.credentialStatus.id,
          type: 'KiltAttestationRecord',
          controller: document.issuer,
        },
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
  public async createProof({}: {
    document: object
    purpose?: jsigs.purposes.ProofPurpose
    documentLoader?: jsigs.DocumentLoader
    expansionMap?: jsigs.ExpansionMap
  }): Promise<KiltAttestationProofV1> {
    // eslint-disable-next-line class-methods-use-this
    throw new Error(
      'Credential issuance through vc-js is not supported. For credential issuance, use @kiltprotocol/sdk-js and export your KILT credential to a VC representation using @kiltprotocol/vc-export'
    )
  }
}
