/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { ApiPromise, WsProvider } from '@polkadot/api'
import type { KeyringPair } from '@polkadot/keyring/types'
import type { Call, Hash, ReadProof } from '@polkadot/types/interfaces'

import type { Did, VerificationMethod } from '@kiltprotocol/types'
import type { PalletDidLookupLinkableAccountLinkableAccountId } from '@kiltprotocol/augment-api'

import { cryptoWaitReady } from '@polkadot/util-crypto'

import { toChain } from '@kiltprotocol/did'

type ProviderStateRootProofOpts = {
  relayApi: ApiPromise
  providerApi: ApiPromise
  providerBlockHeight?: number
}
type ProviderStateRootProofRes = {
  proof: ReadProof
  providerBlockHash: Hash
  providerBlockNumber: number
}
async function generateProviderStateRootProof({
  relayApi,
  providerApi,
  providerBlockHeight,
}: ProviderStateRootProofOpts): Promise<ProviderStateRootProofRes> {
  const providerChainId = await providerApi.query.parachainInfo.parachainId()
  const [providerBlockNumber, providerBlockHash] = await (async () => {
    if (providerBlockHeight !== undefined) {
      const blockHash = await providerApi.derive.chain
        .getBlockByNumber(providerBlockHeight)
        .then((b) => b.hash)
      return [providerBlockHeight, blockHash]
    }
    const providerLastFinalizedBlockHash =
      await providerApi.rpc.chain.getFinalizedHead()
    const providerLastFinalizedBlockHeight = await providerApi.rpc.chain
      .getHeader(providerLastFinalizedBlockHash)
      .then((h) => h.number.toNumber())
    return [providerLastFinalizedBlockHeight, providerLastFinalizedBlockHash]
  })()
  const relayParentBlockHeight = await providerApi
    .at(providerBlockHash)
    .then((api) => api.query.parachainSystem.lastRelayChainBlockNumber())
  const relayParentBlockHash = await relayApi.rpc.chain.getBlockHash(
    relayParentBlockHeight
  )

  const proof = await relayApi.rpc.state.getReadProof(
    [relayApi.query.paras.heads.key(providerChainId)],
    relayParentBlockHash
  )

  return {
    proof,
    providerBlockHash,
    providerBlockNumber,
  }
}

type DipCommitmentProofOpts = {
  providerApi: ApiPromise
  providerBlockHash: Hash
  did: Did
  version: number
}
type DipCommitmentProofRes = {
  proof: ReadProof
}
async function generateDipCommitmentProof({
  providerApi,
  providerBlockHash,
  did,
  version,
}: DipCommitmentProofOpts): Promise<DipCommitmentProofRes> {
  const proof = await providerApi.rpc.state.getReadProof(
    [
      providerApi.query.dipProvider.identityCommitments.key(
        toChain(did),
        version
      ),
    ],
    providerBlockHash
  )

  return { proof }
}

type WsAddress = `ws${string}`
type FullnodeAddress = WsAddress

type DipProofParams = {
  keyIds: Array<VerificationMethod['id']>
  linkedAccounts: PalletDidLookupLinkableAccountLinkableAccountId[]
  includeWeb3Name?: boolean
  providerBlockHeight?: number
  proofVersion: number
}
type DipSiblingTxOpts = {
  relayWsOrApi: FullnodeAddress | ApiPromise
  providerWsOrApi: FullnodeAddress | ApiPromise
  consumerWsOrApi: FullnodeAddress | ApiPromise
  submitter: KeyringPair['address']
  call: Call
  did: Did
  dipProofParams: DipProofParams
}
// TODO: Think about a builder to build these requests
export async function authorizeDipSiblingTx({
  consumerWsOrApi,
  providerWsOrApi,
  relayWsOrApi,
  submitter,
  did,
  call,
  dipProofParams,
}: DipSiblingTxOpts): Promise<void> {
  await cryptoWaitReady()
  const relayApi = await (async () => {
    if (typeof relayWsOrApi === 'string') {
      return ApiPromise.create({ provider: new WsProvider(relayWsOrApi) })
    }
    return relayWsOrApi
  })()
  const providerApi = await (async () => {
    if (typeof providerWsOrApi === 'string') {
      return ApiPromise.create({ provider: new WsProvider(providerWsOrApi) })
    }
    return providerWsOrApi
  })()

  const {
    proof: providerStateRootProof,
    providerBlockHash,
    providerBlockNumber,
  } = await generateProviderStateRootProof({
    relayApi,
    providerApi,
    providerBlockHeight: dipProofParams.providerBlockHeight,
  })

  // Proof of commitment must be generated with the state root at the block before the last one finalized.
  const dipRootProofBlockHash = await providerApi.rpc.chain.getBlockHash(
    providerBlockNumber - 1
  )

  const { proof: dipCommitmentProof } = await generateDipCommitmentProof({
    did,
    providerApi,
    providerBlockHash: dipRootProofBlockHash,
    version: dipProofParams.proofVersion,
  })
}
