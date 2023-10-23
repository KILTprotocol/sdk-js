/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { Extrinsic } from '@polkadot/types/interfaces'
import type { SubmittableExtrinsicFunction } from '@polkadot/api/types'
import { BN } from '@polkadot/util'

import type {
  DidDocument,
  Did,
  KiltAddress,
  SignatureVerificationRelationship,
  SignerInterface,
  SubmittableExtrinsic,
} from '@kiltprotocol/types'

import { SDKErrors, Signers } from '@kiltprotocol/utils'
import { ConfigService } from '@kiltprotocol/config'

import {
  documentFromChain,
  generateDidAuthenticatedTx,
  toChain,
} from '../Did.chain.js'
import { parse } from '../Did.utils.js'
import { resolve } from '../DidResolver/DidResolver.js'

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

function getVerificationRelationshipForRuntimeCall(
  call: Extrinsic['method']
): SignatureVerificationRelationship | undefined {
  const { section, method } = call

  // get the VerificationRelationship of a batched call
  if (
    section === 'utility' &&
    ['batch', 'batchAll', 'forceBatch'].includes(method) &&
    call.args[0].toRawType() === 'Vec<Call>'
  ) {
    // map all calls to their VerificationRelationship and deduplicate the items
    return (call.args[0] as unknown as Array<Extrinsic['method']>)
      .map(getVerificationRelationshipForRuntimeCall)
      .reduce((prev, value) => (prev === value ? prev : undefined))
  }

  const signature = `${section}.${method}`
  if (signature in methodMapping) {
    return methodMapping[signature]
  }

  return methodMapping[section]
}

/**
 * Detect the relationship for a verification method which should be used to DID-authorize the provided extrinsic.
 *
 * @param extrinsic The unsigned extrinsic to inspect.
 * @returns The verification relationship.
 */
