/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type {
  AssetDidUri,
  CTypeHash,
  IDelegationNode,
  IPublicCredentialInput,
  IPublicCredential,
  DidUri,
} from '@kiltprotocol/types'
import type { ApiPromise } from '@polkadot/api'
import type { GenericCall, Option } from '@polkadot/types'
import type { Call } from '@polkadot/types/interfaces'
import type { BN } from '@polkadot/util'
import type {
  PublicCredentialsCredentialsCredential,
  PublicCredentialsCredentialsCredentialEntry,
} from '@kiltprotocol/augment-api'

import { encode as cborEncode, decode as cborDecode } from 'cbor-web'

import { HexString } from '@polkadot/util/types'
import { ConfigService } from '@kiltprotocol/config'
import { fromChain as didFromChain } from '@kiltprotocol/did'
import { validateUri } from '@kiltprotocol/asset-did'
import { SDKErrors } from '@kiltprotocol/utils'

import { getIdForCredential } from './PublicCredential.js'
import { flattenCalls, isBatch, retrieveExtrinsicFromBlock } from '../utils.js'

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

/**
 * The details of a public credential that are stored on chain.
 */
export interface PublicCredentialEntry {
  /**
   * CType hash of the public credential.
   */
  ctypeHash: HexString
  /**
   * DID URI of the attester.
   */
  attester: DidUri
  /**
   * Flag indicating whether the credential is currently revoked.
   */
  revoked: boolean
  /**
   * Issuance block number of the credential.
   */
  blockNumber: BN
  /**
   * Authorization information used by the attester when issuing the credential.
   */
  authorizationId: IDelegationNode['id'] | null
}

/**
 * Decodes the public credential details returned by `api.query.publicCredentials.credentials(subjectId)`.
 *
 * @param encoded The data from the blockchain.
 * @returns The decoded data.
 */
export function fromChain(
  encoded: Option<PublicCredentialsCredentialsCredentialEntry>
): PublicCredentialEntry {
  const { attester, authorizationId, blockNumber, ctypeHash, revoked } =
    encoded.unwrap()
  return {
    ctypeHash: ctypeHash.toHex(),
    attester: didFromChain(attester),
    revoked: revoked.toPrimitive(),
    authorizationId: authorizationId.isSome
      ? authorizationId.unwrap().toHex()
      : null,
    blockNumber: blockNumber.toBn(),
  }
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
 * Retrieves from the blockchain the [[IPublicCredential]] that is identified by the provided identifier.
 *
 * This is the **only** secure way for users to retrieve and verify a credential.
 *
 * @param credentialId Credential ID to use for the query.
 * @returns The [[IPublicCredential]] as the result of combining the on-chain information and the information present in the tx history.
 */
export async function fetchCredentialFromChain(
  credentialId: IPublicCredential['id']
): Promise<IPublicCredential> {
  const api = ConfigService.get('api')

  const publicCredentialEntry = await api.call.publicCredentials.getById(
    credentialId
  )
  const { blockNumber, revoked } = publicCredentialEntry.unwrap()

  const extrinsic = await retrieveExtrinsicFromBlock(
    api,
    blockNumber,
    ({ events }) =>
      events.some(
        (event) =>
          api.events.publicCredentials.CredentialStored.is(event) &&
          event.data[1].toString() === credentialId
      )
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
 * Retrieves from the blockchain the [[IPublicCredential]]s that have been issued to the provided AssetDID.
 *
 * This is the **only** secure way for users to retrieve and verify all the credentials issued to a given [[AssetDidUri]].
 *
 * @param subject The AssetDID of the subject.
 * @returns An array of [[IPublicCredential]] as the result of combining the on-chain information and the information present in the tx history.
 */
export async function fetchCredentialsFromChain(
  subject: AssetDidUri
): Promise<IPublicCredential[]> {
  const api = ConfigService.get('api')

  const publicCredentialEntries = await api.call.publicCredentials.getBySubject(
    subject,
    null
  )
  if (publicCredentialEntries.isErr) {
    throw new Error(publicCredentialEntries.asErr.toString())
  }

  return Promise.all(
    publicCredentialEntries.asOk.map(([encodedId]) =>
      fetchCredentialFromChain(encodedId.toHex())
    )
  )
}
