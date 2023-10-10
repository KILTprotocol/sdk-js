/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { Extrinsic } from '@polkadot/types/interfaces'
import type { SubmittableExtrinsicFunction } from '@polkadot/api/types'
import type {
  DidUri,
  KiltAddress,
  SignatureVerificationRelationship,
  SignExtrinsicCallback,
  SubmittableExtrinsic,
} from '@kiltprotocol/types'

import { BN } from '@polkadot/util'

import { ConfigService } from '@kiltprotocol/config'
import { SDKErrors } from '@kiltprotocol/utils'

import { parse } from '../Did.utils.js'
import {
  documentFromChain,
  generateDidAuthenticatedTx,
  toChain,
} from '../Did.chain.js'

// Must be in sync with what's implemented in impl did::DeriveDidCallAuthorizationVerificationKeyRelationship for Call
// in https://github.com/KILTprotocol/mashnet-node/blob/develop/runtimes/spiritnet/src/lib.rs
// TODO: Should have an RPC or something similar to avoid inconsistencies in the future.
const methodMapping: Record<
  string,
  SignatureVerificationRelationship | undefined
> = {
  attestation: 'assertionMethod',
  ctype: 'assertionMethod',
  delegation: 'capabilityDelegation',
  did: 'authentication',
  'did.create': undefined,
  'did.reclaimDeposit': undefined,
  'did.submitDidCall': undefined,
  didLookup: 'authentication',
  publicCredentials: 'assertionMethod',
  web3Names: 'authentication',
}

function getVerificationMethodRelationshipForRuntimeCall(
  call: Extrinsic['method']
): SignatureVerificationRelationship | undefined {
  const { section, method } = call

  // get the VerificationKeyRelationship of a batched call
  if (
    section === 'utility' &&
    ['batch', 'batchAll', 'forceBatch'].includes(method) &&
    call.args[0].toRawType() === 'Vec<Call>'
  ) {
    // map all calls to their VerificationKeyRelationship and deduplicate the items
    return (call.args[0] as unknown as Array<Extrinsic['method']>)
      .map(getVerificationMethodRelationshipForRuntimeCall)
      .reduce((prev, value) => (prev === value ? prev : undefined))
  }

  const signature = `${section}.${method}`
  if (signature in methodMapping) {
    return methodMapping[signature]
  }

  return methodMapping[section]
}

/**
 * Detect the verification relationship for a verification method which should be used to DID-authorize the provided extrinsic.
 *
 * @param extrinsic The unsigned extrinsic to inspect.
 * @returns The verification relationship.
 */
export function getVerificationMethodRelationshipForTx(
  extrinsic: Extrinsic
): SignatureVerificationRelationship | undefined {
  return getVerificationMethodRelationshipForRuntimeCall(extrinsic.method)
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
 * Signs and returns the provided unsigned extrinsic with the right DID verification method, if present. Otherwise, it will throw an error.
 *
 * @param did The DID data.
 * @param extrinsic The unsigned extrinsic to sign.
 * @param sign The callback to sign the operation.
 * @param submitterAccount The KILT account to bind the DID operation to (to avoid MitM and replay attacks).
 * @param signingOptions The signing options.
 * @param signingOptions.txCounter The optional DID nonce to include in the operation signatures. By default, it uses the next value of the nonce stored on chain.
 * @returns The DID-signed submittable extrinsic.
 */
export async function authorizeTx(
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

  const verificationMethodRelationship =
    getVerificationMethodRelationshipForTx(extrinsic)
  if (verificationMethodRelationship === undefined) {
    throw new SDKErrors.SDKError('No key relationship found for extrinsic')
  }

  return generateDidAuthenticatedTx({
    did,
    verificationMethodRelationship,
    sign,
    call: extrinsic,
    txCounter: txCounter || (await getNextNonce(did)),
    submitter: submitterAccount,
  })
}

type GroupedExtrinsics = Array<{
  extrinsics: Extrinsic[]
  verificationMethodRelationship: SignatureVerificationRelationship
}>

function groupExtrinsicsByKeyRelationship(
  extrinsics: Extrinsic[]
): GroupedExtrinsics {
  const [first, ...rest] = extrinsics.map((extrinsic) => {
    const verificationMethodRelationship =
      getVerificationMethodRelationshipForTx(extrinsic)
    if (verificationMethodRelationship === undefined) {
      throw new SDKErrors.DidBatchError(
        'Can only batch extrinsics that require a DID signature'
      )
    }
    return { extrinsic, verificationMethodRelationship }
  })

  const groups: GroupedExtrinsics = [
    {
      extrinsics: [first.extrinsic],
      verificationMethodRelationship: first.verificationMethodRelationship,
    },
  ]

  rest.forEach(({ extrinsic, verificationMethodRelationship }) => {
    const currentGroup = groups[groups.length - 1]
    const useCurrentGroup =
      verificationMethodRelationship ===
      currentGroup.verificationMethodRelationship
    if (useCurrentGroup) {
      currentGroup.extrinsics.push(extrinsic)
    } else {
      groups.push({
        extrinsics: [extrinsic],
        verificationMethodRelationship,
      })
    }
  })

  return groups
}

/**
 * Authorizes/signs a list of extrinsics grouping them in batches by required verification relationship.
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
    throw new SDKErrors.DidBatchError(
      'Cannot build a batch with no transactions'
    )
  }

  if (parse(did).type === 'light') {
    throw new SDKErrors.DidError(
      `An extrinsic can only be authorized with a full DID, not with "${did}"`
    )
  }

  if (extrinsics.length === 1) {
    return authorizeTx(did, extrinsics[0], sign, submitter, {
      txCounter: nonce,
    })
  }

  const groups = groupExtrinsicsByKeyRelationship(extrinsics)
  const firstNonce = nonce || (await getNextNonce(did))

  const promises = groups.map(async (group, batchIndex) => {
    const list = group.extrinsics
    const call = list.length === 1 ? list[0] : batchFunction(list)
    const txCounter = increaseNonce(firstNonce, batchIndex)

    const { verificationMethodRelationship } = group

    return generateDidAuthenticatedTx({
      did,
      verificationMethodRelationship,
      sign,
      call,
      txCounter,
      submitter,
    })
  })
  const batches = await Promise.all(promises)

  return batches.length === 1 ? batches[0] : batchFunction(batches)
}
