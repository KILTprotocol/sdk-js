/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

export type SignerInterface = {
  algorithm: string
  id: string
  sign: (input: { data: Uint8Array }) => Promise<Uint8Array>
}
