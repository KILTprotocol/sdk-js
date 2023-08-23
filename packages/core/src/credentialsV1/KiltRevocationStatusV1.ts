/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { u8aEq, u8aToHex, u8aToU8a } from '@polkadot/util'
import { base58Decode, base58Encode } from '@polkadot/util-crypto'
import type { ApiPromise } from '@polkadot/api'
import type { U8aLike } from '@polkadot/util/types'

import { ConfigService } from '@kiltprotocol/config'
import type { Caip2ChainId } from '@kiltprotocol/types'
import { Caip2, SDKErrors } from '@kiltprotocol/utils'

import * as CType from '../ctype/index.js'
import * as Attestation from '../attestation/index.js'
import { KILT_REVOCATION_STATUS_V1_TYPE } from './constants.js'
import {
  assertMatchingConnection,
  getDelegationNodeIdForCredential,
} from './common.js'
import type { KiltCredentialV1, KiltRevocationStatusV1 } from './types.js'

/**
 * Check attestation and revocation status of a credential at the latest block available.
 *
 * @param credential The KiltCredentialV1 to which the status method is linked to.
 * @param opts Additional parameters.
 * @param opts.api An optional polkadot-js/api instance connected to the blockchain network on which the credential is anchored.
 * If not given this function will try to retrieve a cached connection from the [[ConfigService]].
 */
export async function check(
  credential: Omit<KiltCredentialV1, 'proof'>,
  opts: { api?: ApiPromise } = {}
): Promise<void> {
  const { credentialStatus } = credential
  if (credentialStatus?.type !== KILT_REVOCATION_STATUS_V1_TYPE)
    throw new TypeError(
      `The credential must have a credentialStatus of type ${KILT_REVOCATION_STATUS_V1_TYPE}`
    )
  const { api = ConfigService.get('api') } = opts
  const { assetNamespace, assetReference, assetInstance } =
    assertMatchingConnection(api, credential)
  if (assetNamespace !== 'kilt' || assetReference !== 'attestation') {
    throw new Error(
      `Cannot handle revocation status checks for asset type ${assetNamespace}:${assetReference}`
    )
  }
  if (!assetInstance) {
    throw new SDKErrors.CredentialMalformedError(
      "The attestation record's CAIP-19 identifier must contain an asset index ('token_id') decoding to the credential root hash"
    )
  }
  const rootHash = base58Decode(assetInstance)
  const encoded = await api.query.attestation.attestations(rootHash)
  if (encoded.isNone)
    throw new SDKErrors.CredentialUnverifiableError(
      `Attestation data not found at latest block ${encoded.createdAtHash}`
    )

  const decoded = Attestation.fromChain(encoded, u8aToHex(rootHash))
  const onChainCType = CType.hashToId(decoded.cTypeHash)
  const delegationId = getDelegationNodeIdForCredential(credential)
  if (
    decoded.owner !== credential.issuer ||
    !credential.type.includes(onChainCType) ||
    !u8aEq(
      delegationId ?? new Uint8Array(),
      decoded.delegationId ?? new Uint8Array()
    )
  ) {
    throw new SDKErrors.CredentialUnverifiableError(
      `Credential not matching on-chain data: issuer "${decoded.owner}", CType: "${onChainCType}", Delegation: "${decoded.delegationId}"`
    )
  }
  if (decoded.revoked !== false) {
    throw new SDKErrors.CredentialUnverifiableError('Attestation revoked')
  }
}

/**
 * Creates a [[KiltRevocationStatusV1]] object from a credential hash and blochain identifier, which allow locating the credential's attestation record.
 *
 * @param chainIdOrGenesisHash The genesis hash (or CAIP-2 identifier) of the substrate chain on which the attestation record lives.
 * @param rootHash The credential hash identifying the relevant attestation record on that chain.
 * @returns A new [[KiltRevocationStatusV1]] object.
 */
export function fromGenesisAndRootHash(
  chainIdOrGenesisHash: Caip2ChainId | U8aLike,
  rootHash: U8aLike
): KiltRevocationStatusV1 {
  const chainId =
    typeof chainIdOrGenesisHash === 'string' &&
    chainIdOrGenesisHash.startsWith('polkadot')
      ? chainIdOrGenesisHash
      : Caip2.chainIdFromGenesis(u8aToU8a(chainIdOrGenesisHash))

  return {
    id: `${chainId}/kilt:attestation/${base58Encode(rootHash)}`,
    type: KILT_REVOCATION_STATUS_V1_TYPE,
  }
}
