/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { Attestation, CType } from '@kiltprotocol/core'
import type { ApiPromise } from '@polkadot/api'
import { u8aToHex } from '@polkadot/util'
import { Caip2 } from './CAIP/index.js'
import { KILT_REVOCATION_STATUS_V1_TYPE } from './constants.js'
import { credentialIdToRootHash } from './KiltCredentialV1.js'
import type { KiltRevocationStatusV1, VerifiableCredential } from './types.js'
import type { VerificationResult } from './verificationUtils.js'

/**
 * Check attestation and revocation status of a credential at the latest block available.
 *
 * @param api A polkadot-js/api instance connected to the blockchain network on which the credential is anchored.
 * @param credentialStatus A [[KiltRevocationStatusV1]] object.
 * @param credential The KiltCredentialV1 to which the status method is linked to.
 * @returns Object indicating whether the credential is currently attested or revoked.
 */
export async function checkStatus(
  api: ApiPromise,
  credentialStatus: KiltRevocationStatusV1,
  credential: VerifiableCredential
): Promise<VerificationResult> {
  try {
    if (credentialStatus.type !== KILT_REVOCATION_STATUS_V1_TYPE)
      throw new Error('method type mismatch')
    const apiChainId = Caip2.chainIdFromGenesis(api.genesisHash)
    if (apiChainId !== credentialStatus.id)
      throw new Error(
        `api must be connected to network ${credentialStatus.id} to verify this credential`
      )
    const rootHash = credentialIdToRootHash(credential.id)
    const encoded = await api.query.attestation.attestations(rootHash)
    if (encoded.isNone)
      throw new Error(
        `Attestation data not found at latest block ${encoded.createdAtHash}`
      )

    const decoded = Attestation.fromChain(encoded, u8aToHex(rootHash))
    const onChainCType = CType.hashToId(decoded.cTypeHash)
    if (
      decoded.owner !== credential.issuer ||
      onChainCType !== credential.credentialSchema.id
    ) {
      throw new Error(
        `Credential not matching on-chain data: issuer "${decoded.owner}", CType: "${onChainCType}"`
      )
    }
    if (decoded.revoked !== false) {
      throw new Error('Attestation revoked')
    }
  } catch (e) {
    return {
      verified: false,
      errors: [e as Error],
    }
  }
  return { verified: true, errors: [] }
}
