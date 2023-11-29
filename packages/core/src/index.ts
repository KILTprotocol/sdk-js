/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @module @kiltprotocol/core
 */

export * as Attestation from './credentials/attestation/index.js'
export * from './credentials/V1/index.js'
export * as Presentation from './credentials/presentation/index.js'
export { BalanceUtils } from './balance/index.js'
export * as CType from './credentials/ctype/index.js'
export { DelegationNode, DelegationNodeUtils } from './delegation/index.js'
export * as DataIntegrity from './credentials/proofs/DataIntegrity.js'

export * as issuer from './credentials/issuer.js'
export * as holder from './credentials/holder.js'
export * as verifier from './credentials/verifier.js'

export { connect, disconnect, init } from './kilt/index.js'
export { SDKErrors } from '@kiltprotocol/utils'
