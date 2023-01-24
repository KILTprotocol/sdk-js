/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { ApiPromise } from '@polkadot/api'
import type { Bytes, GenericCall, Option } from '@polkadot/types'
import type { Call } from '@polkadot/types/interfaces'
import type { BN } from '@polkadot/util'

import type { CtypeCtypeEntry } from '@kiltprotocol/augment-api'
import type { CTypeHash, DidUri, ICType } from '@kiltprotocol/types'

import { ConfigService } from '@kiltprotocol/config'
import * as Did from '@kiltprotocol/did'
import { SDKErrors } from '@kiltprotocol/utils'

import {
  getHashForSchema,
  hashToId,
  idToHash,
  serializeForHash,
  verifyDataStructure,
} from './CType.js'
import { flattenCalls, isBatch, retrieveExtrinsicFromBlock } from '../utils.js'

/**
 * Encodes the provided CType for use in `api.tx.ctype.add()`.
 *
 * @param ctype The CType to write on the blockchain.
 * @returns Encoded CType.
 */
export function toChain(ctype: ICType): string {
  return serializeForHash(ctype)
}

/**
 * Encodes the provided CType['$id'] for use in `api.query.ctype.ctypes()`.
 *
 * @param cTypeId The CType id to translate for the blockchain.
 * @returns Encoded CType id.
 */
export function idToChain(cTypeId: ICType['$id']): CTypeHash {
  return idToHash(cTypeId)
}

// Transform a blockchain-formatted CType input (represented as Bytes) into the original [[ICType]].
// It throws if what was written on the chain was garbage.
function cTypeInputFromChain(input: Bytes): ICType {
  try {
    // Throws on invalid JSON input. CType is expected to be a valid JSON document.
    const reconstructedObject = JSON.parse(input.toUtf8())
    // Re-compute the ID to validate the resulting ICType.
    const reconstructedCTypeId = hashToId(getHashForSchema(reconstructedObject))
    const reconstructedCType: ICType = {
      ...reconstructedObject,
      $id: reconstructedCTypeId,
    }
    // If throws if the input was a valid JSON but not a valid CType.
    verifyDataStructure(reconstructedCType)
    return reconstructedCType
  } catch (cause) {
    throw new SDKErrors.CTypeError(
      `The provided payload cannot be parsed as a CType: ${input.toHuman()}`,
      { cause }
    )
  }
}

/**
 * The details of a CType that are stored on chain.
 */
export interface CTypeChainDetails {
  /**
   * The DID of the CType's creator.
   */
  creator: DidUri
  /**
   * The block number in which the CType was created.
   */
  createdAt: BN
}

export type ICTypeDetails = ICType & CTypeChainDetails

/**
 * Decodes the CType details returned by `api.query.ctype.ctypes()`.
 *
 * @param encoded The data from the blockchain.
 * @returns The decoded data.
 */
export function fromChain(encoded: Option<CtypeCtypeEntry>): CTypeChainDetails {
  const { creator, createdAt } = encoded.unwrap()
  return {
    creator: Did.fromChain(creator),
    createdAt: createdAt.toBn(),
  }
}

// Given a (nested) call, flattens them and filter by calls that are of type `api.tx.ctype.add`.
function extractCTypeCreationCallsFromDidCall(
  api: ApiPromise,
  call: Call
): Array<GenericCall<typeof api.tx.ctype.add.args>> {
  const extrinsicCalls = flattenCalls(api, call)
  return extrinsicCalls.filter(
    (c): c is GenericCall<typeof api.tx.ctype.add.args> =>
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
 * Resolves a CType identifier to the CType definition by fetching data from the block containing the transaction that registered the CType on chain.
 *
 * @param cTypeId CType ID to use for the query. It is required to complement the information stored on the blockchain in a [[CtypeCtypeEntry]].
 *
 * @returns The [[ICTypeDetails]] as the result of combining the on-chain information and the information present in the tx history.
 */
export async function fetchFromChain(
  cTypeId: ICType['$id']
): Promise<ICTypeDetails> {
  const api = ConfigService.get('api')
  const cTypeHash = idToHash(cTypeId)

  const cTypeEntry = await api.query.ctype.ctypes(cTypeHash)
  const { createdAt } = fromChain(cTypeEntry)

  const extrinsic = await retrieveExtrinsicFromBlock(
    api,
    createdAt,
    ({ events }) =>
      events.some(
        (event) =>
          api.events.ctype.CTypeCreated.is(event) &&
          event.data[1].toString() === cTypeHash
      )
  )

  if (extrinsic === null) {
    throw new SDKErrors.CTypeError(
      `There is not CType with the provided ID "${cTypeId}" on chain.`
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

  // From the list of DID calls, only consider ctype::add calls, bundling each of them with their DID submitter.
  // It returns a list of [reconstructedCType, attesterDid].
  const ctypeCallContent = didCalls.flatMap((didCall) => {
    const ctypeCreationCalls = extractCTypeCreationCallsFromDidCall(
      api,
      didCall.args[0].call
    )
    // Re-create the issued public credential for each call identified.
    return ctypeCreationCalls.map(
      (ctypeCreationCall) =>
        [
          cTypeInputFromChain(ctypeCreationCall.args[0]),
          Did.fromChain(didCall.args[0].did),
        ] as const
    )
  })

  // If more than a call is present, it always considers the last one as the valid one.
  const lastRightCTypeCreationCall = ctypeCallContent
    .reverse()
    .find((cTypeInput) => {
      return cTypeInput[0].$id === cTypeId
    })

  if (!lastRightCTypeCreationCall) {
    throw new SDKErrors.CTypeError(
      'Block should always contain the full CType, eventually.'
    )
  }

  const [ctypeInput, creator] = lastRightCTypeCreationCall

  return {
    ...ctypeInput,
    $id: cTypeId,
    creator,
    createdAt,
  }
}
