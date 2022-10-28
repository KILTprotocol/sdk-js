/* eslint-disable prettier/prettier */
/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { ApiPromise } from '@polkadot/api'
import type {
  CTypeHash,
  IDelegationNode,
  INewPublicCredential,
  IPublicCredential,
} from '@kiltprotocol/types'
import type { GenericCall, Option } from '@polkadot/types'
import type { Call } from '@polkadot/types/interfaces'
import type {
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

function extractCallsFromBatch(api: ApiPromise, call: Call, {
  section,
  method,
}: {
  section: string
  method?: string
}): Call[] {
  // Base recursive case
  if (call.section !== 'utility' || !['batch', 'batchAll', 'forceBatch'].includes(call.method)) {
    return []
  }

  const batchCall = call as GenericCall<typeof api.tx.utility.batch.args>
  const calls = batch
  // return batchCall.args[0].reduce((acc, call) => acc.concat(extractCallsFromBatch(api, call)), [])
  // return  extractCallsFromBatch(api, batch)
}

// FIXME: I did not get the derives to work properly.
/**
 * @param credentialId
 * @param publicCredentialEntry
 */
export async function fromChain(
  credentialId: HexString,
  publicCredentialEntry: Option<PublicCredentialsCredentialsCredentialEntry>
): Promise<IPublicCredential | null> {
  const api = ConfigService.get('api')

  const { blockNumber } = publicCredentialEntry.unwrap()
  const { extrinsics } = await api.derive.chain.getBlockByNumber(blockNumber)

  extrinsics
    // Consider only extrinsics that have not failed
    .filter(({ dispatchError }) => {
      if (dispatchError !== undefined) {
        console.log('Failed extrinsic. Ignoring.')
        return false
      }
      return true
    })
    // Take each extrinsic and its events
    .map(({ extrinsic, events }) => ({ extrinsic, events }))
    // Consider only the extrinsics that have generated the right event type
    .filter(({ events }) =>
      events.find(({ section, method }) => {
        if (section !== 'publicCredentials' || method !== 'add') {
          console.log(`Event generated for ${section}::${method}(). Ignoring.`)
          return false
        }
        return true
      })
    )
  // // Consider only `did::submit_did_call` extrinsics
  // .filter(
  //   (
  //     extrinsic
  //   ): extrinsic is GenericExtrinsic<
  //     typeof api.tx.did.submitDidCall.args
  //   > => {
  //     if (
  //       extrinsic.method.section !== 'did' ||
  //       extrinsic.method.method !== 'submitDidCall'
  //     ) {
  //       console.log(
  //         `${extrinsic.method.section}::${extrinsic.method.method}() not the right extrinsic. Ignoring.`
  //       )
  //       return false
  //     }
  //     return true
  //   }
  // )
  // // Take the nested call and submitter DID
  // .map(
  //   ({
  //     method: {
  //       args: [didCall],
  //     },
  //   }) =>
  //     [didCall.call, didCall.submitter] as [
  //       GenericCall<typeof api.tx.publicCredentials.add.args>,
  //       AccountId32
  //     ]
  // )
  // // Consider only DID-authorized `public_credentials::add` calls
  // .filter(
  //   (
  //     callDetails
  //   ): callDetails is [
  //     GenericCall<typeof api.tx.publicCredentials.add.args>,
  //     AccountId32
  //   ] => {
  //     const call = callDetails[0]
  //     if (call.section !== 'publicCredentials' || call.method !== 'add') {
  //       console.log(
  //         `${call.section}::${call.method}() not the right call. Ignoring.`
  //       )
  //       return false
  //     }
  //     return true
  //   }
  // )
  return null
}
