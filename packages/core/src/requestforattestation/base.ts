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
  IClaim,
  IDidResolver,
  IDelegationNode,
  ICredential,
  ICType,
} from '@kiltprotocol/types'
import { SDKErrors } from '@kiltprotocol/utils'
import { DidResolver } from '@kiltprotocol/did'
import * as ClaimUtils from '../claim/utils.js'
import * as RequestForAttestationUtils from './utils.js'
import {
  verifyAgainstCType,
  verifyDataIntegrity,
  verifyDataStructure,
  verifySignature,
} from './verification.js'

export type Options = {
  legitimations?: ICredential[]
  delegationId?: IDelegationNode['id']
}

/**
 * [STATIC] Builds a new [[RequestForAttestation]] object, from a complete set of required parameters.
 *
 * @param claim An `IClaim` object the request for attestation is built for.
 * @param option Container for different options that can be passed to this method.
 * @param option.legitimations Array of [[Credential]] objects of the Attester which the Claimer requests to include into the attestation as legitimations.
 * @param option.delegationId The id of the DelegationNode of the Attester, which should be used in the attestation.
 * @returns A new [[RequestForAttestation]] object.
 * @example ```javascript
 * const input = RequestForAttestation.fromClaim(claim);
 * ```
 */
export function fromClaim(
  claim: IClaim,
  { legitimations, delegationId }: Options = {}
): IRequestForAttestation {
  const { hashes: claimHashes, nonceMap: claimNonceMap } =
    ClaimUtils.hashClaimContents(claim)

  const rootHash = RequestForAttestationUtils.calculateRootHash({
    legitimations,
    claimHashes,
    delegationId,
  })

  // signature will be added afterwards!
  const request = {
    claim,
    legitimations: legitimations || [],
    claimHashes,
    claimNonceMap,
    rootHash,
    delegationId: delegationId || null,
  }
  verifyDataStructure(request)
  verifyDataIntegrity(request)
  return request
}

type VerifyOptions = {
  ctype?: ICType
  challenge?: string
  resolver?: IDidResolver
}
/**
 * Verifies data structure and integrity.
 *
 * @param requestForAttestation - The object to check.
 * @param options - Additional parameter for more verification step.
 * @param options.ctype - Ctype which the included claim should be checked against.
 * @param options.challenge -  The expected value of the challenge. Verification will fail in case of a mismatch.
 * @param options.resolver - The resolver used to resolve the claimer's identity. Defaults to [[DidResolver]].
 * @throws - If a check fails.
 */
export async function verify(
  requestForAttestation: IRequestForAttestation,
  { ctype, challenge, resolver = DidResolver }: VerifyOptions = {}
): Promise<void> {
  verifyDataStructure(requestForAttestation)
  verifyDataIntegrity(requestForAttestation)

  if (ctype) {
    const isSchemaValid = verifyAgainstCType(requestForAttestation, ctype)
    if (!isSchemaValid) throw SDKErrors.ERROR_CREDENTIAL_UNVERIFIABLE()
  }

  if (challenge) {
    const isSignatureCorrect = verifySignature(requestForAttestation, {
      challenge,
      resolver,
    })
    if (!isSignatureCorrect) throw SDKErrors.ERROR_SIGNATURE_UNVERIFIABLE()
  }
}

/**
 * [STATIC] Custom Type Guard to determine input being of type IRequestForAttestation..
 *
 * @param input - A potentially only partial [[IRequestForAttestation]].
 *
 * @returns  Boolean whether input is of type IRequestForAttestation.
 */
export function isIRequestForAttestation(
  input: unknown
): input is IRequestForAttestation {
  try {
    verifyDataStructure(input as IRequestForAttestation)
  } catch (error) {
    return false
  }
  return true
}
