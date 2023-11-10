/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { ObjectBuilder } from 'typescript-object-builder'

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

import { toChain } from '@kiltprotocol/did'
import { Signers } from '@kiltprotocol/utils'

type ProviderStateRootProofOpts = {
  providerApi: ApiPromise
  relayApi: ApiPromise
  // Optional
  providerBlockHeight?: number
}
type ProviderStateRootProofRes = {
  proof: ReadProof
  providerBlockHeight: number
  relayBlockHeight: number
}
async function generateProviderStateRootProof({
  providerApi,
  relayApi,
  // Optional
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
    providerBlockHeight: providerBlockNumber,
    relayBlockHeight: relayParentBlockNumber.toNumber(),
  }
}

type DipCommitmentProofOpts = {
  did: Did
  providerApi: ApiPromise
  providerBlockHash: Hash
  version: number
}
type DipCommitmentProofRes = {
  proof: ReadProof
}
async function generateDipCommitmentProof({
  did,
  providerApi,
  providerBlockHash,
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
  did: Did
  keyIds: Array<VerificationMethod['id']>
  includeWeb3Name: boolean
  linkedAccounts: readonly PalletDidLookupLinkableAccountLinkableAccountId[]
  providerApi: ApiPromise
  version: number
}
type DipIdentityProofRes = {
  proof: {
    blinded: Codec
    revealed: Codec
  }
  root: Hash
}
async function generateDipIdentityProof({
  did,
  keyIds,
  includeWeb3Name,
  linkedAccounts,
  providerApi,
  version,
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
  signers: readonly SignerInterface[]
  verificationRelationship: SignatureVerificationRelationship
}
type DipDidSignatureConsumerOpts = {
  accountIdRuntimeType: string
  api: ApiPromise
  blockNumberRuntimeType: string
  call: Call
  identityDetailsRuntimeType: string
  submitterAddress: KeyringPair['address']
  // Optional
  blockHeight?: number
  genesisHash?: Hash
}
type DipDidSignatureOpts = {
  consumer: DipDidSignatureConsumerOpts
  provider: DipDidSignatureProviderOpts
}
type DipDidSignatureRes = {
  blockNumber: number
  signature: Uint8Array
  type: SignerInterface['algorithm']
}
async function generateDipDidSignature({
  provider: { didDocument, signers, verificationRelationship },
  consumer: {
    accountIdRuntimeType,
    api,
    blockNumberRuntimeType,
    call,
    identityDetailsRuntimeType,
    submitterAddress,
    // Optional
    blockHeight,
    genesisHash,
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
      [call, identityDetails, submitterAddress, blockNumber, genesis]
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

export type Input = {
  call: Call
  consumerWsOrApi: FullnodeAddress | ApiPromise
  didDocument: DidDocument
  keyIds: Array<VerificationMethod['id']>
  proofVersion: number
  providerWsOrApi: FullnodeAddress | ApiPromise
  relayWsOrApi: FullnodeAddress | ApiPromise
  signers: readonly SignerInterface[]
  submitterAddress: KeyringPair['address']
  verificationRelationship: SignatureVerificationRelationship
  // Optional, retrieved from chain otherwise
  blockHeight?: number
  genesisHash?: Hash
  providerBlockHeight?: number
  // With defaults
  accountIdRuntimeType?: string
  blockNumberRuntimeType?: string
  identityDetailsRuntimeType?: string
  includeWeb3Name?: boolean
  linkedAccounts?: readonly PalletDidLookupLinkableAccountLinkableAccountId[]
}

export const ProofBuilder = ObjectBuilder.new<Input>()

/**
 * Generate a complete DIP proof for the parameters provided.
 *
 * @param params The DIP proof params.
 * @param params.call The [[Call]] on the target chain that requires a DIP origin.
 * @param params.consumerWsOrApi The Websocket address or an [[ApiPromise]] instance for the consumer chain.
 * @param params.didDocument The DID Document of the DIP subject that is performing the cross-chain operation.
 * @param params.keyIds The verification method IDs of the DID to be revealed in the cross-chain operation.
 * @param params.proofVersion The version of the DIP proof to generate.
 * @param params.providerWsOrApi The Websocket address or an [[ApiPromise]] instance for the provider chain.
 * @param params.relayWsOrApi The Websocket address or an [[ApiPromise]] instance for the parent relay chain.
 * @param params.signers The list of signers to sign the cross-chain transaction.
 * @param params.submitterAddress The address of the tx submitter on the consumer chain.
 * @param params.verificationRelationship The [[SignatureVerificationRelationship]] required for the DIP operation to be authorized on the consumer chain.
 * @param params.blockHeight [OPTIONAL] The block number on the consumer chain to use for the DID signature. If not provided, the latest best block number is used.
 * @param params.genesisHash [OPTIONAL] The genesis hash of the consumer chain to use for the DID signature. If not provided, it is retrieved at runtime from the consumer chain.
 * @param params.providerBlockHeight [OPTIONAL] The block number of the provider to use for the generation of the DIP proof. If not provided, the latest finalized block number is used.
 * @param params.accountIdRuntimeType [OPTIONAL] The runtime type definition for an `AccountId` on the consumer chain. If not provided, the `AccountId` type is used.
 * @param params.blockNumberRuntimeType [OPTIONAL] The runtime type definition for a `BlockNumber` on the consumer chain. If not provided, the `u64` type is used.
 * @param params.identityDetailsRuntimeType [OPTIONAL] The runtime type definition for the `IdentityDetails` on the consumer chain. If not provided, the `Option<u128>` type, representing a simple nonce, is used.
 * @param params.includeWeb3Name [OPTIONAL] Flag indicating whether the generated DIP proof should include the web3name of the DID subject. If not provided, the web3name is not revealed.
 * @param params.linkedAccounts [OPTIONAL] The list of linked accounts to reveal in the generated DIP proof. If not provided, no account is revealed.
 */
export async function generateDipSiblingProof({
  call,
  consumerWsOrApi,
  didDocument,
  keyIds,
  proofVersion,
  providerWsOrApi,
  relayWsOrApi,
  signers,
  submitterAddress,
  verificationRelationship,
  // Optional
  blockHeight,
  genesisHash,
  providerBlockHeight,
  // With defaults
  accountIdRuntimeType = 'AccountId',
  blockNumberRuntimeType = 'u64',
  identityDetailsRuntimeType = 'Option<u128>',
  includeWeb3Name = false,
  linkedAccounts = [],
}: Input): Promise<SubmittableExtrinsic> {
  // TODO: Move into util function
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
    providerBlockHeight: providerStateRootProofProviderBlockHeight,
    relayBlockHeight: providerStateRootProofRelayBlockHeight,
  } = await generateProviderStateRootProof({
    relayApi,
    providerApi,
    providerBlockHeight,
  })

  // Proof of commitment must be generated with the state root at the block before the last one finalized.
  const dipRootProofBlockHash = await providerApi.rpc.chain.getBlockHash(
    providerStateRootProofProviderBlockHeight - 1
  )

  const { proof: dipCommitmentProof } = await generateDipCommitmentProof({
    did: didDocument.id,
    providerApi,
    providerBlockHash: dipRootProofBlockHash,
    version: proofVersion,
  })

  const { proof: dipIdentityProof } = await generateDipIdentityProof({
    did: didDocument.id,
    providerApi,
    keyIds,
    linkedAccounts,
    version: proofVersion,
    includeWeb3Name,
  })

  const consumerApi = await (async () => {
    if (typeof consumerWsOrApi === 'string') {
      return ApiPromise.create({ provider: new WsProvider(consumerWsOrApi) })
    }
    return consumerWsOrApi
  })()

  const {
    blockNumber: didSignatureBlockNumber,
    signature: didSignature,
    type: didSignatureType,
  } = await generateDipDidSignature({
    provider: {
      didDocument,
      signers,
      verificationRelationship,
    },
    consumer: {
      api: consumerApi,
      call,
      submitterAddress,
      accountIdRuntimeType,
      blockHeight,
      blockNumberRuntimeType,
      genesisHash,
      identityDetailsRuntimeType,
    },
  })

  return consumerApi.tx.dipConsumer.dispatchAs(toChain(didDocument.id), {
    [`V${proofVersion}`]: {
      paraStateRoot: {
        relayBlockHeight: providerStateRootProofRelayBlockHeight,
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
            [didSignatureType]: u8aToHex(didSignature),
          },
          blockNumber: didSignatureBlockNumber,
        },
      },
    },
  })
}
