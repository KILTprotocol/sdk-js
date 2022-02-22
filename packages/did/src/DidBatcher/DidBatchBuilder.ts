/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { Extrinsic } from '@polkadot/types/interfaces'
import { ApiPromise } from '@polkadot/api'

import { BN } from '@polkadot/util'
import type {
  DidVerificationKey,
  IIdentity,
  KeystoreSigner,
  SubmittableExtrinsic,
  VerificationKeyRelationship,
} from '@kiltprotocol/types'
import { SDKErrors } from '@kiltprotocol/utils'

import { FullDidDetails } from '../DidDetails/FullDidDetails.js'
import { increaseNonce } from '../DidDetails/FullDidDetails.utils.js'

import { generateDidAuthenticatedTx } from '../Did.chain.js'
import { getSigningAlgorithmForVerificationKeyType } from '../Did.utils.js'

import { checkExtrinsicInput } from './DidBatchBuilder.utils.js'

type BatchInfo = {
  keyRelationship: VerificationKeyRelationship
  extrinsics: Extrinsic[]
}

/**
 * Type of a closure used to select one of the key candidates for a DID to sign a given batch of extrinsics.
 */
export type BatchSigningKeySelection = (
  batch: Extrinsic[],
  keys: DidVerificationKey[]
) => Promise<DidVerificationKey>
/**
 * The default signing key selection closure which returns the first key in the list of key candidates.
 *
 * @param batch The batch of extrinsics to sign. All extrinsics are guaranteed to require the same signing key relationship.
 * @param keys The list of key candidates that match the required key relationship for the given extrinsic batch.
 *
 * @returns The selected key among the list of key candidates. If the returned key is not in the input list of candidates, the signing operation or the extrinsic submission will most likely fail.
 */
export const defaultBatchSigningKeySelectionClosure: BatchSigningKeySelection =
  (batch: Extrinsic[], keys: DidVerificationKey[]) => Promise.resolve(keys[0])

/**
 * A builder to batch multiple DID-authorised extrinsics which are to be submitted by the same KILT account.
 */
export class DidBatchBuilder {
  protected did: FullDidDetails
  protected api: ApiPromise

  protected batches: BatchInfo[] = []
  protected isConsumed = false

  /**
   * Create a new builder with the provided WS connection and [[FullDidDetails]].
   *
   * @param api The [[ApiPromise]] wrapping the WS connection to a KILT RPC node.
   * @param did The [[FullDidDetails]] used to fetch the key material needed to authorise the batched operations.
   */
  public constructor(api: ApiPromise, did: FullDidDetails) {
    this.did = did
    this.api = api
  }

  private pushNewExtrinsic(
    ext: Extrinsic,
    keyRelationship: VerificationKeyRelationship
  ): void {
    const lastBatch: BatchInfo | undefined =
      this.batches[this.batches.length - 1]

    // If there was not previous batch, or the new extrinsic requires a different key, create and add a new batch.
    if (!lastBatch || lastBatch.keyRelationship !== keyRelationship) {
      this.batches.push({
        keyRelationship,
        extrinsics: [ext],
      })
      // Otherwise, add the extrinsic to the last batch
    } else {
      this.batches[this.batches.length - 1].extrinsics.push(ext)
    }
  }

  /**
   * Add a new extrinsic to the batch.
   *
   * If the new extrinsic requires a different key type than the previous one, a new batch is created internally.
   * Order of all extrinsics is maintained throughtout the lifetime of the builder and when they are submitted to the KILT blockchain.
   *
   * The requirements to add a new extrinsic to the batch are the following:
   * - The extrinsic must not be a DID management extrinsic. For those, [[FullDidCreationBuilder]] and [[FullDidUpdateBuilder]] must be used
   * - The extrinsic must require a DID origin. E.g., staking extrinsics that require a simple KILT account origin cannot be added to the batch
   * - The DID must have at least one key candidate to sign the provided extrinsic. If the DID is updated after the extrinsic is added but before the builder is consumed, it results in undefined behaviour, and most likely the extrinsic submission will fail.
   *
   * @param extrinsic The [[Extrinsic]] to add to the batch.
   * @returns The builder containing the new extrinsic in the last position of the internal queue.
   */
  public addSingleExtrinsic(extrinsic: Extrinsic): this {
    if (this.isConsumed) {
      throw SDKErrors.ERROR_DID_BUILDER_ERROR(
        'DID batcher has already been consumed.'
      )
    }

    const keyRelationship = checkExtrinsicInput(extrinsic, this.did)
    this.pushNewExtrinsic(extrinsic, keyRelationship)

    return this
  }

