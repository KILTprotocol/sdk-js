/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { SignerPayloadJSON } from '@polkadot/types/types'

export interface RequestData<A extends string> {
  alg: A
  publicKey: Uint8Array // alternatively, public key from the keypair to use
  data: Uint8Array // data to sign / encrypt / decrypt
  [x: string]: unknown
}

export interface ResponseData<A extends string> {
  alg: A
  data: Uint8Array
  [x: string]: unknown
}

export interface KeystoreSigningData<A extends string> extends RequestData<A> {
  meta?: Partial<SignerPayloadJSON> // info for extensions to display to user
}

export interface Keystore<
  SignAlgs extends string = string,
  EncryptAlgs extends string = string
> {
  supportedAlgs(): Promise<Set<SignAlgs | EncryptAlgs>>
  sign<A extends SignAlgs>(
    signData: KeystoreSigningData<A>
  ): Promise<ResponseData<A>>
  encrypt<A extends EncryptAlgs>(
    requestData: RequestData<A>
  ): Promise<ResponseData<A>>
  decrypt<A extends EncryptAlgs>(
    requestData: RequestData<A>
  ): Promise<ResponseData<A>>
  getKeys?(): Promise<Uint8Array[]>
  // OR if above is deemed to reveal too much:
  hasKeys(keyIds: Uint8Array[]): Promise<boolean[]>
}

export type KeystoreSigner<A extends string = any> = Pick<Keystore<A>, 'sign'>

export interface KeystoreSigningOptions<A extends string = string> {
  signer: KeystoreSigner<A>
  signingPublicKey: string | Uint8Array
  alg: A
}
