/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @module @kiltprotocol/types
 */

import '@polkadot/api-augment'

export type { ISubmittableResult } from '@polkadot/types/types'
export type { SubmittableExtrinsic } from '@polkadot/api/promise/types'
export type { KeyringPair } from '@polkadot/keyring/types'

export * as SubscriptionPromise from './SubscriptionPromise.js'

export * from './Credential.js'
export * from './Attestation.js'
export * from './Balance.js'
export * from './CType.js'
export * from './CTypeMetadata.js'
export * from './Claim.js'
export * from './Deposit.js'
export * from './Delegation.js'
export * from './Identity.js'
export * from './Message.js'
export * from './Quote.js'
export * from './RequestForAttestation.js'
export * from './Terms.js'
export * from './Blockchain.js'
export * from './DidDetails.js'
export * from './Keystore.js'
export * from './DidResolver.js'
export * from './DidDocumentExporter.js'
