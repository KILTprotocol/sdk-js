/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { u8aEq, u8aToHex, u8aToU8a } from '@polkadot/util'
import { base58Decode, base58Encode } from '@polkadot/util-crypto'
import type { ApiPromise } from '@polkadot/api'
import type { U8aLike } from '@polkadot/util/types'
import { ConfigService } from '@kiltprotocol/config'
import type { Caip2ChainId, SharedArguments } from '@kiltprotocol/types'
import { Caip2, SDKErrors } from '@kiltprotocol/utils'
import { Extrinsic } from '@polkadot/types/interfaces/types.js'
import * as CType from '../ctype/index.js'
import * as Attestation from '../attestation/index.js'
import {
  assertMatchingConnection,
  defaultTxSubmit,
  getDelegationNodeIdForCredential,
} from './common.js'
import type { IssuerOptions } from '../interfaces.js'
import type { KiltCredentialV1 } from './types.js'

import { type KiltRevocationStatusV1 } from './types.js'

export type Interface = KiltRevocationStatusV1

export const STATUS_TYPE = 'KiltRevocationStatusV1'

/**
 * @param credentialStatus The credential status propoerty of the Verifiable credential.
 * @param opts Additional parameters.
 * @param opts.api An optional polkadot-js/api instance connected to the blockchain network on which the credential is anchored.
 * @param params.issuer Interfaces for interacting with the issuer identity.
 * @param params.issuer.didDocument The DID Document of the issuer revoking the credential.
 * @param params.issuer.signers Array of signer interfaces for credential authorization.
 * @param params.issuer.submitter The submitter can be one of:
 * - A MultibaseKeyPair for signing transactions
 * - A Ed25519 type keypair for blockchain interactions
 * The submitter will be used to cover transaction fees and blockchain operations.
 * @param issuer
 */
export async function revoke(
  credentialStatus: KiltRevocationStatusV1,
  issuer: IssuerOptions,
  opts: { api?: ApiPromise } = {}
): Promise<void> {
  if (credentialStatus?.type !== STATUS_TYPE)
    throw new TypeError(
      `The credential must have a credentialStatus of type ${STATUS_TYPE}`
    )
  const { api = ConfigService.get('api') } = opts
  const { assetNamespace, assetReference, assetInstance } =
    assertMatchingConnection(api, { credentialStatus })
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

  const { didDocument, signers, submitter } = issuer

  const call = api.tx.attestation.revoke(rootHash, null)

  const args: Pick<SharedArguments, 'didDocument' | 'api' | 'signers'> & {
    call: Extrinsic
  } = {
    didDocument,
    signers,
    api,
    call,
  }
  const transactionPromise =
    typeof submitter === 'function'
      ? submitter(args)
      : defaultTxSubmit({
          ...args,
          submitter,
        })

  let result = await transactionPromise
  if ('status' in result) {
    if (result.status !== 'confirmed') {
      throw new SDKErrors.SDKError(
        `Unexpected transaction status ${result.status}; the transaction should be "confirmed" for issuance to continue`
      )
    }
    result = result.asConfirmed
  }
}

/**
 * Check attestation and revocation status of a credential at the latest block available.
 *
 * @param credential The KiltCredentialV1 to which the status method is linked to.
 * @param opts Additional parameters.
 * @param opts.api An optional polkadot-js/api instance connected to the blockchain network on which the credential is anchored.
 * If not given this function will try to retrieve a cached connection from the {@link ConfigService}.
 */
export async function check(
  credential: Omit<KiltCredentialV1, 'proof'>,
  opts: { api?: ApiPromise } = {}
): Promise<void> {
  const { credentialStatus } = credential
  if (credentialStatus?.type !== STATUS_TYPE)
    throw new TypeError(
      `The credential must have a credentialStatus of type ${STATUS_TYPE}`
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
 * Creates a {@link KiltRevocationStatusV1} object from a credential hash and blochain identifier, which allow locating the credential's attestation record.
 *
 * @param chainIdOrGenesisHash The genesis hash (or CAIP-2 identifier) of the substrate chain on which the attestation record lives.
 * @param rootHash The credential hash identifying the relevant attestation record on that chain.
 * @returns A new {@link KiltRevocationStatusV1} object.
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
    type: STATUS_TYPE,
  }
}
