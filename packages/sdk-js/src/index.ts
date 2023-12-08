/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @module @kiltprotocol/sdk-js
 */

import {
  ss58Format,
  Crypto as _Crypto,
  DataUtils,
  Signers,
  SDKErrors,
} from '@kiltprotocol/utils'

export { CType, Holder, Issuer, Verifier } from '@kiltprotocol/credentials'
export { ConfigService } from '@kiltprotocol/config'
export {
  Blockchain,
  BalanceUtils,
  connect,
  disconnect,
  init,
} from '@kiltprotocol/chain-helpers'
export * as Did from '@kiltprotocol/did'
export * from '@kiltprotocol/types'
const {
  encodeAddress,
  decodeAddress,
  makeKeypairFromSeed,
  makeKeypairFromUri,
  makeEncryptionKeypairFromSeed,
  mnemonicGenerate,
  mnemonicToMiniSecret,
  u8aToHex,
  coToUInt8,
  hash,
  hashStr,
} = _Crypto
const { isKiltAddress, isHex } = DataUtils

export const Address = {
  ss58Format,
  isKiltAddress,
  encodeAddress,
  decodeAddress,
}

export { SDKErrors }

export const Crypto = {
  Signers,
  makeKeypairFromSeed,
  makeEncryptionKeypairFromSeed,
  makeKeypairFromUri,
  mnemonicGenerate,
  mnemonicToMiniSecret,
  hash,
  hashStr,
  u8aToHex,
  toU8a: coToUInt8,
  isHex,
}
