/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

export type SignerInterface<
  Alg extends string = string,
  Id extends string = string
> = {
  algorithm: Alg
  id: Id
  sign: (input: { data: Uint8Array }) => Promise<Uint8Array>
}
