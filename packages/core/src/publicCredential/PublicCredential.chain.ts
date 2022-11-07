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
  IPublicCredentialInput,
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
import { fromChain as didFromChain } from '@kiltprotocol/did'
import { validateUri } from '@kiltprotocol/asset-did'
import { SDKErrors } from '@kiltprotocol/utils'

import { computeId } from './PublicCredential.js'

export interface EncodedPublicCredential {
  cTypeHash: CTypeHash
  subject: AssetDidUri
  claims: HexString
  authorization: IDelegationNode['id'] | null
}

/**
 * Format a [[IPublicCredentialInput]] to be used as a parameter for the blockchain API function.

 * @param publicCredential The public credential to format.
 * @returns The blockchain-formatted public credential.
 */
export function toChain(
  publicCredential: IPublicCredentialInput
): EncodedPublicCredential {
  const { cTypeHash, claims, subject, delegationId } = publicCredential

  const cborSerializedClaims = cborEncode(claims)

  return {
    cTypeHash,
    subject,
    // FIXME: Using Uint8Array directly fails to encode and decode, I guess because the api object assumes the byte array is SCALE-encoded.
    claims: u8aToHex(new Uint8Array(cborSerializedClaims)),
    authorization: delegationId,
  }
}

// Flatten any nested batch calls into a single list of calls.
function flattenCalls(api: ApiPromise, call: Call): Call[] {
  if (
    api.tx.utility.batch.is(call) ||
    api.tx.utility.batchAll.is(call) ||
    api.tx.utility.forceBatch.is(call)
  ) {
    // Inductive case
    return call.args[0].flatMap((c) => flattenCalls(api, c))
  }
  // Base case
  return [call]
}

// Transform a blockchain-formatted public credential into the original [[IPublicCredentialInput]].
// It throws if what was written on the chain was garbage.
function credentialInputFromChain(
  credential: PublicCredentialsCredentialsCredential
): IPublicCredentialInput {
  validateUri(credential.subject.toUtf8())
  return {
    claims: cborDecode(hexToU8a(credential.claims.toHex())),
    cTypeHash: credential.ctypeHash.toHex(),
    delegationId: credential.authorization.unwrapOr(undefined)?.toHex() ?? null,
    subject: credential.subject.toUtf8() as AssetDidUri,
  }
}

// Retrieve a given block and looks into it to find a public credential creation tx that matches the provided credential ID.
async function retrievePublicCredentialCreationExtrinsicFromBlock(
  api: ApiPromise,
  credentialId: HexString,
  blockNumber: u64
): Promise<Extrinsic | null> {
  const { extrinsics } = await api.derive.chain.getBlockByNumber(blockNumber)
  return (
    extrinsics
      // Filter out failed extrinsics
      .filter(({ dispatchError }) => dispatchError === undefined)
      // Filter out extrinsics that don't contain a `CredentialStored` event with the right credential ID
      .filter(({ events }) =>
        events.some(
          (event) =>
            api.events.publicCredentials.CredentialStored.is(event) &&
            event.data[1].toString() === credentialId
        )
      )
      // If there is more than one (e.g., same credential issued multiple times in the same block) it should not matter since the ID is generated over the content, hence same ID -> same content.
      // Nevertheless, take only the last one, if present, as that is for sure what ended up being in the blockchain state.
      .pop()?.extrinsic ?? null
  )
}

/**
 * Decodes the public credential details returned by `api.call.publicCredential.getCredential()`.
 *
 * This is the **only** secure way for users to retrieve and verify a credential.
 * Hence, calling `api.call.publicCredentials.getCredential(credentialId)` and then passing the result to this function is the only way to trust that a credential with a given ID is valid.
 *
 * @param credentialId Credential ID to use for the query. It is required to complement the information stored on the blockchain in a [[PublicCredentialsCredentialsCredentialEntry]].
 * @param publicCredentialEntry The raw public credential details from blockchain.
 * @returns The [[IPublicCredential]] as the result of combining the on-chain information and the information present in the tx history.
 */
export async function credentialFromChain(
  credentialId: HexString,
  publicCredentialEntry: Option<PublicCredentialsCredentialsCredentialEntry>
): Promise<IPublicCredential> {
  const api = ConfigService.get('api')

  const { blockNumber, revoked } = publicCredentialEntry.unwrap()

  const extrinsic = await retrievePublicCredentialCreationExtrinsicFromBlock(
    api,
    credentialId,
    blockNumber
  )

  if (extrinsic === null) {
    throw new SDKErrors.PublicCredentialError(
      `The block number as specified in the provided credential entry (${blockNumber}) does not have any extrinsic that includes a credential creation.`
    )
  }

  if (!api.tx.did.submitDidCall.is(extrinsic)) {
    throw new SDKErrors.PublicCredentialError(
      'Extrinsic should be a did.submitDidCall extrinsic'
    )
  }

  const extrinsicCalls = flattenCalls(api, extrinsic.args[0].call)
  const extrinsicDidOrigin = didFromChain(extrinsic.args[0].did)

  let credentialInput: IPublicCredential | undefined

  // Iterate over the calls in the extrinsic to find the right one, and re-create the issued public credential.
  // If more than a call is present, it always considers the last one as the valid one.
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
  if (!credentialInput) {
    throw new SDKErrors.PublicCredentialError(
      'Block should always contain the full credential, eventually.'
    )
  }
  return credentialInput
}

/**
 * Decodes the public credential details returned by `api.call.publicCredential.getCredentials()`.
 *
 * This is the **only** secure way for users to retrieve and verify all the credentials issued to a given [[AssetDidUri]].
 * Hence, calling `api.call.publicCredentials.getCredentials(asset_id)` and then passing the result to this function is the only way to trust that the credentials for a given AssetDID are valid.
 *
 * @param publicCredentialEntries The raw public credential details from blockchain.
 * @returns An array of [[IPublicCredential]] as the result of combining the on-chain information and the information present in the tx history. If the result is an error, it maps it to the right error type.
 */
export async function credentialsFromChain(
  publicCredentialEntries: Result<
    Vec<ITuple<[Hash, PublicCredentialsCredentialsCredentialEntry]>>,
    PublicCredentialError
  >
): Promise<IPublicCredential[]> {
  if (publicCredentialEntries.isErr) {
    throw new Error(publicCredentialEntries.asErr.toString())
  }

  const api = ConfigService.get('api')
  const formattedCredentials: Array<
    [HexString, Option<PublicCredentialsCredentialsCredentialEntry>]
  > = publicCredentialEntries.asOk.map(
    ([encodedId, encodedCredentialEntry]) => [
      encodedId.toHex(),
      api.createType(
        'Option<PublicCredentialsCredentialsCredentialEntry>',
        encodedCredentialEntry
      ),
    ]
  )

  return Promise.all(
    formattedCredentials.map(([id, entry]) => credentialFromChain(id, entry))
  )
}
