/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { ApiPromise } from '@polkadot/api'
import type {
  AssetDidUri,
  CTypeHash,
  IDelegationNode,
  INewPublicCredential,
  IPublicCredential,
} from '@kiltprotocol/types'
import type { Option, Result, u64, Vec } from '@polkadot/types'
import type { Call, Extrinsic, Hash } from '@polkadot/types/interfaces'
import type { ITuple } from '@polkadot/types/types'
import type {
  PublicCredentialError,
  PublicCredentialsCredentialsCredential,
  PublicCredentialsCredentialsCredentialEntry,
} from '@kiltprotocol/augment-api'

import { encode as cborEncode, decode as cborDecode } from 'cbor'

import { hexToU8a, u8aToHex } from '@polkadot/util'
import { HexString } from '@polkadot/util/types'
import { ConfigService } from '@kiltprotocol/config'
import { fromChain as didFromChain, Assets } from '@kiltprotocol/did'

import { computeId } from './PublicCredential.js'

export interface EncodedPublicCredential {
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

// Flatten any nested calls (via batches) into a list of calls
function flattenCalls(api: ApiPromise, call: Call): Call[] {
  if (
    api.tx.utility.batch.is(call) ||
    api.tx.utility.batchAll.is(call) ||
    api.tx.utility.forceBatch.is(call)
  ) {
    return call.args[0].reduce(
      (acc: Call[], c: Call) => acc.concat(flattenCalls(api, c)),
      []
    )
  }
  return [call]
}

function credentialInputFromChain(
  credential: PublicCredentialsCredentialsCredential
): INewPublicCredential {
  Assets.validateUri(credential.subject.toUtf8())
  return {
    claims: cborDecode(hexToU8a(credential.claims.toHex())),
    cTypeHash: credential.ctypeHash.toHex(),
    delegationId: credential.authorization.unwrapOr(undefined)?.toHex() ?? null,
    subject: credential.subject.toUtf8() as AssetDidUri,
  }
}

async function retrievePublicCredentialCreationExtrinsicsFromBlock(
  api: ApiPromise,
  credentialId: HexString,
  blockNumber: u64
): Promise<Extrinsic | null> {
  const { extrinsics } = await api.derive.chain.getBlockByNumber(blockNumber)
  return (
    extrinsics
      // Consider only extrinsics that have not failed
      .filter(({ dispatchError }) => dispatchError === undefined)
      // Consider only the extrinsics that contains at least the credential creation event with the right credentialId
      .filter(({ events }) =>
        events.some(
          (event) =>
            api.events.publicCredentials.CredentialStored.is(event) &&
            event.data[1].toString() === credentialId
        )
      )
      // If there is more than one (e.g., same credential issued multiple times in the same block), take the last one, as that is the one that should be considered
      .pop()?.extrinsic ?? null
  )
}

// FIXME: I did not get the derives to work properly.
/**
 * @param credentialId
 * @param publicCredentialEntry
 */
export async function credentialFromChain(
  credentialId: HexString,
  publicCredentialEntry: Option<PublicCredentialsCredentialsCredentialEntry>
): Promise<IPublicCredential> {
  const api = ConfigService.get('api')

  const { blockNumber, revoked } = publicCredentialEntry.unwrap()

  const extrinsic = await retrievePublicCredentialCreationExtrinsicsFromBlock(
    api,
    credentialId,
    blockNumber
  )

  if (extrinsic === null) {
    throw new Error(
      `The block number as specified in the provided credential entry (${blockNumber}) does not have any extrinsic that includes a credential creation.`
    )
  }

  if (!api.tx.did.submitDidCall.is(extrinsic)) {
    throw new Error('Extrinsic should be a did.submitDidCall extrinsic')
  }

  const [extrinsicCalls, extrinsicDidOrigin] = [
    flattenCalls(api, extrinsic.args[0].call),
    didFromChain(extrinsic.args[0].did),
  ]

  let credentialInput: IPublicCredential | undefined

  extrinsicCalls.forEach((call) => {
    if (api.tx.publicCredentials.add.is(call)) {
      const credentialCallArgument = call.args[0]
      const reconstructedCredentialInput = credentialInputFromChain(
        credentialCallArgument
      )
      const reconstructedId = computeId(
        reconstructedCredentialInput,
        extrinsicDidOrigin
      )
      if (reconstructedId === credentialId) {
        credentialInput = {
          ...reconstructedCredentialInput,
          attester: extrinsicDidOrigin,
          id: reconstructedId,
          blockNumber,
          revoked: revoked.toPrimitive(),
        }
      }
    }
  })
  if (credentialInput === undefined) {
    throw new Error(
      'Block should always contain the full credential, eventually.'
    )
  }
  return credentialInput
}

/**
 * @param credentials
 */
export async function credentialsFromChain(
  credentials: Result<
    Vec<ITuple<[Hash, PublicCredentialsCredentialsCredentialEntry]>>,
    PublicCredentialError
  >
): Promise<IPublicCredential[]> {
  if (credentials.isErr) {
    throw new Error(credentials.asErr.toString())
  }

  const api = ConfigService.get('api')
  const formattedCredentials: Array<
    [HexString, Option<PublicCredentialsCredentialsCredentialEntry>]
  > = credentials.asOk.map(([encodedId, encodedCredentialEntry]) => [
    encodedId.toHex(),
    api.createType(
      'Option<PublicCredentialsCredentialsCredentialEntry>',
      encodedCredentialEntry
    ),
  ])

  return Promise.all(
    formattedCredentials.map(([id, entry]) => credentialFromChain(id, entry))
  )
}
