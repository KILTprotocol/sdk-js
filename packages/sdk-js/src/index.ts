/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @module @kiltprotocol/sdk-js
 */

import { Holder, Issuer, Verifier } from '@kiltprotocol/credentials'
import { ConfigService } from '@kiltprotocol/config'
import { Signers } from '@kiltprotocol/utils'
import {
  connect,
  disconnect,
  init,
  Blockchain,
} from '@kiltprotocol/chain-helpers'
import { resolver as DidResolver } from '@kiltprotocol/did'

const { signAndSubmitTx } = Blockchain // TODO: maybe we don't even need that if we have the identity class
const { signerFromKeypair } = Signers

export {
  init,
  connect,
  disconnect,
  DidResolver,
  Holder,
  Verifier,
  Issuer,
  signerFromKeypair,
  signAndSubmitTx,
  ConfigService,
}
