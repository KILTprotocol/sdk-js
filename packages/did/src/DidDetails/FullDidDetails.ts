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
  DidDetails,
  DidUri,
  DidVerificationKey,
  KiltAddress,
  SignCallback,
  SubmittableExtrinsic,
  VerificationKeyRelationship,
} from '@kiltprotocol/types'

import { SDKErrors } from '@kiltprotocol/utils'
import { BlockchainApiConnection } from '@kiltprotocol/chain-helpers'

import {
  decodeDid,
  encodeDid,
  generateDidAuthenticatedTx,
  queryServiceEndpoints,
} from '../Did.chain.js'
import { parseDidUri, signatureAlgForKeyType } from '../Did.utils.js'

import {
  getKeyRelationshipForExtrinsic,
  increaseNonce,
} from './FullDidDetails.utils.js'

/**
 * Fetches [[DidDetails]] from the blockchain. [[resolve]] provides more detailed output.
 * Private keys are assumed to already live in another storage, as only the public keys are retrieved from the blockchain.
 *
 * @param didUri The URI of the DID to fetch.
 *
 * @returns The fetched [[DidDetails]], or null if DID does not exist.
 */
export async function query(didUri: DidUri): Promise<DidDetails | null> {
  const { fragment, type } = parseDidUri(didUri)
  if (fragment) {
    throw new SDKErrors.DidError(`DID URI cannot contain fragment: "${didUri}"`)
  }
  if (type !== 'full') {
    throw new SDKErrors.DidError(
      `DID URI "${didUri}" does not refer to a full DID`
    )
  }

  const api = await BlockchainApiConnection.getConnectionOrConnect()
  const encoded = await api.query.did.did(encodeDid(didUri))
  if (encoded.isNone) return null
  const didRec = decodeDid(encoded)

  const details: DidDetails = {
    uri: didUri,
    authentication: didRec.authentication,
    assertionMethod: didRec.assertionMethod,
    capabilityDelegation: didRec.capabilityDelegation,
    keyAgreement: didRec.keyAgreement,
  }

  const service = await queryServiceEndpoints(didUri)
  if (service.length > 0) {
    details.service = service
  }

  return details
}

/**
 * Returns all the DID keys that could be used to sign the provided extrinsic for submission.
 * This function should never be used directly by SDK users, who should rather call [[Did.authorizeExtrinsic]].
 *
 * @param did The DID data.
 * @param extrinsic The unsigned extrinsic to perform the lookup.
 *
 * @returns All the keys under the full DID that could be used to generate valid signatures to submit the provided extrinsic.
 */
export function getKeysForExtrinsic(
  did: DidDetails,
  extrinsic: Extrinsic
): DidVerificationKey[] {
  const keyRelationship = getKeyRelationshipForExtrinsic(extrinsic)
  return (keyRelationship && did[keyRelationship]) || []
}

/**
 * Returns the next nonce to use to sign a DID operation.
 * Normally, this function should not be called directly by SDK users. Nevertheless, in advanced cases where there might be race conditions, this function can be used as the basis on which to build parallel operation queues.
 *
 * @param did The DID data.
 * @returns The next valid nonce, i.e., the nonce currently stored on the blockchain + 1, wrapping around the max value when reached.
 */
export async function getNextNonce(did: DidDetails): Promise<BN> {
  const api = await BlockchainApiConnection.getConnectionOrConnect()
  const queried = await api.query.did.did(encodeDid(did.uri))
  const currentNonce = queried.isSome
    ? decodeDid(queried).lastTxCounter
    : new BN(0)
  return increaseNonce(currentNonce)
}

