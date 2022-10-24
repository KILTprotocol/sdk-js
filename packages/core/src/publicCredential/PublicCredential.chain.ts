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
import { u8aToHex } from '@polkadot/util'
import { HexString } from '@polkadot/util/types'

import { encode as cborEncode } from 'cbor'

export type EncodedPublicCredential = {
  ctypeHash: CTypeHash
  // TODO: Replace with an asset DID
  subject: string
  claims: HexString
  authorization: IDelegationNode['id'] | null
}

// TODO: Add integrity checks (e.g., that the claims conform to the specified CType)
export function toChain(
  publicCredential: Omit<IPublicCredential, 'id'>
): EncodedPublicCredential {
  const { cTypeHash, claims, subject, delegationId } = publicCredential

  const cborSerializedClaims = cborEncode(claims)

  return {
    ctypeHash: cTypeHash,
    subject,
    // FIXME: Using Uint8Array directly fails to encode and decode, somehow
    claims: u8aToHex(new Uint8Array(cborSerializedClaims)),
    authorization: delegationId,
  }
}
