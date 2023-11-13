/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { ApiPromise } from '@polkadot/api'
import type { KeyringPair } from '@polkadot/keyring/types'
import type { Call, Hash, ReadProof } from '@polkadot/types/interfaces'
import type { Option } from '@polkadot/types-codec'
import type { Codec } from '@polkadot/types-codec/types'

import type {
  Did,
  DidDocument,
  SignatureVerificationRelationship,
  SignerInterface,
  VerificationMethod,
} from '@kiltprotocol/types'
import type { PalletDidLookupLinkableAccountLinkableAccountId } from '@kiltprotocol/augment-api'

import { toChain } from '@kiltprotocol/did'
import { Signers } from '@kiltprotocol/utils'

export type WsAddress = `ws${string}`
export type FullnodeAddress = WsAddress

export const defaultValues = {
  accountIdRuntimeType: 'AccountId',
  blockNumberRuntimeType: 'u64',
  identityDetailsRuntimeType: 'Option<u128>',
  includeWeb3Name: false,
  linkedAccounts: [],
}

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
  relayParentBlockHash: Hash
}
/**
 * Generate a state proof that proofs the head of the specified parachain.
 *
 * @param params The state proof params.
 * @param params.providerApi The [[ApiPromise]] instance for the provider chain.
 * @param params.relayApi The [[ApiPromise]] instance for the relay chain.
 * @param params.providerBlockHeight [OPTIONAL] The block number on the provider chain to use for the state proof. If not provided, the latest finalized block number is used.
 *
 * @returns The generated state proof.
 */
export async function generateProviderStateRootProof({
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
    relayParentBlockHash,
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
/**
 * Generate a state proof that proofs the value of an identity commitment on the specified provider chain.
 *
 * @param params The state proof params.
 * @param params.did The [[Did]] of the subject.
 * @param params.providerApi The [[ApiPromise]] instance for the provider chain.
 * @param params.providerBlockHash The block hash on the provider chain to use for the state proof.
 * @param params.version The version of the identity commitment to generate the state proof for.
 *
 * @returns The generated state proof.
 */
export async function generateDipCommitmentProof({
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
/**
 * Generate a DIP proof that reveals the specified information about the DID subject.
 *
 * @param params The DIP proof params.
 * @param params.did The [[Did]] of the subject.
 * @param params.keyIds The list of DID verification methods to include in the DIP proof and to reveal to the consumer chain.
 * @param params.includeWeb3Name A flag indicating whether the web3name should be included in the DIP proof.
 * @param params.linkedAccounts The list of accounts linked to the DID ot include in the DIP proof and to reveal to the consumer chain.
 * @param params.providerApi The [[ApiPromise]] instance for the provider chain.
 * @param params.version The version of the DIP proof to generate.
 *
 * @returns The generated DIP proof.
 */
export async function generateDipIdentityProof({
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
/**
 * Generate a DID signature to be used in conjunction with a DIP proof to DID-authorize a cross-chain operation.
 *
 * @param params The DID signature parameters.
 * @param params.provider The provider-specific parameters.
 * @param params.provider.didDocument The [[DidDocument] of the DIP subject that is performing the cross-chain operation.
 * @param params.provider.signers The list of [[Signers]] to use to sign the cross-chain payload.
 * @param params.provider.verificationRelationship The [[SignatureVerificationRelationship]] to use from the provided DID Document to sign the cross-chain payload.
 * @param params.consumer The consumer-specific parameters.
 * @param params.consumer.accountIdRuntimeType The runtime definition of an `AccountId`.
 * @param params.consumer.api The [[ApiPromise]] instance.
 * @param params.consumer.blockNumberRuntimeType The runtime definition of a `BlockNumber`.
 * @param params.consumer.call The [[Call]] to DID-authorize.
 * @param params.consumer.identityDetailsRuntimeType The runtime definition of the `IdentityDetails`.
 * @param params.consumer.submitterAddress The address of the submitter account on the consumer chain.
 * @param params.consumer.blockHeight [OPTIONAL] The block number to use for the DID signature. If not provided, the latest best block number is used.
 * @param params.consumer.genesisHash [OPTIONAL] The genesis hash to use for the DID signature. If not provided, it is retrieved at runtime.
 * @returns The generated DIP proof.
 */
export async function generateDipDidSignature({
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
