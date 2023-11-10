/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { ApiPromise, WsProvider } from '@polkadot/api'
import { u8aToHex } from '@polkadot/util'
import type { KeyringPair } from '@polkadot/keyring/types'
import type { Call, Hash, ReadProof } from '@polkadot/types/interfaces'
import type { Option } from '@polkadot/types-codec'
import type { Codec } from '@polkadot/types-codec/types'

import type {
  Did,
  DidDocument,
  SignatureVerificationRelationship,
  SignerInterface,
  SubmittableExtrinsic,
  VerificationMethod,
} from '@kiltprotocol/types'
import type { PalletDidLookupLinkableAccountLinkableAccountId } from '@kiltprotocol/augment-api'

import { cryptoWaitReady } from '@polkadot/util-crypto'

import { toChain } from '@kiltprotocol/did'
import { Signers } from '@kiltprotocol/utils'

type ProviderStateRootProofOpts = {
  relayApi: ApiPromise
  providerApi: ApiPromise
  providerBlockHeight?: number
}
type ProviderStateRootProofRes = {
  proof: ReadProof
  providerBlockHash: Hash
  providerBlockNumber: number
  relayBlockNumber: number
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
  const relayParentBlockNumber = await providerApi
    .at(providerBlockHash)
    .then((api) => api.query.parachainSystem.lastRelayChainBlockNumber())
  const relayParentBlockHash = await relayApi.rpc.chain.getBlockHash(
    relayParentBlockNumber
  )

  const proof = await relayApi.rpc.state.getReadProof(
    [relayApi.query.paras.heads.key(providerChainId)],
    relayParentBlockHash
  )

  return {
    proof,
    providerBlockHash,
    providerBlockNumber,
    relayBlockNumber: relayParentBlockNumber.toNumber(),
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

type DipIdentityProofOpts = {
  providerApi: ApiPromise
  version: number
  did: Did
  keyIds: Array<VerificationMethod['id']>
  linkedAccounts: PalletDidLookupLinkableAccountLinkableAccountId[]
  includeWeb3Name?: boolean
}
type DipIdentityProofRes = {
  proof: {
    blinded: Codec
    revealed: Codec
  }
  root: Hash
}
async function generateDipIdentityProof({
  providerApi,
  version,
  did,
  keyIds,
  linkedAccounts,
  includeWeb3Name = false,
}: DipIdentityProofOpts): Promise<DipIdentityProofRes> {
  const proof = (await providerApi.call.dipProvider.generateProof({
    identifier: toChain(did),
    version,
    keys: keyIds.map((keyId) => keyId.substring(1)),
    accounts: linkedAccounts,
    shouldIncludeWeb3Name: includeWeb3Name,
  })) as Option<Codec>

  const okProof = proof.unwrap() as any

  return { ...okProof }
}

type DipDidSignatureProviderOpts = {
  didDocument: DidDocument
  verificationRelationship: SignatureVerificationRelationship
  signers: readonly SignerInterface[]
}
type DipDidSignatureConsumerOpts = {
  api: ApiPromise
  blockHeight?: number
  genesisHash?: Hash
  submitter: KeyringPair['address']
  identityDetailsRuntimeType?: string
  accountIdRuntimeType?: string
  blockNumberRuntimeType?: string
  call: Call
}
type DipDidSignatureOpts = {
  provider: DipDidSignatureProviderOpts
  consumer: DipDidSignatureConsumerOpts
}
type DipDidSignatureRes = {
  type: SignerInterface['algorithm']
  signature: Uint8Array
  blockNumber: number
}
async function generateDipDidSignature({
  provider: { didDocument, signers, verificationRelationship },
  consumer: {
    call,
    submitter,
    api,
    blockHeight,
    genesisHash,
    identityDetailsRuntimeType = 'u128',
    accountIdRuntimeType = 'AccountId',
    blockNumberRuntimeType = 'u64',
  },
}: DipDidSignatureOpts): Promise<DipDidSignatureRes> {
  const blockNumber = await (async () => {
    if (blockHeight !== undefined) {
      return blockHeight
    }
    const n = await api.query.system.number()
    return n.toNumber()
  })()
  const genesis = await (async () => {
    if (genesisHash !== undefined) {
      return genesisHash
    }
    return api.query.system.blockHash(0)
  })()
  const identityDetails = await (async () => {
    const maybeIdentityDetails = (await api.query.dipConsumer.identityEntries(
      toChain(didDocument.id)
    )) as Option<Codec>
    try {
      return maybeIdentityDetails.unwrap()
    } catch {
      return api.createType(identityDetailsRuntimeType, null)
    }
  })()

  const signaturePayload = api
    .createType(
      `(Call, ${identityDetailsRuntimeType}, ${accountIdRuntimeType}, ${blockNumberRuntimeType}, Hash)`,
      [call, identityDetails, submitter, blockNumber, genesis]
    )
    .toU8a()
  const signer = await Signers.selectSigner(
    signers,
    Signers.select.byDid(didDocument, { verificationRelationship })
  )
  if (signer === undefined) {
    throw new Error(
      `No signer found on DID "${didDocument.id}" for relationship "${verificationRelationship}".`
    )
  }
  const signature = await signer.sign({ data: signaturePayload })
  return {
    blockNumber,
    signature,
    type: signer.algorithm,
  }
}

type WsAddress = `ws${string}`
type FullnodeAddress = WsAddress

type DipProofParams = {
  keyIds: Array<VerificationMethod['id']>
  linkedAccounts: PalletDidLookupLinkableAccountLinkableAccountId[]
  includeWeb3Name?: boolean
  providerBlockHeight?: number
  proofVersion: number
  verificationRelationship: SignatureVerificationRelationship
  signers: readonly SignerInterface[]
}
// TODO: Divide params into `relay`, `provider` and `consumer`
type DipSiblingTxOpts = {
  relayWsOrApi: FullnodeAddress | ApiPromise
  providerWsOrApi: FullnodeAddress | ApiPromise
  consumerWsOrApi: FullnodeAddress | ApiPromise
  submitter: KeyringPair['address']
  call: Call
  didDocument: DidDocument
  dipProofParams: DipProofParams
  accountIdRuntimeType?: string
  blockNumberRuntimeType?: string
  identityDetailsRuntimeType?: string
  blockHeight?: number
  genesisHash?: Hash
}
// TODO: Think about a builder to build these requests
export async function authorizeDipSiblingTx({
  consumerWsOrApi,
  providerWsOrApi,
  relayWsOrApi,
  submitter,
  didDocument,
  call,
  dipProofParams,
  accountIdRuntimeType,
  blockNumberRuntimeType,
  identityDetailsRuntimeType,
  blockHeight,
  genesisHash,
}: DipSiblingTxOpts): Promise<SubmittableExtrinsic> {
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
    providerBlockNumber,
    relayBlockNumber,
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
    did: didDocument.id,
    providerApi,
    providerBlockHash: dipRootProofBlockHash,
    version: dipProofParams.proofVersion,
  })

  const { proof: dipIdentityProof } = await generateDipIdentityProof({
    did: didDocument.id,
    providerApi,
    keyIds: dipProofParams.keyIds,
    linkedAccounts: dipProofParams.linkedAccounts,
    version: dipProofParams.proofVersion,
    includeWeb3Name: dipProofParams.includeWeb3Name,
  })

  const consumerApi = await (async () => {
    if (typeof consumerWsOrApi === 'string') {
      return ApiPromise.create({ provider: new WsProvider(consumerWsOrApi) })
    }
    return consumerWsOrApi
  })()

  const {
    blockNumber: signatureBlockNumber,
    signature,
    type: signatureType,
  } = await generateDipDidSignature({
    provider: {
      didDocument,
      signers: dipProofParams.signers,
      verificationRelationship: dipProofParams.verificationRelationship,
    },
    consumer: {
      api: consumerApi,
      call,
      submitter,
      accountIdRuntimeType,
      blockHeight,
      blockNumberRuntimeType,
      genesisHash,
      identityDetailsRuntimeType,
    },
  })

  return consumerApi.tx.dipConsumer.dispatchAs(toChain(didDocument.id), {
    [`V${dipProofParams.proofVersion}`]: {
      paraStateRoot: {
        relayBlockHeight: relayBlockNumber,
        proof: providerStateRootProof,
      },
      dipIdentityCommitment: dipCommitmentProof,
      did: {
        leaves: {
          blinded: dipIdentityProof.blinded,
          revealed: dipIdentityProof.revealed,
        },
        signature: {
          signature: {
            [signatureType]: u8aToHex(signature),
          },
          blockNumber: signatureBlockNumber,
        },
      },
    },
  })
}
