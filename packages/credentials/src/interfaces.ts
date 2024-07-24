/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { Extrinsic } from '@polkadot/types/interfaces'

import type {
  DidDocument,
  DidHelpersAcceptedSigners,
  HexString,
  KiltAddress,
  SharedArguments,
  TransactionResult,
} from '@kiltprotocol/types'

import type { Proof, VerifiableCredential } from './V1/types'

export type SecuredDocument = { proof: Proof[] | Proof }

export interface HolderOptions {
  didDocument: DidDocument
  signers: DidHelpersAcceptedSigners[]
}

export interface SimplifiedTransactionResult {
  block: { hash: HexString }
}

export type SubmitOverride = (
  args: Pick<SharedArguments, 'didDocument' | 'api' | 'signers'> & {
    call: Extrinsic
  }
) => Promise<SimplifiedTransactionResult | TransactionResult>

interface SubmitterAddressOrOverride {
  submitter: KiltAddress | SubmitOverride
}

export type IssuerOptions = HolderOptions & SubmitterAddressOrOverride

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
