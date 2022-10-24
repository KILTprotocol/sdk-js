/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type {
  CTypeHash,
  IDelegationNode,
  IPublicCredential,
} from '@kiltprotocol/types'

import { encode as cborEncode } from 'cbor'

export type EncodedPublicCredential = {
  ctypeHash: CTypeHash
  subject: string
  claims: Uint8Array
  authorization: IDelegationNode['id'] | null
}

export function toChain(
  publicCredential: Omit<IPublicCredential, 'id'>
): EncodedPublicCredential {
  const { cTypeHash, subject, claims, delegationId } = publicCredential

  const cborSerializedClaims = Uint8Array.from(cborEncode(claims))

  return {
    ctypeHash: cTypeHash,
    subject,
    claims: cborSerializedClaims,
    authorization: delegationId,
  }
}
