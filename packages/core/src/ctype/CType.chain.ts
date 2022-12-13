/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { Bytes, GenericCall, Option } from '@polkadot/types'
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
import { flattenBatchCalls, retrieveExtrinsicFromBlock } from '../utils.js'

/**
 * Encodes the provided [[ICType]] for use in `api.tx.ctype.add()`.
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

// Same as in the public credentials module.
function cTypeInputFromChain(input: Bytes): ICType {
  try {
    // Throws on invalid JSON input.
    const reconstructedObject = JSON.parse(input.toUtf8())
    // Re-compute the ID to validate the resulting ICType. It will fail if not valid.
    const attemptedCTypeId = hashToId(getHashForSchema(reconstructedObject))
    const reconstructedCType: ICType = {
      ...reconstructedObject,
      $id: attemptedCTypeId,
    }
    verifyDataStructure(reconstructedCType)
    return reconstructedCType
  } catch {
    throw new SDKErrors.CTypeError(
      `The provided payload cannot be parsed as a CType: ${input.toUtf8()}`
    )
  }
}

export interface ICTypeDetails extends ICType {
  creator: DidUri
  createdAt: BN
}

/**
 * Decodes the CType details returned by `api.query.ctype.ctypes()`.
 *
 * @param cTypeId CType ID to use for the query. It is required to complement the information stored on the blockchain in a [[CtypeCtypeEntry]].
 * @param cTypeEntry The raw CType details from blockchain.
 * @returns The [[ICTypeDetails]] as the result of combining the on-chain information and the information present in the tx history.
 */
export async function fromChain(
  cTypeId: ICType['$id'],
  cTypeEntry: Option<CtypeCtypeEntry>
): Promise<ICTypeDetails> {
  const api = ConfigService.get('api')
  const cTypeHash = idToHash(cTypeId)

  const { creator, creationBlockNumber } = cTypeEntry.unwrap()

  const extrinsic = await retrieveExtrinsicFromBlock(
    api,
    creationBlockNumber,
    ({ events }) =>
      events.some(
        (event) =>
          api.events.ctype.CTypeCreated.is(event) &&
          event.data[0].toString() === cTypeHash
      )
  )

  if (extrinsic === null) {
    throw new SDKErrors.CTypeError(
      `There is not CType with the provided ID "${cTypeId}" on chain.`
    )
  }

  if (!api.tx.did.submitDidCall.is(extrinsic)) {
    throw new SDKErrors.CTypeError(
      'Extrinsic should be a did.submitDidCall extrinsic'
    )
  }

  const extrinsicCalls = flattenBatchCalls(api, extrinsic.args[0].call)

  const cTypeCreationCalls = extrinsicCalls.filter(
    (call): call is GenericCall<typeof api.tx.ctype.add.args> =>
      api.tx.ctype.add.is(call)
  )
  // Re-create the created CType for each call identified.
  const callCTypeContent = cTypeCreationCalls.map((call) =>
    cTypeInputFromChain(call.args[0])
  )
  // If more than a call is present, it always considers the last one as the valid one.
  const lastRightCTypeCreationCall = callCTypeContent
    .reverse()
    .find((cTypeInput) => {
      return cTypeInput.$id === cTypeId
    })

  if (!lastRightCTypeCreationCall) {
    throw new SDKErrors.CTypeError(
      'Block should always contain the full CType, eventually.'
    )
  }
  return {
    ...lastRightCTypeCreationCall,
    $id: cTypeId,
    creator: Did.fromChain(creator),
    createdAt: creationBlockNumber.toBn(),
  }
}
