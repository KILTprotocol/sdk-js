/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
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
  ICType,
  DidUri,
} from '@kiltprotocol/types'
import type { GenericCall, Option, Result, Vec } from '@polkadot/types'
import type { Hash } from '@polkadot/types/interfaces'
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

import { BN } from '@polkadot/util'
import { getIdForCredential } from './PublicCredential.js'
import { flattenBatchCalls, retrieveExtrinsicFromBlock } from '../utils.js'

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

/**
 * Decodes the public credential details returned by `api.call.publicCredentials.getById()`.
 *
 * This is the **only** secure way for users to retrieve and verify a credential.
 * Hence, calling `api.call.publicCredentials.getById(credentialId)` and then passing the result to this function is the only way to trust that a credential with a given ID is valid.
 *
 * @param credentialId Credential ID to use for the query. It is required to complement the information stored on the blockchain in a [[PublicCredentialsCredentialsCredentialEntry]].
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

  if (!api.tx.did.submitDidCall.is(extrinsic)) {
    throw new SDKErrors.PublicCredentialError(
      'Extrinsic should be a did.submitDidCall extrinsic'
    )
  }

  const extrinsicCalls = flattenBatchCalls(api, extrinsic.args[0].call)
  const extrinsicDidOrigin = didFromChain(extrinsic.args[0].did)

  const credentialCreationCalls = extrinsicCalls.filter(
    (call): call is GenericCall<typeof api.tx.publicCredentials.add.args> =>
      api.tx.publicCredentials.add.is(call)
  )
  // Re-create the issued public credential for each call identified.
  const callCredentialsContent = credentialCreationCalls.map((call) =>
    credentialInputFromChain(call.args[0])
  )
  // If more than a call is present, it always considers the last one as the valid one.
  const lastRightCredentialCreationCall = callCredentialsContent
    .reverse()
    .find((credentialInput) => {
      const reconstructedId = getIdForCredential(
        credentialInput,
        extrinsicDidOrigin
      )
      return reconstructedId === credentialId
    })

  if (!lastRightCredentialCreationCall) {
    throw new SDKErrors.PublicCredentialError(
      'Block should always contain the full credential, eventually.'
    )
  }
  return {
    ...lastRightCredentialCreationCall,
    attester: extrinsicDidOrigin,
    id: getIdForCredential(lastRightCredentialCreationCall, extrinsicDidOrigin),
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
 * @param subject The AssetDID of the subject.
 * @returns An array of [[IPublicCredential]] as the result of combining the on-chain information and the information present in the tx history. If the result is an error, it maps it to the right error type.
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
