/**
 * Copyright (c) 2025, KILT Foundation.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { u8aEq, u8aToHex, u8aToU8a } from '@polkadot/util'
import { base58Encode } from '@polkadot/util-crypto'
import type { ApiPromise } from '@polkadot/api'
import type { U8aLike } from '@polkadot/util/types'
import { ConfigService } from '@kiltprotocol/config'
import type { Caip2ChainId, SharedArguments } from '@kiltprotocol/types'
import { Caip2, SDKErrors } from '@kiltprotocol/utils'
import { Extrinsic } from '@polkadot/types/interfaces/'
import * as CType from '../ctype/index.js'
import * as Attestation from '../attestation/index.js'
import {
  defaultTxSubmit,
  getDelegationNodeIdForCredential,
  getRootHashFromStatusId,
} from './common.js'
import type { IssuerOptions } from '../interfaces.js'
import type { KiltCredentialV1, KiltRevocationStatusV1 } from './types.js'

export type Interface = KiltRevocationStatusV1

export const STATUS_TYPE = 'KiltRevocationStatusV1'

/**
 * Revokes a Verifiable Credential containing a KiltRevocationStatusV1.
 *
 * @param credentialStatus The `credentialStatus` property of the Verifiable Credential.
 * @param issuer
 * @param issuer.didDocument The DID Document of the issuer revoking the credential.
 * @param issuer.signers Array of signer interfaces for credential authorization.
 * @param issuer.submitter The submitter can be one of:
 * - A MultibaseKeyPair for signing transactions.
 * - A `KeyringPair` for blockchain interactions.
 * The submitter will be used to cover transaction fees and blockchain operations.
 * @param opts Additional parameters.
 * @param opts.api An optional polkadot-js/api instance connected to the blockchain network on which the credential is anchored.
 */
export async function revoke(
  credentialStatus: KiltRevocationStatusV1,
  issuer: IssuerOptions,
  opts: { api?: ApiPromise } = {}
): Promise<void> {
  const rootHash = getRootHashFromStatusId(credentialStatus, opts)
  const { api = ConfigService.get('api') } = opts
  const { didDocument, signers, submitter } = issuer

  // TODO: Support revocations through delegation.
  // In this case, the second parameter in this function would needs to be populated.
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

  const result = await transactionPromise
  if ('status' in result) {
    let error: Error | undefined
    switch (result.status) {
      case 'confirmed':
        return
      case 'failed':
        error = result.asFailed.error
        break
      case 'rejected':
        error = result.asRejected.error
        break
      case 'unknown':
        error = result.asUnknown.error
        break
      default:
        break
    }
    throw (
      error ??
      new SDKErrors.SDKError(
        `Revocation failed with transaction status ${result?.status}`
      )
    )
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
  const rootHash = getRootHashFromStatusId(credentialStatus, opts)
  const { api = ConfigService.get('api') } = opts
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
