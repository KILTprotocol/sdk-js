/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { KiltAddress } from './Address'
import type { Base58BtcMultibaseString, VerificationMethod } from './Did.js'

export type SignerInterface<
  Alg extends string = string,
  Id extends string = string
> = {
  algorithm: Alg
  id: Id
  sign: (input: { data: Uint8Array }) => Promise<Uint8Array>
}

export type TransactionSigner = SignerInterface<
  'Ecrecover-Secp256k1-Blake2b' | 'Sr25519' | 'Ed25519',
  KiltAddress
>

export type MultibasePublicKey = Pick<VerificationMethod, 'publicKeyMultibase'>
export type MultibaseSecretKey = {
  secretKeyMultibase: Base58BtcMultibaseString
}
export type MultibaseKeyPair = MultibasePublicKey & MultibaseSecretKey
