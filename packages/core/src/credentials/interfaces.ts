/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { SignerInterface } from '@kiltprotocol/jcs-data-integrity-proofs-common'
import type { Did, DidDocument } from '@kiltprotocol/types'
import type { Proof, VerifiableCredential } from './V1/types'
import type { IssueOpts } from './V1/KiltAttestationProofV1'

export interface HolderOptions {
  did: Did
  didDocument?: DidDocument
  signers: SignerInterface[]
}

export type IssuerOptions = HolderOptions & IssueOpts

export interface CredentialStatusResult {
  verified: boolean
  error?: string[]
  status: string
}

export interface VerifyCredentialResult {
  verified: boolean
  error?: string[]
  proofResults: Array<{
    verified: boolean
    error?: string[]
    proof: Proof
  }>
  credential: VerifiableCredential
  statusResult?: CredentialStatusResult
}
