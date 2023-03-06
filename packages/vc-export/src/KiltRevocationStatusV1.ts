/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { u8aToHex, u8aToU8a } from '@polkadot/util'
import { base58Decode, base58Encode } from '@polkadot/util-crypto'
import type { ApiPromise } from '@polkadot/api'
import type { U8aLike } from '@polkadot/util/types'

import { ConfigService } from '@kiltprotocol/config'
import { Attestation, CType } from '@kiltprotocol/core'
import type { Caip2ChainId } from '@kiltprotocol/types'

import { chainIdFromGenesis } from './CAIP/caip2.js'
import { Caip19, Caip2 } from './CAIP/index.js'
import { KILT_REVOCATION_STATUS_V1_TYPE } from './constants.js'
import { getDelegationNodeIdForCredential } from './KiltCredentialV1.js'
import type { KiltRevocationStatusV1, VerifiableCredential } from './types.js'

/**
 * Check attestation and revocation status of a credential at the latest block available.
 *
 * @param credential The KiltCredentialV1 to which the status method is linked to.
 * @param opts Additional parameters.
 * @param opts.api An optional polkadot-js/api instance connected to the blockchain network on which the credential is anchored.
 * If not given this function will try to retrieve a cached connection from the [[ConfigService]].
 */
export async function checkStatus(
  credential: VerifiableCredential,
  opts: { api?: ApiPromise } = {}
): Promise<void> {
  const { credentialStatus } = credential
  if (credentialStatus?.type !== KILT_REVOCATION_STATUS_V1_TYPE)
    throw new Error(
      `credential must have a credentialStatus of type ${KILT_REVOCATION_STATUS_V1_TYPE}`
    )
  const { api = ConfigService.get('api') } = opts
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
  const delegationId = getDelegationNodeIdForCredential(credential)
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

/**
 * @param chainIdOrGenesisHash
 * @param rootHash
 */
export function fromGenesisAndRootHash(
  chainIdOrGenesisHash: Caip2ChainId | U8aLike,
  rootHash: U8aLike
): KiltRevocationStatusV1 {
  const chainId =
    typeof chainIdOrGenesisHash === 'string' &&
    chainIdOrGenesisHash.startsWith('polkadot')
      ? chainIdOrGenesisHash
      : chainIdFromGenesis(u8aToU8a(chainIdOrGenesisHash))

  return {
    id: `${chainId}/kilt:attestation/${base58Encode(rootHash)}`,
    type: KILT_REVOCATION_STATUS_V1_TYPE,
  }
}
