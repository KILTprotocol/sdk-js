/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type {
  CTypeHash,
  IDelegationNode,
  INewPublicCredential,
  IPublicCredential,
} from '@kiltprotocol/types'
import type { Option } from '@polkadot/types'
import type {
  DidDidDetailsDidAuthorizedCallOperation,
  PublicCredentialsCredentialsCredentialEntry,
} from '@kiltprotocol/augment-api'

import { encode as cborEncode } from 'cbor'

import { u8aToHex } from '@polkadot/util'
import { HexString } from '@polkadot/util/types'
import { ConfigService } from '@kiltprotocol/config'

export type EncodedPublicCredential = {
  ctypeHash: CTypeHash
  // TODO: Replace with an asset DID
  subject: string
  claims: HexString
  authorization: IDelegationNode['id'] | null
}

// TODO: Add integrity checks (e.g., that the claims conform to the specified CType, that the asset DID is correct, unless verified in the INewPublicCredential)
/**
 * @param publicCredential
 */
export function toChain(
  publicCredential: INewPublicCredential
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

// FIXME: I did not get the derives to work properly.
/**
 * @param publicCredentialEntry
 */
export async function fromChain(
  publicCredentialEntry: Option<PublicCredentialsCredentialsCredentialEntry>
): Promise<IPublicCredential | null> {
  const api = ConfigService.get('api')

  const { blockNumber } = publicCredentialEntry.unwrap()
  const { extrinsics } = await api.derive.chain.getBlockByNumber(blockNumber)

  // @ts-ignore
  const publicCredentialCreations = extrinsics.filter(
    ({ extrinsic, events }) => {
      if (
        extrinsic.method.section !== 'did' ||
        extrinsic.method.method !== 'submitDidCall'
        // (extrinsic.args as any).did_call === undefined
      ) {
        console.log(`Nope: ${extrinsic.method.section} ${extrinsic.method.method}`)
        return false
      }
      const didProxyExtrinsic = (extrinsic.args as any)
        .did_call as DidDidDetailsDidAuthorizedCallOperation
      if (
        didProxyExtrinsic.call.section !== 'publicCredentials' ||
        didProxyExtrinsic.call.method !== 'add'
      ) {
        console.log(`Nope 2: ${didProxyExtrinsic.call.section} ${didProxyExtrinsic.call.method}`)
        return false
      }
      const publicCredentialCreationCall = api.findCall(didProxyExtrinsic.call.toHex())
      console.log(publicCredentialCreationCall.toHuman())
      return true
    }
  )
  return null
}
