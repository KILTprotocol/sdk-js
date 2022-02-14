/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { Extrinsic } from '@polkadot/types/interfaces'
import { ApiPromise } from '@polkadot/api'

import type {
  DidVerificationKey,
  IIdentity,
  KeyRelationship,
  KeystoreSigner,
  SubmittableExtrinsic,
} from '@kiltprotocol/types'
import { SDKErrors } from '@kiltprotocol/utils'

import { FullDidDetails } from '../DidDetails/FullDidDetails.js'
import { increaseNonce } from '../DidDetails/FullDidDetails.utils.js'

import { generateDidAuthenticatedTx } from '../Did.chain.js'
import { getSignatureAlgForKeyType } from '../Did.utils.js'

import { checkExtrinsicInput } from './DidBatchBuilder.utils.js'

type BatchInfo = {
  keyRelationship: KeyRelationship
  extrinsics: Extrinsic[]
}

export type BatchSigningKeySelection = (
  batch: Extrinsic[],
  keys: DidVerificationKey[]
) => Promise<DidVerificationKey>
export const defaultBatchSigningKeySelectionClosure: BatchSigningKeySelection =
  (batch: Extrinsic[], keys: DidVerificationKey[]) => Promise.resolve(keys[0])

export class DidBatchBuilder {
  protected did: FullDidDetails
  protected api: ApiPromise
  protected batches: BatchInfo[] = []
  protected isConsumed = false

  public constructor(api: ApiPromise, did: FullDidDetails) {
    this.did = did
    this.api = api
  }

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

  private pushNewExtrinsic(
    ext: Extrinsic,
    keyRelationship: KeyRelationship
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

  public addMultipleExtrinsics(extrinsics: Extrinsic[]): this {
    extrinsics.forEach((ext) => {
      this.addSingleExtrinsic(ext)
    })

    return this
  }

  public async consume(
    signer: KeystoreSigner,
    submitter: IIdentity['address'],
    {
      atomic = true,
      keySelection = defaultBatchSigningKeySelectionClosure,
    }: {
      atomic?: boolean
      keySelection?: BatchSigningKeySelection
    } = {}
  ): Promise<SubmittableExtrinsic> {
    const nonce = await this.did.getNextNonce()

    const signedBatches: Extrinsic[] = await Promise.all(
      this.batches.map(async (batch, index) => {
        const processedBatch = atomic
          ? this.api.tx.utility.batchAll(batch.extrinsics)
          : this.api.tx.utility.batch(batch.extrinsics)
        const signingKey = await keySelection(
          batch.extrinsics,
          this.did.getKeys(batch.keyRelationship) as DidVerificationKey[]
        )
        // For index = 0, nonce = next valid nonce (currently stored on chain + 1).
        const batchNonce = increaseNonce(nonce, index)
        return generateDidAuthenticatedTx({
          didIdentifier: this.did.identifier,
          signingPublicKey: signingKey.publicKey,
          alg: getSignatureAlgForKeyType(signingKey.type),
          signer,
          call: processedBatch,
          txCounter: batchNonce,
          submitter,
        })
      })
    )

    this.isConsumed = true

    return atomic
      ? this.api.tx.utility.batchAll(signedBatches)
      : this.api.tx.utility.batch(signedBatches)
  }
}
