/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @module @kiltprotocol/core
 */

import '@polkadot/api-augment'

export * as Attestation from './attestation/index.js'
export * as Credential from './requestforattestation/index.js'
export { Balance, BalanceUtils } from './balance/index.js'
export * as Claim from './claim/index.js'
export * as CType from './ctype/index.js'
export { DelegationNode, DelegationNodeUtils } from './delegation/index.js'
export * as Quote from './quote/index.js'

export { connect, disconnect, config, init } from './kilt/index.js'
export { SDKErrors } from '@kiltprotocol/utils'
