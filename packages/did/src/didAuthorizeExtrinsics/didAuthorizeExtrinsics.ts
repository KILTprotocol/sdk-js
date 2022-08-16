/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { Extrinsic } from '@polkadot/types/interfaces'
import type { SubmittableExtrinsicFunction } from '@polkadot/api/types'

import { BN } from '@polkadot/util'
import type {
  DidVerificationKey,
  IIdentity,
  SignCallback,
  SubmittableExtrinsic,
  VerificationKeyRelationship,
} from '@kiltprotocol/types'
import { SDKErrors } from '@kiltprotocol/utils'

import { FullDidDetails } from '../DidDetails/FullDidDetails.js'
import {
  getKeyRelationshipForExtrinsic,
  increaseNonce,
} from '../DidDetails/FullDidDetails.utils.js'

import { generateDidAuthenticatedTx } from '../Did.chain.js'
import { getSigningAlgorithmForVerificationKeyType } from '../Did.utils.js'

/**
 * Type of a callback used to select one of the key candidates for a DID to sign a given batch of extrinsics.
 */
type SelectKeyCallback = (
  keys: DidVerificationKey[],
  batch?: Extrinsic[]
) => Promise<DidVerificationKey>

async function defaultSelectKey([
  first,
]: DidVerificationKey[]): ReturnType<SelectKeyCallback> {
  return first
}

type GroupedExtrinsics = Array<{
  extrinsics: Extrinsic[]
  keyRelationship: VerificationKeyRelationship
}>

function groupExtrinsicsByKeyRelationship(
  extrinsics: Extrinsic[]
): GroupedExtrinsics {
  const [first, ...rest] = extrinsics.map((extrinsic) => {
    const keyRelationship = getKeyRelationshipForExtrinsic(extrinsic)
    if (keyRelationship === 'paymentAccount') {
      throw new SDKErrors.DidBuilderError(
        'Can only batch extrinsics that require a DID signature'
      )
    }
    return { extrinsic, keyRelationship }
  })

  const groups: GroupedExtrinsics = [
    {
      extrinsics: [first.extrinsic],
      keyRelationship: first.keyRelationship,
    },
  ]

  rest.forEach(({ extrinsic, keyRelationship }) => {
    const currentGroup = groups[groups.length - 1]
    const useCurrentGroup = keyRelationship === currentGroup.keyRelationship
    if (useCurrentGroup) {
      currentGroup.extrinsics.push(extrinsic)
    } else {
      groups.push({
        extrinsics: [extrinsic],
        keyRelationship,
      })
    }
  })

  return groups
}

export async function didAuthorizeExtrinsics({
  batchFunction,
  did,
  extrinsics,
  nonce,
  selectKey = defaultSelectKey,
  sign,
  submitter,
}: {
  batchFunction: SubmittableExtrinsicFunction<'promise'>
  did: FullDidDetails
  extrinsics: Extrinsic[]
  nonce?: BN
  selectKey?: SelectKeyCallback
  sign: SignCallback
  submitter: IIdentity['address']
}): Promise<SubmittableExtrinsic> {
  if (extrinsics.length === 0) {
    throw new SDKErrors.DidBuilderError(
      'Cannot build a batch with no transactions'
    )
  }

  if (extrinsics.length === 1) {
    return did.authorizeExtrinsic(extrinsics[0], sign, submitter, {
      keySelection: selectKey,
      txCounter: nonce,
    })
  }

  const groups = groupExtrinsicsByKeyRelationship(extrinsics)
  const firstNonce = nonce || (await did.getNextNonce())

  const promises = groups.map(async (group, batchIndex) => {
    const list = group.extrinsics
    const call = list.length === 1 ? list[0] : batchFunction(list)
    const txCounter = increaseNonce(firstNonce, batchIndex)

    const { keyRelationship } = group
    const keys = did.getVerificationKeys(keyRelationship)
    const signingKey = await selectKey(keys, list)
    if (!signingKey) {
      throw new SDKErrors.DidBuilderError(
        `Found no key for relationship "${keyRelationship}"`
      )
    }

    return generateDidAuthenticatedTx({
      didIdentifier: did.identifier,
      signingPublicKey: signingKey.publicKey,
      alg: getSigningAlgorithmForVerificationKeyType(signingKey.type),
      sign,
      call,
      txCounter,
      submitter,
    })
  })
  const batches = await Promise.all(promises)

  return batches.length === 1 ? batches[0] : batchFunction(batches)
}