/**
 * Signs and returns the provided unsigned extrinsic with the right DID key, if present. Otherwise, it will throw an error.
 *
 * @param did The DID data.
 * @param extrinsic The unsigned extrinsic to sign.
 * @param sign The callback to sign the operation.
 * @param submitterAccount The KILT account to bind the DID operation to (to avoid MitM and replay attacks).
 * @param signingOptions The signing options.
 * @param signingOptions.txCounter The optional DID nonce to include in the operation signatures. By default, it uses the next value of the nonce stored on chain.
 * @returns The DID-signed submittable extrinsic.
 */
export async function authorizeExtrinsic(
  did: DidDetails,
  extrinsic: Extrinsic,
  sign: SignCallback,
  submitterAccount: KiltAddress,
  {
    txCounter,
  }: {
    txCounter?: BN
  } = {}
): Promise<SubmittableExtrinsic> {
  const { uri } = did
  if (parseDidUri(uri).type === 'light') {
    throw new SDKErrors.DidError(
      `An extrinsic can only be authorized with a full DID, not with "${uri}"`
    )
  }

  const [signingKey] = getKeysForExtrinsic(did, extrinsic)
  if (!signingKey) {
    throw new SDKErrors.DidError(
      `The details for DID "${uri}" do not contain the required keys for this operation`
    )
  }
  return generateDidAuthenticatedTx({
    did: did.uri,
    signingPublicKey: signingKey.publicKey,
    alg: signatureAlgForKeyType[signingKey.type],
    sign,
    call: extrinsic,
    txCounter: txCounter || (await getNextNonce(did)),
    submitter: submitterAccount,
  })
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
    if (!keyRelationship) {
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

/**
 * Authorizes/signs a list of extrinsics grouping them in batches by required key type.
 *
 * @param input The object with named parameters.
 * @param input.batchFunction The batch function to use, for example `api.tx.utility.batchAll`.
 * @param input.did The DID details.
 * @param input.extrinsics The array of unsigned extrinsics to sign.
 * @param input.sign The callback to sign the operation.
 * @param input.submitter The KILT account to bind the DID operation to (to avoid MitM and replay attacks).
 * @param input.nonce The optional nonce to use for the first batch, next batches will use incremented value.
 * @returns The DID-signed submittable extrinsic.
 */
export async function authorizeBatch({
  batchFunction,
  did,
  extrinsics,
  nonce,
  sign,
  submitter,
}: {
  batchFunction: SubmittableExtrinsicFunction<'promise'>
  did: DidDetails
  extrinsics: Extrinsic[]
  nonce?: BN
  sign: SignCallback
  submitter: KiltAddress
}): Promise<SubmittableExtrinsic> {
  if (extrinsics.length === 0) {
    throw new SDKErrors.DidBuilderError(
      'Cannot build a batch with no transactions'
    )
  }

  const { uri } = did
  if (parseDidUri(uri).type === 'light') {
    throw new SDKErrors.DidError(
      `An extrinsic can only be authorized with a full DID, not with "${uri}"`
    )
  }

  if (extrinsics.length === 1) {
    return authorizeExtrinsic(did, extrinsics[0], sign, submitter, {
      txCounter: nonce,
    })
  }

  const groups = groupExtrinsicsByKeyRelationship(extrinsics)
  const firstNonce = nonce || (await getNextNonce(did))

  const promises = groups.map(async (group, batchIndex) => {
    const list = group.extrinsics
    const call = list.length === 1 ? list[0] : batchFunction(list)
    const txCounter = increaseNonce(firstNonce, batchIndex)

    const { keyRelationship } = group
    const [signingKey] = did[keyRelationship] || []
    if (!signingKey) {
      throw new SDKErrors.DidBuilderError(
        `Found no key for relationship "${keyRelationship}"`
      )
    }

    return generateDidAuthenticatedTx({
      did: did.uri,
      signingPublicKey: signingKey.publicKey,
      alg: signatureAlgForKeyType[signingKey.type],
      sign,
      call,
      txCounter,
      submitter,
    })
  })
  const batches = await Promise.all(promises)

  return batches.length === 1 ? batches[0] : batchFunction(batches)
}
