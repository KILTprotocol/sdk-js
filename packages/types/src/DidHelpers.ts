/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { Multikey } from '@kiltprotocol/utils'
import type { DidDocument } from './Did'
import type {
  ApiPromise,
  GenericEvent,
  HexString,
  KeyringPair,
  SubmittableResultValue,
} from './Imported'
import type {
  MultibaseKeyPair,
  MultibasePublicKey,
  SignerInterface,
  TransactionSigner,
} from './Signers'

export interface TransactionResult {
  status: 'confirmed' | 'failed' | 'rejected' | 'unknown'
  // these are getters that would throw if status is not as expected
  asConfirmed: {
    txHash: HexString
    signers: SignerInterface[]
    didDocument: DidDocument
    block: { hash: HexString; number: BigInt }
    events: GenericEvent[]
    toJSON: () => any
  }
  asFailed: {
    error: Error
    txHash: HexString
    signers: SignerInterface[]
    didDocument?: DidDocument
    block: { hash: HexString; number: BigInt }
    events: GenericEvent[]
    toJSON: () => any
  }
  asRejected: {
    error: Error
    txHash: HexString
    signers: SignerInterface[]
    didDocument?: DidDocument
  }
  asUnknown: {
    error: Error
    txHash: HexString
  }
  toJSON: () => any
}

export interface TransactionHandlers {
  /**
   * Submits a transaction for inclusion in a block, resulting in its execution in the blockchain runtime.
   *
   * @param options Options map to allow for named arguments.
   * @param options.awaitFinalized If set to true, this waits for finalization of the block of inclusion before returning.
   * @param options.didNonce Allows explicitly setting the nonce to be used in DID authorization.
   * @returns A Promise resolving to the DID document and info on the success of the transaction.
   */
  submit(options?: {
    awaitFinalized?: boolean // default: false
    didNonce?: number | BigInt
  }): Promise<TransactionResult>
  /**
   * Produces a transaction that can be submitted to a blockchain node for inclusion, or signed and submitted by an external service.
   *
   * @param options Options map to allow for named arguments.
   * @param options.signSubmittable If set to true, this signs the transaction with the submitterAccount, which covers transaction fees.
   * In this case, if no signer is available for this account, the function throws.
   * @param options.didNonce Allows explicitly setting the nonce to be used in DID authorization.
   * @returns A Promise resolving to an Extrinsic object (encoded transaction).
   */
  getSubmittable(options?: {
    signSubmittable?: boolean // default: true
    didNonce?: number | BigInt
  }): Promise<{
    txHex: HexString
    /**
     * Takes info on the submission/inclusion of the transaction and evaluates whether it executed successfully.
     *
     * @param result A combination of the final transaction hash (which changes upon signing!) and the hash of the block in which the transaction was included;
     * or constructor parameters for a {@link SubmittableResult}.
     * @returns An object informing on the status and success of the transaction.
     */
    checkResult(
      result:
        | { blockHash: HexString; txHash: HexString }
        | SubmittableResultValue
    ): Promise<TransactionResult>
  }>
}

export type DidHelpersAcceptedSigners =
  | SignerInterface
  | KeyringPair
  | MultibaseKeyPair

export type SharedArguments = {
  didDocument: DidDocument
  api: ApiPromise
  signers: DidHelpersAcceptedSigners[]
  submitter: KeyringPair | TransactionSigner
}

type PublicKeyAndType = {
  publicKey: Uint8Array
  type: Multikey.KnownTypeString
}

export type DidHelpersAcceptedPublicKeyEncodings =
  | MultibasePublicKey['publicKeyMultibase']
  | MultibasePublicKey
  | PublicKeyAndType // interface allows KeyringPair too
