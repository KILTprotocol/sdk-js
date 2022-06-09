/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type {
  IRequestForAttestation,
  IDidResolver,
  ICType,
} from '@kiltprotocol/types'
import { KeyRelationship } from '@kiltprotocol/types'
import { DataUtils, SDKErrors } from '@kiltprotocol/utils'
import { DidResolver, Utils as DidUtils } from '@kiltprotocol/did'
import * as Claim from '../claim/index.js'
import { verifyClaimAgainstSchema } from '../ctype/index.js'
import { Credential } from '../credential/index.js'
import * as RequestForAttestationUtils from './utils.js'
import { makeSigningData } from './utils.js'

export function verifyRootHash(input: IRequestForAttestation): boolean {
  return input.rootHash === RequestForAttestationUtils.calculateRootHash(input)
}

/**
 * Verifies the data of the [[RequestForAttestation]] object; used to check that the data was not tampered with, by checking the data against hashes.
 *
 * @param input - The [[RequestForAttestation]] for which to verify data.
 * @returns Whether the data is valid.
 * @throws [[ERROR_CLAIM_NONCE_MAP_MALFORMED]] when any key of the claim contents could not be found in the claimHashTree.
 * @throws [[ERROR_ROOT_HASH_UNVERIFIABLE]] when the rootHash is not verifiable.
 */
export function verifyDataIntegrity(input: IRequestForAttestation): boolean {
  // check claim hash
  if (!verifyRootHash(input)) {
    throw new SDKErrors.ERROR_ROOT_HASH_UNVERIFIABLE()
  }

  // verify properties against selective disclosure proof
  const verificationResult = Claim.verifyDisclosedAttributes(input.claim, {
    nonces: input.claimNonceMap,
    hashes: input.claimHashes,
  })
  // TODO: how do we want to deal with multiple errors during claim verification?
  if (!verificationResult.verified)
    throw (
      verificationResult.errors[0] || new SDKErrors.ERROR_CLAIM_UNVERIFIABLE()
    )

  // check legitimations
  Credential.validateLegitimations(input.legitimations)

  return true
}

/**
 *  Checks whether the input meets all the required criteria of an IRequestForAttestation object.
 *  Throws on invalid input.
 *
 * @param input - A potentially only partial [[IRequestForAttestation]].
 * @throws [[ERROR_CLAIM_NOT_PROVIDED]], [[ERROR_LEGITIMATIONS_NOT_PROVIDED]], [[ERROR_CLAIM_NONCE_MAP_NOT_PROVIDED]] or [[ERROR_DELEGATION_ID_TYPE]] when either the input's claim, legitimations, claimHashTree or DelegationId are not provided or of the wrong type, respectively.
 * @throws [[ERROR_CLAIM_NONCE_MAP_MALFORMED]] when any of the input's claimHashTree's keys missing their hash.
 *
 */
export function verifyDataStructure(input: IRequestForAttestation): void {
  if (!input.claim) {
    throw new SDKErrors.ERROR_CLAIM_NOT_PROVIDED()
  } else {
    Claim.verifyDataStructure(input.claim)
  }
  if (!input.claim.owner) {
    throw new SDKErrors.ERROR_OWNER_NOT_PROVIDED()
  }
  if (!input.legitimations && !Array.isArray(input.legitimations)) {
    throw new SDKErrors.ERROR_LEGITIMATIONS_NOT_PROVIDED()
  }

  if (!input.claimNonceMap) {
    throw new SDKErrors.ERROR_CLAIM_NONCE_MAP_NOT_PROVIDED()
  }
  if (
    typeof input.claimNonceMap !== 'object' ||
    Object.entries(input.claimNonceMap).some(
      ([digest, nonce]) =>
        !digest ||
        !DataUtils.validateHash(digest, 'statement digest') ||
        typeof nonce !== 'string' ||
        !nonce
    )
  ) {
    throw new SDKErrors.ERROR_CLAIM_NONCE_MAP_MALFORMED()
  }
  if (typeof input.delegationId !== 'string' && !input.delegationId === null) {
    throw new SDKErrors.ERROR_DELEGATION_ID_TYPE()
  }
  if (input.claimerSignature)
    DidUtils.validateDidSignature(input.claimerSignature)
  verifyDataIntegrity(input as IRequestForAttestation)
}

/**
 *  Checks the [[RequestForAttestation]] with a given [[CType]] to check if the included claim meets the [[schema]] structure.
 *
 * @param requestForAttestation A [[RequestForAttestation]] object for the attester.
 * @param ctype A [[CType]] to verify the [[Claim]] structure.
 *
 * @returns A boolean if the [[Claim]] structure in the [[RequestForAttestation]] is valid.
 */
export function verifyAgainstCType(
  requestForAttestation: IRequestForAttestation,
  ctype: ICType
): boolean {
  try {
    verifyDataStructure(requestForAttestation)
  } catch {
    return false
  }
  return verifyClaimAgainstSchema(
    requestForAttestation.claim.contents,
    ctype.schema
  )
}

/**
 * [STATIC] [ASYNC] Verifies the signature of the [[RequestForAttestation]] object.
 * It supports migrated DIDs, meaning that if the original claim within the [[RequestForAttestation]] included a light DID that was afterwards upgraded,
 * the signature over the presentation **must** be generated with the full DID in order for the verification to be successful.
 * On the other hand, a light DID that has been migrated and then deleted from the chain will not be allowed to generate valid presentations anymore.
 *
 * @param input - The [[RequestForAttestation]].
 * @param verificationOpts Additional options to retrieve the details from the identifiers inside the request for attestation.
 * @param verificationOpts.resolver - The resolver used to resolve the claimer's identity. Defaults to [[DidResolver]].
 * @param verificationOpts.challenge - The expected value of the challenge. Verification will fail in case of a mismatch.
 * @throws [[ERROR_IDENTITY_MISMATCH]] if the DidDetails do not match the claim owner or if the light DID is used after it has been upgraded.
 * @returns Whether the signature is correct.
 */
export async function verifySignature(
  input: IRequestForAttestation,
  {
    challenge,
    resolver = DidResolver,
  }: {
    challenge?: string
    resolver?: IDidResolver
  } = {}
): Promise<boolean> {
  const { claimerSignature } = input
  if (!claimerSignature) return false
  if (challenge && challenge !== claimerSignature.challenge) return false
  const signingData = makeSigningData(input, claimerSignature.challenge)
  const { verified } = await DidUtils.verifyDidSignature({
    signature: claimerSignature,
    message: signingData,
    expectedVerificationMethod: KeyRelationship.authentication,
    resolver,
  })
  return verified
}
