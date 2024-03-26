/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { SignerInterface } from '@kiltprotocol/jcs-data-integrity-proofs-common'
import type { Did, DidDocument } from '@kiltprotocol/types'
import type { Proof, VerifiableCredential } from './V1/types'
import type { IssueOpts } from './V1/KiltAttestationProofV1'

export type SecuredDocument = { proof: Proof[] | Proof }

export interface HolderOptions {
  did: Did
  didDocument?: DidDocument
  signers: SignerInterface[]
}

export type IssuerOptions = HolderOptions & IssueOpts

export interface VerificationResult {
  verified: boolean
  error?: Error[]
}

export interface CredentialStatusResult extends VerificationResult {
  status?: string
}

interface ProofSetResult extends VerificationResult {
  proofResults?: Array<VerificationResult & { proof: Proof }>
}

export interface VerifyCredentialResult extends ProofSetResult {
  statusResult?: CredentialStatusResult
}

export interface VerifyPresentationResult extends ProofSetResult {
  credentialResults?: Array<
    VerifyCredentialResult & {
      credential: VerifiableCredential
    }
  >
}
