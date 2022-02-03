// /**
//  * Copyright 2018-2021 BOTLabs GmbH.
//  *
//  * This source code is licensed under the BSD 4-Clause "Original" license
//  * found in the LICENSE file in the root directory of this source tree.
//  */

// import type { Extrinsic } from '@polkadot/types/interfaces'
// import { ApiPromise } from '@polkadot/api'

// import type { KeyRelationship } from '@kiltprotocol/types'
// import { SDKErrors } from '@kiltprotocol/utils'

// import { FullDidDetails } from '../DidDetails/FullDidDetails.js'
// import { getKeyRelationshipForExtrinsic } from '../DidDetails/FullDidDetails.utils.js'

// type BatchInfo = {
//   keyRelationship: KeyRelationship
//   extrinsics: Extrinsic[]
// }

// export class DidBatchBuilder {
//   protected did: FullDidDetails
//   protected api: ApiPromise

//   private batches: BatchInfo[] = []

//   public constructor(did: FullDidDetails, api: ApiPromise) {
//     this.did = did
//     this.api = api
//   }

//   public addExtrinsic(extrinsic: Extrinsic): DidBatchBuilder {
//     // Cannot batch utility extrinsics
//     if (extrinsic.method.section === 'utility') {
//       throw SDKErrors.ERROR_DID_ERROR(
//         'DidBatcher.addExtrinsic cannot be used to sign utility extrinsics.'
//       )
//     }

//     const extrinsicKeyRelationship = getKeyRelationshipForExtrinsic(extrinsic)
//     if (extrinsicKeyRelationship === 'paymentAccount') {
//       throw SDKErrors.ERROR_DID_ERROR(
//         `DidBatcher.addExtrinsic cannot batch operations that require a regular KILT account signature.`
//       )
//     }
//     const lastBatch: BatchInfo | undefined =
//       this.batches[this.batches.length - 1]

//     // If there was not previous batch, or the new extrinsic requires a different key, create and add a new batch.
//     if (!lastBatch || lastBatch.keyRelationship !== extrinsicKeyRelationship) {
//       this.batches.push({
//         keyRelationship: extrinsicKeyRelationship,
//         extrinsics: [extrinsic],
//       })
//       // Otherwise, add the extrinsic to the last batch
//     } else {
//       this.batches[this.batches.length - 1].extrinsics.push(extrinsic)
//     }

//     return this
//   }

//   public addExtrinsicsBatch(extrinsicsBatch: Extrinsic[]): DidBatchBuilder {
//     // Check if all extrinsics require the same key relationship and that the key relationship is not a simple KILT account.
//     const batchKeyRelationship = extrinsicsBatch.reduce(
//       (extRelationship: KeyRelationship | undefined, ext: Extrinsic) => {
//         const keyRelationship = getKeyRelationshipForExtrinsic(ext)
//         if (
//           extRelationship !== undefined &&
//           extRelationship !== keyRelationship
//         ) {
//           throw SDKErrors.ERROR_DID_ERROR(
//             `DidBatcher.addExtrinsicsBatch cannot contain extrinsics in the same batch that require different DID keys. Please split the batch into multiple ones that require the same key.`
//           )
//         }
//         if (keyRelationship === 'paymentAccount') {
//           throw SDKErrors.ERROR_DID_ERROR(
//             `DidBatcher.addExtrinsicsBatch cannot batch operations that require a regular KILT account signature.`
//           )
//         }
//         return keyRelationship
//       },
//       undefined
//     )

//     const lastBatch: BatchInfo | undefined =
//       this.batches[this.batches.length - 1]

//     // If there was not previous batch, or the new extrinsic requires a different key, create and add a new batch.
//     if (!lastBatch || lastBatch.keyRelationship !== batchKeyRelationship) {
//       this.batches.push({
//         keyRelationship: batchKeyRelationship as KeyRelationship,
//         extrinsics: extrinsicsBatch,
//       })
//       // Otherwise, extend the last batch with the new extrinsics
//     } else {
//       this.batches[this.batches.length - 1].extrinsics.push(...extrinsicsBatch)
//     }

//     return this
//   }
// }
