/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type {
  AssetDid,
  CTypeHash,
  IDelegationNode,
  IPublicCredentialInput,
  IPublicCredential,
  Did,
  HexString,
} from '@kiltprotocol/types'
import type { GenericCall, Option } from '@polkadot/types'
import type { BN } from '@polkadot/util'
import type {
  PublicCredentialsCredentialsCredential,
  PublicCredentialsCredentialsCredentialEntry,
} from '@kiltprotocol/augment-api'

import { Blockchain } from '@kiltprotocol/chain-helpers'
import { ConfigService } from '@kiltprotocol/config'
import { fromChain as didFromChain } from '@kiltprotocol/did'
import { SDKErrors, cbor } from '@kiltprotocol/utils'

import { getIdForCredential } from './PublicCredential.js'
import { validateDid } from '../dids/index.js'

export interface EncodedPublicCredential {
  ctypeHash: CTypeHash
  subject: AssetDid
  claims: HexString
  authorization: IDelegationNode['id'] | null
}
/**
 * Format a {@link IPublicCredentialInput} to be used as a parameter for the blockchain API function.

 * @param publicCredential The public credential to format.
 * @returns The blockchain-formatted public credential.
 */
export function toChain(
  publicCredential: IPublicCredentialInput
): EncodedPublicCredential {
  const { cTypeHash, claims, subject, delegationId } = publicCredential

  const cborSerializedClaims = cbor.encode(claims)

  return {
    ctypeHash: cTypeHash,
    subject,
    claims: `0x${cborSerializedClaims.toString('hex')}`,
    authorization: delegationId,
  }
}

// Transform a blockchain-formatted public credential {@link PublicCredentialsCredentialsCredential} into the original {@link IPublicCredentialInput}.
// It throws if what was written on the chain was garbage.
function credentialInputFromChain({
  claims,
  ctypeHash,
  authorization,
  subject,
}: PublicCredentialsCredentialsCredential): IPublicCredentialInput {
  const credentialSubject = subject.toUtf8()
  validateDid(credentialSubject)
  return {
    claims: cbor.decode(claims),
    cTypeHash: ctypeHash.toHex(),
    delegationId: authorization.unwrapOr(undefined)?.toHex() ?? null,
    subject: credentialSubject as AssetDid,
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
   * DID of the attester.
   */
  attester: Did
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
  encoded:
    | Option<PublicCredentialsCredentialsCredentialEntry>
    | PublicCredentialsCredentialsCredentialEntry
): PublicCredentialEntry {
  const { attester, authorizationId, blockNumber, ctypeHash, revoked } =
    'unwrap' in encoded ? encoded.unwrap() : encoded
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

/**
 * Retrieves from the blockchain the {@link IPublicCredential} that is identified by the provided identifier.
 *
 * This is the **only** secure way for users to retrieve and verify a credential.
 *
 * @param credentialId Credential ID to use for the query.
 * @returns The {@link IPublicCredential} as the result of combining the on-chain information and the information present in the tx history.
 */
export async function fetchCredentialFromChain(
  credentialId: IPublicCredential['id']
): Promise<IPublicCredential> {
  const api = ConfigService.get('api')

  const publicCredentialEntry = await api.call.publicCredentials.getById(
    credentialId
  )
  const {
    blockNumber,
    revoked,
    attester: attesterId,
  } = publicCredentialEntry.unwrap()
  const attester = didFromChain(attesterId)

  const extrinsic = await Blockchain.retrieveExtrinsicFromBlock(
    blockNumber,
    ({ events }) =>
      events.some(
        (event) =>
          api.events.publicCredentials?.CredentialStored?.is(event) &&
          event.data[1].toString() === credentialId
      ),
    api
  )

  if (extrinsic === null) {
    throw new SDKErrors.PublicCredentialError(
      `The block number as specified in the provided credential entry (${blockNumber}) does not have any extrinsic that includes a credential creation.`
    )
  }

  // Unpack any nested calls, e.g., within a batch or `submit_did_call`
  const extrinsicCalls = Blockchain.flattenCalls(extrinsic, api)

  // only consider public_credentials::add calls
  const publicCredentialCalls = extrinsicCalls.filter(
    (c): c is GenericCall<typeof api.tx.publicCredentials.add.args> =>
      api.tx.publicCredentials?.add?.is(c)
  )

  // Re-create the issued public credential for each call identified to find the credential with the id we're looking for
  const credentialInput = publicCredentialCalls.reduceRight<
    IPublicCredentialInput | undefined
  >((selectedCredential, credentialCreationCall) => {
    if (selectedCredential) {
      return selectedCredential
    }
    const credential = credentialInputFromChain(credentialCreationCall.args[0])
    const reconstructedId = getIdForCredential(credential, attester)
    if (reconstructedId === credentialId) {
      return credential
    }
    return undefined
  }, undefined)

  if (typeof credentialInput === 'undefined') {
    throw new SDKErrors.PublicCredentialError(
      'Block should always contain the full credential, eventually.'
    )
  }

  return {
    ...credentialInput,
    attester,
    id: credentialId,
    blockNumber,
    revoked: revoked.toPrimitive(),
  }
}

/**
 * Retrieves from the blockchain the {@link IPublicCredential}s that have been issued to the provided {@link AssetDid}.
 *
 * This is the **only** secure way for users to retrieve and verify all the credentials issued to a given {@link AssetDid}.
 *
 * @param subject The AssetDID of the subject.
 * @returns An array of {@link IPublicCredential} as the result of combining the on-chain information and the information present in the tx history.
 */
export async function fetchCredentialsFromChain(
  subject: AssetDid
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
