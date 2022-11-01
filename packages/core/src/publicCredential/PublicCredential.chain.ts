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
import type { Option } from '@polkadot/types'
import type { Call } from '@polkadot/types/interfaces'
import type {
  PublicCredentialsCredentialsCredential,
  PublicCredentialsCredentialsCredentialEntry,
} from '@kiltprotocol/augment-api'

import { encode as cborEncode, decode as cborDecode } from 'cbor'

import { hexToU8a, u8aToHex } from '@polkadot/util'
import { HexString } from '@polkadot/util/types'
import { ConfigService } from '@kiltprotocol/config'
import { fromChain as didFromChain } from '@kiltprotocol/did'

import { getIdForPublicCredentialAndAttester } from './PublicCredential.js'

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

function flattenCalls(api: ApiPromise, call: Call): Call[] {
  if (api.tx.utility.batch.is(call) || api.tx.utility.batchAll.is(call) || api.tx.utility.forceBatch.is(call)) {
    return call.args[0].reduce((acc: Call[], c: Call) => acc.concat(flattenCalls(api, c)), [])
  }
  return [call]
}

function credentialInputFromChain(
  credential: PublicCredentialsCredentialsCredential
): INewPublicCredential {
  return {
    claims: cborDecode(hexToU8a(credential.claims.toHex())),
    cTypeHash: credential.ctypeHash.toHex(),
    delegationId: credential.authorization.unwrapOr(undefined)?.toHex() ?? null,
    subject: credential.subject.toUtf8()
  }
}

// FIXME: I did not get the derives to work properly.
/**
 * @param credentialId
 * @param publicCredentialEntry
 */
export async function fromChain(
  credentialId: HexString,
  publicCredentialEntry: Option<PublicCredentialsCredentialsCredentialEntry>
): Promise<IPublicCredential> {
  const api = ConfigService.get('api')

  const { blockNumber } = publicCredentialEntry.unwrap()
  const { extrinsics } = await api.derive.chain.getBlockByNumber(blockNumber)

  const exts = extrinsics
    // Consider only extrinsics that have not failed
    .filter(({ dispatchError }) => {
      if (dispatchError !== undefined) {
        // console.log('- Failed extrinsic. Ignoring.')
        return false
      }
      return true
    })
    // Consider only the extrinsic that contains the right event
    .find(({ events }) => events.find((event) => {
      if(event.section === 'publicCredentials' && event.method === 'CredentialStored') {
        // FIXME: Make use of TS augmentation
        const eventCredentialId = (event.data as any).credentialId.toString() as HexString
        if (eventCredentialId === credentialId) {
          return true
        }
        // console.log(`-- Right event but wrong credential ID. Ignoring.`)
        return false
      }
      // console.log(`--- Event ${event.section}:${event.method} not relevant. Ignoring.`)
      return false
    }))

  // if (exts === undefined) {
  //   console.log(`Exts should be defined.`)
  // }
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const creationExtrinsic = exts!.extrinsic
  if (!api.tx.did.submitDidCall.is(creationExtrinsic)) {
    throw new Error('Extrinsic should be a did.submitDidCall extrinsic')
  }
  const [extCalls, submitterDid] = [flattenCalls(api, creationExtrinsic.args[0].call), didFromChain(creationExtrinsic.args[0].did)]

  let cred: IPublicCredential | undefined
  extCalls.forEach((call) => {
    if (api.tx.publicCredentials.add.is(call)) {
      // console.log(call.toHuman())
      const credentialInput = call.args[0]
      const recomputedCredentialInput = credentialInputFromChain(credentialInput)
      console.log('+++ Recomputed credential input +++')
      console.log(JSON.stringify(recomputedCredentialInput, null, 2))
      console.log(submitterDid)
      const id = getIdForPublicCredentialAndAttester(
        recomputedCredentialInput,
        submitterDid
      )
      console.log(credentialId)
      console.log(id)
      if (credentialId !== id) {
        console.log(`---- Found the right call but the wrong credential. Ignoring.`)
      } else {
        cred = { ...recomputedCredentialInput, attester: submitterDid, id, blockNumber }
        return
      }
    }
    console.log(`----- Call ${call.section}::${call.method} not relevant. Ignoring.`)
  })
  if (cred === undefined) {
    throw new Error('Block should always contain the full credential, eventually.')
  }
  return cred
}
