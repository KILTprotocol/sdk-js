/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
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
import type { GenericCall, Option, Result, u64, Vec } from '@polkadot/types'
import type { Call, Extrinsic, Hash } from '@polkadot/types/interfaces'
import type { ITuple } from '@polkadot/types/types'
import type {
  PublicCredentialError,
  PublicCredentialsCredentialsCredential,
  PublicCredentialsCredentialsCredentialEntry,
} from '@kiltprotocol/augment-api'

import { encode as cborEncode, decode as cborDecode } from 'cbor'

import { HexString } from '@polkadot/util/types'
import { ConfigService } from '@kiltprotocol/config'
import { fromChain as didFromChain } from '@kiltprotocol/did'
import { validateUri } from '@kiltprotocol/asset-did'
import { SDKErrors } from '@kiltprotocol/utils'

import { getIdForCredential } from './PublicCredential.js'
import { isBatch } from '../utils.js'

export interface EncodedPublicCredential {
  ctypeHash: CTypeHash
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
    ctypeHash: cTypeHash,
    subject,
    claims: `0x${cborSerializedClaims.toString('hex')}`,
    authorization: delegationId,
  }
}

// Flatten any nested batch calls into a single list of calls.
function flattenCalls(api: ApiPromise, call: Call): Call[] {
  if (isBatch(api, call)) {
    // Inductive case
    return call.args[0].flatMap((c) => flattenCalls(api, c))
  }
  // Base case
  return [call]
}

// Transform a blockchain-formatted public credential [[PublicCredentialsCredentialsCredential]] into the original [[IPublicCredentialInput]].
// It throws if what was written on the chain was garbage.
function credentialInputFromChain({
  claims,
  ctypeHash,
  authorization,
  subject,
}: PublicCredentialsCredentialsCredential): IPublicCredentialInput {
  const credentialSubject = subject.toUtf8()
  validateUri(credentialSubject)
  return {
    claims: cborDecode(claims),
    cTypeHash: ctypeHash.toHex(),
    delegationId: authorization.unwrapOr(undefined)?.toHex() ?? null,
    subject: credentialSubject as AssetDidUri,
  }
}

// Retrieve a given block and looks into it to find a public credential creation tx that matches the provided credential ID.
async function retrievePublicCredentialCreationExtrinsicFromBlock(
  api: ApiPromise,
  credentialId: HexString,
  blockNumber: u64
): Promise<Extrinsic | null> {
  const { extrinsics } = await api.derive.chain.getBlockByNumber(blockNumber)
  const successfulExtrinsics = extrinsics.filter(
    ({ dispatchError }) => !dispatchError
  )
  // If there is more than one (e.g., same credential issued multiple times in the same block) it should not matter since the ID is generated over the content, hence same ID -> same content.
  // Nevertheless, take only the last one, if present, as that is for sure what ended up being in the blockchain state.
  const lastPublicCredentialCreationExtrinsic = successfulExtrinsics
    .reverse()
    .find(({ events }) =>
      events.some(
        (event) =>
          api.events.publicCredentials.CredentialStored.is(event) &&
          event.data[1].toString() === credentialId
      )
    )

  return lastPublicCredentialCreationExtrinsic?.extrinsic ?? null
}

// Given a (nested) call, flattens them and filter by calls that are of type `api.tx.publicCredentials.add`.
function extractPublicCredentialCreationCallsFromDidCall(
  api: ApiPromise,
  call: Call
): Array<GenericCall<typeof api.tx.publicCredentials.add.args>> {
  const extrinsicCalls = flattenCalls(api, call)
  return extrinsicCalls.filter(
    (c): c is GenericCall<typeof api.tx.publicCredentials.add.args> =>
      api.tx.publicCredentials.add.is(c)
  )
}

// Given a (nested) call, flattens them and filter by calls that are of type `api.tx.did.submitDidCall`.
function extractDidCallsFromBatchCall(
  api: ApiPromise,
  call: Call
): Array<GenericCall<typeof api.tx.did.submitDidCall.args>> {
  const extrinsicCalls = flattenCalls(api, call)
  return extrinsicCalls.filter(
    (c): c is GenericCall<typeof api.tx.did.submitDidCall.args> =>
      api.tx.did.submitDidCall.is(c)
  )
}

/**
 * Decodes the public credential details returned by `api.call.publicCredentials.getById()`.
 *
 * This is the **only** secure way for users to retrieve and verify a credential.
 * Hence, calling `api.call.publicCredentials.getById(credentialId)` and then passing the result to this function is the only way to trust that a credential with a given ID is valid.
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

  if (!isBatch(api, extrinsic) && !api.tx.did.submitDidCall.is(extrinsic)) {
    throw new SDKErrors.PublicCredentialError(
      'Extrinsic should be either a `did.submitDidCall` extrinsic or a batch with at least a `did.submitDidCall` extrinsic'
    )
  }

  // If we're dealing with a batch, flatten any nested `submit_did_call` calls,
  // otherwise the extrinsic is itself a submit_did_call, so just take it.
  const didCalls = isBatch(api, extrinsic)
    ? extrinsic.args[0].flatMap((batchCall) =>
        extractDidCallsFromBatchCall(api, batchCall)
      )
    : [extrinsic]

  // From the list of DID calls, only consider public_credentials::add calls, bundling each of them with their DID submitter.
  // It returns a list of [reconstructedCredential, attesterDid].
  const callCredentialsContent = didCalls.flatMap((didCall) => {
    const publicCredentialCalls =
      extractPublicCredentialCreationCallsFromDidCall(api, didCall.args[0].call)
    // Re-create the issued public credential for each call identified.
    return publicCredentialCalls.map(
      (credentialCreationCall) =>
        [
          credentialInputFromChain(credentialCreationCall.args[0]),
          didFromChain(didCall.args[0].did),
        ] as const
    )
  })

  // If more than one call is present, it always considers the last one as the valid one, and takes its attester.
  const lastRightCredentialCreationCall = callCredentialsContent
    .reverse()
    .find(([credential, attester]) => {
      const reconstructedId = getIdForCredential(credential, attester)
      return reconstructedId === credentialId
    })

  if (!lastRightCredentialCreationCall) {
    throw new SDKErrors.PublicCredentialError(
      'Block should always contain the full credential, eventually.'
    )
  }

  const [credentialInput, attester] = lastRightCredentialCreationCall

  return {
    ...credentialInput,
    attester,
    id: getIdForCredential(credentialInput, attester),
    blockNumber,
    revoked: revoked.toPrimitive(),
  }
}

/**
 * Decodes the public credential details returned by `api.call.publicCredentials.getBySubject()`.
 *
 * This is the **only** secure way for users to retrieve and verify all the credentials issued to a given [[AssetDidUri]].
 * Hence, calling `api.call.publicCredentials.getBySubject(asset_id)` and then passing the result to this function is the only way to trust that the credentials for a given AssetDID are valid.
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
  return Promise.all(
    publicCredentialEntries.asOk.map(([encodedId, encodedCredentialEntry]) =>
      credentialFromChain(
        encodedId.toHex(),
        api.createType(
          'Option<PublicCredentialsCredentialsCredentialEntry>',
          encodedCredentialEntry
        )
      )
    )
  )
}
