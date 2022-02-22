/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * Requests for attestation are a core building block of the KILT SDK.
 * A RequestForAttestation represents a [[Claim]] which needs to be validated. In practice, the RequestForAttestation is sent from a claimer to an attester.
 *
 * A RequestForAttestation object contains the [[Claim]] and its hash, and legitimations/delegationId of the attester.
 * It's signed by the claimer, to make it tamper-proof (`claimerSignature` is a property of [[Claim]]).
 * A RequestForAttestation also supports hiding of claim data during a credential presentation.
 *
 * @packageDocumentation
 * @module RequestForAttestation
 */

import type {
  IRequestForAttestation,
  IDidResolver,
  ICType,
} from '@kiltprotocol/types'
import { KeyRelationship } from '@kiltprotocol/types'
import { DataUtils, SDKErrors } from '@kiltprotocol/utils'
import { DidResolver, DidUtils } from '@kiltprotocol/did'
import * as ClaimUtils from '../claim/utils.js'
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
 * @example ```javascript
 * const reqForAtt = RequestForAttestation.fromClaim(claim);
 * RequestForAttestation.verifyData(reqForAtt); // returns true if the data is correct
 * ```
 */
export function verifyDataIntegrity(input: IRequestForAttestation): boolean {
  // check claim hash
  if (!verifyRootHash(input)) {
    throw SDKErrors.ERROR_ROOT_HASH_UNVERIFIABLE()
  }

  // verify properties against selective disclosure proof
  const verificationResult = ClaimUtils.verifyDisclosedAttributes(input.claim, {
    nonces: input.claimNonceMap,
    hashes: input.claimHashes,
  })
  // TODO: how do we want to deal with multiple errors during claim verification?
  if (!verificationResult.verified)
    throw verificationResult.errors[0] || SDKErrors.ERROR_CLAIM_UNVERIFIABLE()

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
    throw SDKErrors.ERROR_CLAIM_NOT_PROVIDED()
  } else {
    ClaimUtils.verifyDataStructure(input.claim)
  }
  if (!input.claim.owner) {
    throw SDKErrors.ERROR_OWNER_NOT_PROVIDED()
  }
  if (!input.legitimations && !Array.isArray(input.legitimations)) {
    throw SDKErrors.ERROR_LEGITIMATIONS_NOT_PROVIDED()
  }

  if (!input.claimNonceMap) {
    throw SDKErrors.ERROR_CLAIM_NONCE_MAP_NOT_PROVIDED()
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
    throw SDKErrors.ERROR_CLAIM_NONCE_MAP_MALFORMED()
  }
  if (typeof input.delegationId !== 'string' && !input.delegationId === null) {
    throw SDKErrors.ERROR_DELEGATION_ID_TYPE
  }
  if (input.claimerSignature)
    DidUtils.validateDidSignature(input.claimerSignature)
  verifyDataIntegrity(input as IRequestForAttestation)
}

/**
 *  Checks the [[RequestForAttestation]] with a given [[CType]] to check if the included claim meets the [[schema]] structure.
 *
 * @param RequestForAttestation A [[RequestForAttestation]] object for the attester.
 * @param ctype A [[CType]] to verify the [[Claim]] structure.
 *
 * @returns A boolean if the [[Claim]] structure in the [[RequestForAttestation]] is valid.
 */

export function verifyAgainstCType(
  requestForAttestation: IRequestForAttestation,
  ctype: ICType
): boolean {
  verifyDataStructure(requestForAttestation)
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
 * @example ```javascript
 * const reqForAtt = RequestForAttestation.fromClaim(claim);
 * await reqForAtt.signWithDid(myKeystore, myDidDetails);
 * RequestForAttestation.verifySignature(reqForAtt); // returns `true` if the signature is correct
 * ```
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