export function getVerificationRelationshipForTx(
  extrinsic: Extrinsic
): SignatureVerificationRelationship | undefined {
  return getVerificationRelationshipForRuntimeCall(extrinsic.method)
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
async function getNextNonce(did: Did): Promise<BN> {
  const api = ConfigService.get('api')
  const queried = await api.query.did.did(toChain(did))
  const currentNonce = queried.isSome
    ? documentFromChain(queried).lastTxCounter
    : new BN(0)
  return increaseNonce(currentNonce)
}

const { verifiableOnChain, byDid } = Signers.select

/**
 * Signs and returns the provided unsigned extrinsic with the right DID verification method, if present. Otherwise, it will throw an error.
 *
 * @param did The DID or DID Document of the authorizing DID.
 * @param extrinsic The unsigned extrinsic to sign.
 * @param signers An array of signer interfaces. The function will select the appropriate signer for signing this extrinsic.
 * @param submitterAccount The KILT account to bind the DID operation to (to avoid MitM and replay attacks).
 * @param signingOptions The signing options.
 * @param signingOptions.txCounter The optional DID nonce to include in the operation signatures. By default, it uses the next value of the nonce stored on chain.
 * @returns The DID-signed submittable extrinsic.
 */
export async function authorizeTx(
  did: Did | DidDocument,
  extrinsic: Extrinsic,
  signers: SignerInterface[],
  submitterAccount: KiltAddress,
  {
    txCounter,
  }: {
    txCounter?: BN
  } = {}
): Promise<SubmittableExtrinsic> {
  let didUri: Did
  let didDocument: DidDocument | undefined
  if (typeof did === 'string') {
    didUri = did
  } else {
    didUri = did.id
    didDocument = did
  }

  if (parse(didUri).type === 'light') {
    throw new SDKErrors.DidError(
      `An extrinsic can only be authorized with a full DID, not with "${did}"`
    )
  }

  const verificationRelationship = getVerificationRelationshipForTx(extrinsic)
  if (verificationRelationship === undefined) {
    throw new SDKErrors.SDKError(
      'No verification relationship found for extrinsic'
    )
  }

  if (!didDocument) {
    didDocument = (await resolve(didUri)).didDocument as DidDocument
  }
  if (!didDocument?.id) {
    throw new SDKErrors.DidNotFoundError('failed to resolve signer DID')
  }
  const signer = await Signers.selectSigner(
    signers,
    verifiableOnChain(),
    byDid(didDocument, { verificationRelationship })
  )
  if (typeof signer === 'undefined') {
    throw new SDKErrors.NoSuitableSignerError(undefined, {
      signerRequirements: {
        did: didDocument.id,
        verificationRelationship,
        algorithm: Signers.DID_PALLET_SUPPORTED_ALGORITHMS,
      },
    })
  }

  return generateDidAuthenticatedTx({
    did: didUri,
    signer,
    call: extrinsic,
    txCounter: txCounter || (await getNextNonce(didUri)),
    submitter: submitterAccount,
  })
}

type GroupedExtrinsics = Array<{
  extrinsics: Extrinsic[]
  verificationRelationship: SignatureVerificationRelationship
}>

function groupExtrinsicsByVerificationRelationship(
  extrinsics: Extrinsic[]
): GroupedExtrinsics {
  const [first, ...rest] = extrinsics.map((extrinsic) => {
    const verificationRelationship = getVerificationRelationshipForTx(extrinsic)
    if (!verificationRelationship) {
      throw new SDKErrors.DidBatchError(
        'Can only batch extrinsics that require a DID signature'
      )
    }
    return { extrinsic, verificationRelationship }
  })

  const groups: GroupedExtrinsics = [
    {
      extrinsics: [first.extrinsic],
      verificationRelationship: first.verificationRelationship,
    },
  ]

  rest.forEach(({ extrinsic, verificationRelationship }) => {
    const currentGroup = groups[groups.length - 1]
    const useCurrentGroup =
      verificationRelationship === currentGroup.verificationRelationship
    if (useCurrentGroup) {
      currentGroup.extrinsics.push(extrinsic)
    } else {
      groups.push({
        extrinsics: [extrinsic],
        verificationRelationship,
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
 * @param input.did The DID or DID Document of the authorizing DID.
 * @param input.extrinsics The array of unsigned extrinsics to sign.
 * @param input.signers An array of signer interfaces. The function will select the appropriate signer for signing each extrinsic.
 * @param input.submitter The KILT account to bind the DID operation to (to avoid MitM and replay attacks).
 * @param input.nonce The optional nonce to use for the first batch, next batches will use incremented value.
 * @returns The DID-signed submittable extrinsic.
 */
export async function authorizeBatch({
  batchFunction,
  did,
  extrinsics,
  nonce,
  signers,
  submitter,
}: {
  batchFunction: SubmittableExtrinsicFunction<'promise'>
  did: Did | DidDocument
  extrinsics: Extrinsic[]
  nonce?: BN
  signers: SignerInterface[]
  submitter: KiltAddress
}): Promise<SubmittableExtrinsic> {
  if (extrinsics.length === 0) {
    throw new SDKErrors.DidBatchError(
      'Cannot build a batch with no transactions'
    )
  }

  let didUri: Did
  let didDocument: DidDocument | undefined
  if (typeof did === 'string') {
    didUri = did
  } else {
    didUri = did.id
    didDocument = did
  }

  if (parse(didUri).type === 'light') {
    throw new SDKErrors.DidError(
      `An extrinsic can only be authorized with a full DID, not with "${did}"`
    )
  }

  if (extrinsics.length === 1) {
    return authorizeTx(did, extrinsics[0], signers, submitter, {
      txCounter: nonce,
    })
  }

  const groups = groupExtrinsicsByVerificationRelationship(extrinsics)
  const firstNonce = nonce || (await getNextNonce(didUri))

  // resolve DID document beforehand to avoid resolving in loop
  if (!didDocument) {
    didDocument = (await resolve(didUri)).didDocument
  }
  if (typeof didDocument?.id !== 'string') {
    throw new SDKErrors.DidNotFoundError('failed to resolve signer DID')
  }

  const promises = groups.map(async (group, batchIndex) => {
    const list = group.extrinsics
    const call = list.length === 1 ? list[0] : batchFunction(list)
    const txCounter = increaseNonce(firstNonce, batchIndex)

    const { verificationRelationship } = group

    const signer = await Signers.selectSigner(
      signers,
      verifiableOnChain(),
      byDid(didDocument as DidDocument, { verificationRelationship })
    )
    if (typeof signer === 'undefined') {
      throw new SDKErrors.NoSuitableSignerError(undefined, {
        signerRequirements: {
          did: (didDocument as DidDocument).id,
          verificationRelationship,
          algorithm: Signers.DID_PALLET_SUPPORTED_ALGORITHMS,
        },
      })
    }

    return generateDidAuthenticatedTx({
      did: didUri,
      signer,
      call,
      txCounter,
      submitter,
    })
  })
  const batches = await Promise.all(promises)

  return batches.length === 1 ? batches[0] : batchFunction(batches)
}
