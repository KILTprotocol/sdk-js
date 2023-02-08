/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { Attestation, CType } from '@kiltprotocol/core'
import type { ApiPromise } from '@polkadot/api'
import { u8aToHex } from '@polkadot/util'
import { base58Decode } from '@polkadot/util-crypto'
import { Caip19, Caip2 } from './CAIP/index.js'
import {
  KILT_ATTESTER_DELEGATION_V1_TYPE,
  KILT_REVOCATION_STATUS_V1_TYPE,
} from './constants.js'
import { delegationIdFromAttesterDelegation } from './KiltCredentialV1.js'
import type {
  KiltAttesterDelegationV1,
  KiltRevocationStatusV1,
  VerifiableCredential,
} from './types.js'

/**
 * Check attestation and revocation status of a credential at the latest block available.
 *
 * @param api A polkadot-js/api instance connected to the blockchain network on which the credential is anchored.
 * @param credentialStatus A [[KiltRevocationStatusV1]] object.
 * @param credential The KiltCredentialV1 to which the status method is linked to.
 */
export async function checkStatus(
  api: ApiPromise,
  credentialStatus: KiltRevocationStatusV1,
  credential: VerifiableCredential
): Promise<void> {
  if (credentialStatus.type !== KILT_REVOCATION_STATUS_V1_TYPE)
    throw new Error('method type mismatch')
  const apiChainId = Caip2.chainIdFromGenesis(api.genesisHash)
  const { chainId, assetInstance, assetNamespace, assetReference } =
    Caip19.parse(credentialStatus.id)
  if (apiChainId !== chainId) {
    throw new Error(
      `api must be connected to network ${chainId} to verify this credential`
    )
  }
  if (assetNamespace !== 'kilt' || assetReference !== 'attestation') {
    throw new Error(
      `cannot handle revocation status checks for asset type ${assetNamespace}:${assetReference}`
    )
  }
  if (!assetInstance) {
    throw new Error(
      'The CAIP-19 identifier must contain a token id decoding to the credential root hash'
    )
  }
  const rootHash = base58Decode(assetInstance)
  const encoded = await api.query.attestation.attestations(rootHash)
  if (encoded.isNone)
    throw new Error(
      `Attestation data not found at latest block ${encoded.createdAtHash}`
    )

  const decoded = Attestation.fromChain(encoded, u8aToHex(rootHash))
  const onChainCType = CType.hashToId(decoded.cTypeHash)
  const delegation = credential.federatedTrustModel?.find(
    (i): i is KiltAttesterDelegationV1 =>
      i.type === KILT_ATTESTER_DELEGATION_V1_TYPE
  )
  const delegationId = delegation
    ? u8aToHex(delegationIdFromAttesterDelegation(delegation))
    : null
  if (
    decoded.owner !== credential.issuer ||
    onChainCType !== credential.credentialSchema.id ||
    delegationId !== decoded.delegationId
  ) {
    throw new Error(
      `Credential not matching on-chain data: issuer "${decoded.owner}", CType: "${onChainCType}"`
    )
  }
  if (decoded.revoked !== false) {
    throw new Error('Attestation revoked')
  }
}
