/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { Bytes, GenericCall, Option } from '@polkadot/types'
import type { AccountId } from '@polkadot/types/interfaces'
import type { BN } from '@polkadot/util'

import type { CtypeCtypeEntry } from '@kiltprotocol/augment-api'
import type { CTypeHash, Did as KiltDid, ICType } from '@kiltprotocol/types'

import { Blockchain } from '@kiltprotocol/chain-helpers'
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

/**
 * Encodes the provided CType for use in `api.tx.ctype.add()`.
 *
 * @param cType The CType to write on the blockchain.
 * @returns Encoded CType.
 */
export function toChain(cType: ICType): string {
  return serializeForHash(cType)
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

// Transform a blockchain-formatted CType input (represented as Bytes) into the original {@link ICType}.
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
  creator: KiltDid
  /**
   * The block number in which the CType was created.
   */
  createdAt: BN
}

export type ICTypeDetails = { cType: ICType } & CTypeChainDetails

/**
 * Decodes the CType details returned by `api.query.ctype.ctypes()`.
 *
 * @param encoded The data from the blockchain.
 * @returns An object indicating the CType creator.
 */
export function fromChain(
  encoded: Option<AccountId> | AccountId
): Pick<CTypeChainDetails, 'creator'>
/**
 * Decodes the CType details returned by `api.query.ctype.ctypes()`.
 *
 * @param encoded The data from the blockchain.
 * @returns An object indicating the CType creator and createdAt block.
 */
export function fromChain(
  encoded: Option<CtypeCtypeEntry> | CtypeCtypeEntry
): CTypeChainDetails
// eslint-disable-next-line jsdoc/require-jsdoc
export function fromChain(
  encoded:
    | Option<CtypeCtypeEntry>
    | Option<AccountId>
    | CtypeCtypeEntry
    | AccountId
): CTypeChainDetails | Pick<CTypeChainDetails, 'creator'> {
  const unwrapped = 'unwrap' in encoded ? encoded.unwrap() : encoded
  if ('creator' in unwrapped && 'createdAt' in unwrapped) {
    const { creator, createdAt } = unwrapped
    return {
      creator: Did.fromChain(creator),
      createdAt: createdAt.toBn(),
    }
  }
  return {
    creator: Did.fromChain(unwrapped),
  }
}

/**
 * Resolves a CType identifier to the CType definition by fetching data from the block containing the transaction that registered the CType on chain.
 *
 * @param cTypeId CType ID to use for the query. It is required to complement the information stored on the blockchain in a {@link CtypeCtypeEntry}.
 *
 * @returns The {@link ICTypeDetails} as the result of combining the on-chain information and the information present in the tx history.
 */
export async function fetchFromChain(
  cTypeId: ICType['$id']
): Promise<ICTypeDetails> {
  const api = ConfigService.get('api')
  const cTypeHash = idToHash(cTypeId)

  const cTypeEntry = await api.query.ctype.ctypes(cTypeHash)
  const { createdAt, creator } = fromChain(cTypeEntry)
  if (typeof createdAt === 'undefined')
    throw new SDKErrors.CTypeError(
      'Cannot fetch CType definitions on a chain that does not store the createdAt block'
    )

  const extrinsic = await Blockchain.retrieveExtrinsicFromBlock(
    createdAt,
    ({ events }) =>
      events.some(
        (event) =>
          api.events.ctype?.CTypeCreated?.is(event) &&
          event.data[1].toHex() === cTypeHash
      ),
    api
  )

  if (extrinsic === null) {
    throw new SDKErrors.CTypeError(
      `There is no CType with the provided ID "${cTypeId}" on chain.`
    )
  }

  // Unpack any nested calls, e.g., within a batch or `submit_did_call`
  const extrinsicCalls = Blockchain.flattenCalls(extrinsic, api)

  // only consider ctype::add calls
  const ctypeCreationCalls = extrinsicCalls.filter(
    (c): c is GenericCall<typeof api.tx.ctype.add.args> =>
      api.tx.ctype?.add?.is(c)
  )

  // Re-create the ctype for each call identified to find the right ctype.
  // If more than one matching call is present, it always considers the last one as the valid one.
  const cTypeDefinition = ctypeCreationCalls.reduceRight<ICType | undefined>(
    (selectedCType, cTypeCreationCall) => {
      if (selectedCType) {
        return selectedCType
      }
      const cType = cTypeInputFromChain(cTypeCreationCall.args[0])

      if (cType.$id === cTypeId) {
        return cType
      }
      return undefined
    },
    undefined
  )

  if (typeof cTypeDefinition === 'undefined') {
    throw new SDKErrors.CTypeError(
      'Block should always contain the full CType, eventually.'
    )
  }

  return {
    cType: cTypeDefinition,
    creator,
    createdAt,
  }
}
