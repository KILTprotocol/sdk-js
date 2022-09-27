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
  DidDocument,
  DidUri,
  DidVerificationKey,
  KiltAddress,
  SignExtrinsicCallback,
  SubmittableExtrinsic,
  VerificationKeyRelationship,
} from '@kiltprotocol/types'

import { SDKErrors } from '@kiltprotocol/utils'
import { ConfigService } from '@kiltprotocol/config'

import {
  documentFromChain,
  generateDidAuthenticatedTx,
  servicesFromChain,
  toChain,
} from '../Did.chain.js'
import { parse } from '../Did.utils.js'

/**
 * Fetches [[DidDocument]] from the blockchain. [[resolve]] provides more detailed output.
 * Private keys are assumed to already live in another storage, as only the public keys are retrieved from the blockchain.
 *
 * @param didUri The URI of the DID to fetch.
 *
 * @returns The fetched [[DidDocument]], or throws Error if DID does not exist.
 */
export async function query(didUri: DidUri): Promise<DidDocument> {
  const { fragment, type } = parse(didUri)
  if (fragment) {
    throw new SDKErrors.DidError(`DID URI cannot contain fragment: "${didUri}"`)
  }
  if (type !== 'full') {
    throw new SDKErrors.DidError(
      `DID URI "${didUri}" does not refer to a full DID`
    )
  }

  const api = ConfigService.get('api')
  const encoded = await api.query.did.did(toChain(didUri))
  if (encoded.isNone) throw new SDKErrors.DidNotFoundError()
  const didRec = documentFromChain(encoded)

  const did: DidDocument = {
    uri: didUri,
    authentication: didRec.authentication,
    assertionMethod: didRec.assertionMethod,
    capabilityDelegation: didRec.capabilityDelegation,
    keyAgreement: didRec.keyAgreement,
  }

  const service = servicesFromChain(
    await api.query.did.serviceEndpoints.entries(toChain(didUri))
  )
  if (service.length > 0) {
    did.service = service
  }

  return did
}

// Must be in sync with what's implemented in impl did::DeriveDidCallAuthorizationVerificationKeyRelationship for Call
// in https://github.com/KILTprotocol/mashnet-node/blob/develop/runtimes/spiritnet/src/lib.rs
// TODO: Should have an RPC or something similar to avoid inconsistencies in the future.
const methodMapping: Record<string, VerificationKeyRelationship | undefined> = {
  attestation: 'assertionMethod',
  ctype: 'assertionMethod',
  delegation: 'capabilityDelegation',
  did: 'authentication',
  'did.create': undefined,
  'did.reclaimDeposit': undefined,
  'did.submitDidCall': undefined,
  didLookup: 'authentication',
  web3Names: 'authentication',
}

function getKeyRelationshipForMethod(
  call: Extrinsic['method']
): VerificationKeyRelationship | undefined {
  const { section, method } = call

  // get the VerificationKeyRelationship of a batched call
  if (
    section === 'utility' &&
    ['batch', 'batchAll', 'forceBatch'].includes(method) &&
    call.args[0].toRawType() === 'Vec<Call>'
  ) {
    // map all calls to their VerificationKeyRelationship and deduplicate the items
    return (call.args[0] as unknown as Array<Extrinsic['method']>)
      .map(getKeyRelationshipForMethod)
      .reduce((prev, value) => (prev === value ? prev : undefined))
  }

  const signature = `${section}.${method}`
  if (signature in methodMapping) {
    return methodMapping[signature]
  }

  return methodMapping[section]
}

export function getKeyRelationshipForExtrinsic(
  extrinsic: Extrinsic
): VerificationKeyRelationship | undefined {
  return getKeyRelationshipForMethod(extrinsic.method)
}

// Max nonce value is (2^64) - 1
const maxNonceValue = new BN(2).pow(new BN(64)).subn(1)

function increaseNonce(currentNonce: BN, increment = 1): BN {
  // Wrap around the max u64 value when reached.
  // FIXME: can we do better than this? Maybe we could expose an RPC function for this, to keep it consistent over time.
  return currentNonce.eq(maxNonceValue)
    ? new BN(increment)
    : currentNonce.addn(increment)
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
  did: DidDocument,
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
async function getNextNonce(did: DidUri): Promise<BN> {
  const api = ConfigService.get('api')
  const queried = await api.query.did.did(toChain(did))
  const currentNonce = queried.isSome
    ? documentFromChain(queried).lastTxCounter
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
  did: DidUri,
  extrinsic: Extrinsic,
  sign: SignExtrinsicCallback,
  submitterAccount: KiltAddress,
  {
    txCounter,
  }: {
    txCounter?: BN
  } = {}
): Promise<SubmittableExtrinsic> {
  if (parse(did).type === 'light') {
    throw new SDKErrors.DidError(
      `An extrinsic can only be authorized with a full DID, not with "${did}"`
    )
  }

  const keyRelationship = getKeyRelationshipForExtrinsic(extrinsic)
  if (keyRelationship === undefined) {
    throw new SDKErrors.SDKError('No key relationship found for extrinsic')
  }

  return generateDidAuthenticatedTx({
    did,
    keyRelationship,
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
 * @param input.did The DID document.
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
  did: DidUri
  extrinsics: Extrinsic[]
  nonce?: BN
  sign: SignExtrinsicCallback
  submitter: KiltAddress
}): Promise<SubmittableExtrinsic> {
  if (extrinsics.length === 0) {
    throw new SDKErrors.DidBuilderError(
      'Cannot build a batch with no transactions'
    )
  }

  if (parse(did).type === 'light') {
    throw new SDKErrors.DidError(
      `An extrinsic can only be authorized with a full DID, not with "${did}"`
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

    return generateDidAuthenticatedTx({
      did,
      keyRelationship,
      sign,
      call,
      txCounter,
      submitter,
    })
  })
  const batches = await Promise.all(promises)

  return batches.length === 1 ? batches[0] : batchFunction(batches)
}
