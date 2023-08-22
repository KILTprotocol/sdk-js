/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import '@polkadot/keyring' // TS needs this for the augmentation below

import type { HexString, KeyringPair, Prefix } from './Imported'

export interface KiltEncryptionKeypair {
  secretKey: Uint8Array
  publicKey: Uint8Array
  type: 'x25519'
}

export interface KiltKeyringPair extends KeyringPair {
  address: `4${string}`
  type: Exclude<KeyringPair['type'], 'ethereum'>
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
