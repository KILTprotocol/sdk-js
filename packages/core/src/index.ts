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

export { Attestation, AttestationUtils } from './attestation/index.js'
export { Credential, CredentialUtils } from './credential/index.js'
export { Balance, BalanceUtils } from './balance/index.js'
export { Claim, ClaimUtils } from './claim/index.js'
export { CType, CTypeMetadata, CTypeSchema, CTypeUtils } from './ctype/index.js'
export { DelegationNode, DelegationNodeUtils } from './delegation/index.js'
export { Quote, QuoteSchema, QuoteUtils } from './quote/index.js'
export {
  RequestForAttestation,
  RequestForAttestationUtils,
} from './requestforattestation/index.js'

export { connect, disconnect, config, init } from './kilt/index.js'
export { SDKErrors } from '@kiltprotocol/utils'