  /**
   * Add multiple extrinsics to the batch.
   *
   * The order of the extrinsics is maintained in respect to how they are provided in the function.
   * All extrinsics are appended to the internal queue, so that the first in the provided list is added after the last in the builder's queue.
   *
   * @param extrinsics The list of [[Extrinsic]] to add to the batch.
   * @returns The builder containing the new extrinsics.
   */
  /* istanbul ignore next */
  public addMultipleExtrinsics(extrinsics: Extrinsic[]): this {
    extrinsics.forEach((ext) => {
      this.addSingleExtrinsic(ext)
    })

    return this
  }

  /**
   * Consume the builder and generate the [[SubmittableExtrinsic]] containing the batch of extrinsics to execute, in the order they were added to the builder.
   *
   * @param signer The [[KeystoreSigner]] to sign the DID operation. It must contain the required keys to sign each batch.
   * @param submitter The KILT address of the user authorised to submit each extrinsic in the batch.
   * @param submissionOptions The additional options to customise the signing operation.
   * @param submissionOptions.atomic A flag indicating whether the whole batch must be reverted (true) or not (false) in case any extrinsic in the batch fails. It defaults to true.
   * @param submissionOptions.keySelection The [[BatchSigningKeySelection]] closure to specify the DID key to use for each batch. It defaults to [[defaultBatchSigningKeySelectionClosure]].
   * @param submissionOptions.initialNonce The initial nonce to use for the first batch, after which the nonce is increased by the builder. It defaults to the next valid DID nonce as stored on chain at the time this function is called.
   *
   * @returns The [[SubmittableExtrinsic]] containing the batch of batches.
   */
  // TODO: Remove ignore when we can test the consume function
  /* istanbul ignore next */
  public async consume(
    signer: KeystoreSigner,
    submitter: IIdentity['address'],
    {
      atomic = true,
      keySelection = defaultBatchSigningKeySelectionClosure,
      initialNonce,
    }: {
      atomic?: boolean
      keySelection?: BatchSigningKeySelection
      initialNonce?: BN
    } = {}
  ): Promise<SubmittableExtrinsic> {
    if (this.isConsumed) {
      throw SDKErrors.ERROR_DID_BUILDER_ERROR(
        'DID batcher has already been consumed.'
      )
    }

    const nonce = initialNonce || (await this.did.getNextNonce())
    const batchFunction = atomic
      ? this.api.tx.utility.batchAll
      : this.api.tx.utility.batch

    const batchesLength = this.batches.length

    if (!batchesLength) {
      throw SDKErrors.ERROR_DID_BUILDER_ERROR(
        'Builder was empty, hence it cannot be consumed.'
      )
    }

    const signedBatches: SubmittableExtrinsic[] = await Promise.all(
      this.batches.map(async (batch, index) => {
        // Don't create a new batch if the batch contains only one extrinsic
        const processedBatch =
          batch.extrinsics.length > 1
            ? batchFunction(batch.extrinsics)
            : batch.extrinsics[0]
        const signingKey = await keySelection(
          batch.extrinsics,
          this.did.getVerificationKeys(batch.keyRelationship)
        )
        // For index = 0, nonce = next valid nonce (currently stored on chain + 1).
        const batchNonce = increaseNonce(nonce, index)
        return generateDidAuthenticatedTx({
          didIdentifier: this.did.identifier,
          signingPublicKey: signingKey.publicKey,
          alg: getSigningAlgorithmForVerificationKeyType(signingKey.type),
          signer,
          call: processedBatch,
          txCounter: batchNonce,
          submitter,
        })
      })
    )

    this.isConsumed = true

    return signedBatches.length > 1
      ? batchFunction(signedBatches)
      : signedBatches[0]
  }
}
