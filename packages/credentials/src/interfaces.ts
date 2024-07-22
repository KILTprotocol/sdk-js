/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type {
  Base58BtcMultibaseString,
  DidDocument,
  KeyringPair,
  SignerInterface,
} from '@kiltprotocol/types'

import type { IssueOpts } from './V1/KiltAttestationProofV1'
import type { Proof, VerifiableCredential } from './V1/types'

export type SecuredDocument = { proof: Proof[] | Proof }

export interface HolderOptions {
  didDocument: DidDocument
  signers: Array<
    | SignerInterface
    | KeyringPair
    | {
        secretKeyMultibase: Base58BtcMultibaseString
        publicKeyMultibase: Base58BtcMultibaseString
      }
  >
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
