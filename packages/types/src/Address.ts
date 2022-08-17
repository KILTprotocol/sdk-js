/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { Prefix } from '@polkadot/util-crypto/address/types'
import type { HexString } from '@polkadot/util/types'
import '@polkadot/keyring' // TS needs this for the augmentation below
import type { KeyringPair } from './index.js'

export interface KiltKeyringPair extends KeyringPair {
  address: `4${string}`
}

/// A KILT-chain specific address, encoded with the KILT 38 network prefix.
export type KiltAddress = KiltKeyringPair['address']

declare module '@polkadot/keyring' {
  function encodeAddress(
    key: HexString | Uint8Array | string,
    ss58Format?: Prefix
  ): string
  function encodeAddress(
    key: HexString | Uint8Array | string,
    ss58Format?: 38
  ): KiltAddress
}
