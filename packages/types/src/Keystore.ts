/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { SignerPayloadJSON } from '@polkadot/types/types'

export interface RequestData<A extends string> {
  alg: A
  keyId: string // id of the key to use
  data: Uint8Array // data to sign / encrypt / decrypt
}

export interface ResponseData<A extends string> {
  alg: A
  data: Uint8Array
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
  getKeyIds?(): Promise<string[]>
  // OR if above is deemed to reveal too much:
  hasKeys(keyIds: string[]): Promise<boolean[]>
}

export type KeystoreSigner<A extends string = string> = Pick<
  Keystore<A>,
  'sign'
>

export interface KeystoreSigningOptions<A extends string = string> {
  signer: KeystoreSigner<A>
  signingKeyId: string
  alg: A
}
