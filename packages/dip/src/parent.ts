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
import type { Call, Hash } from '@polkadot/types/interfaces'

import type {
  DidDocument,
  SignatureVerificationRelationship,
  SignerInterface,
  SubmittableExtrinsic,
  VerificationMethod,
} from '@kiltprotocol/types'
import type { PalletDidLookupLinkableAccountLinkableAccountId } from '@kiltprotocol/augment-api'

import { toChain } from '@kiltprotocol/did'

import type { FullnodeAddress } from './utils.js'
import {
  defaultValues,
  generateDipCommitmentProof,
  generateDipDidSignature,
  generateDipIdentityProof,
  generateProviderStateRootProof,
} from './utils.js'

export type DipParentProofInput = {
  call: Call
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

export const DipParentProofBuilder = ObjectBuilder.new<DipParentProofInput>()

/**
 * Generate a complete DIP proof according to the parameters provided, to be used on the relay chain of which the provider chain is a parachain.
 *
 * @param params The DIP proof params.
 * @param params.call The [[Call]] on the relay chain that requires a DIP origin.
 * @param params.didDocument The DID Document of the DIP subject that is performing the cross-chain operation.
 * @param params.keyIds The verification method IDs of the DID to be revealed in the cross-chain operation.
 * @param params.proofVersion The version of the DIP proof to generate.
 * @param params.providerWsOrApi The Websocket address or an [[ApiPromise]] instance for the provider chain.
 * @param params.relayWsOrApi The Websocket address or an [[ApiPromise]] instance for the relay chain.
 * @param params.signers The list of signers to sign the cross-chain transaction.
 * @param params.submitterAddress The address of the tx submitter on the relay chain.
 * @param params.verificationRelationship The [[SignatureVerificationRelationship]] required for the DIP operation to be authorized on the relay chain.
 * @param params.blockHeight [OPTIONAL] The block number on the relay chain to use for the DID signature. If not provided, the latest best block number is used.
 * @param params.genesisHash [OPTIONAL] The genesis hash of the relay chain to use for the DID signature. If not provided, it is retrieved at runtime from the relay chain.
 * @param params.providerBlockHeight [OPTIONAL] The block number of the provider to use for the generation of the DIP proof. If not provided, the latest finalized block number is used.
 * @param params.accountIdRuntimeType [OPTIONAL] The runtime type definition for an `AccountId` on the relay chain. If not provided, the `AccountId` type is used.
 * @param params.blockNumberRuntimeType [OPTIONAL] The runtime type definition for a `BlockNumber` on the relay chain. If not provided, the `u64` type is used.
 * @param params.identityDetailsRuntimeType [OPTIONAL] The runtime type definition for the `IdentityDetails` on the relay chain. If not provided, the `Option<u128>` type, representing a simple nonce, is used.
 * @param params.includeWeb3Name [OPTIONAL] Flag indicating whether the generated DIP proof should include the web3name of the DID subject. If not provided, the web3name is not revealed.
 * @param params.linkedAccounts [OPTIONAL] The list of linked accounts to reveal in the generated DIP proof. If not provided, no account is revealed.
 *
 * @returns The [[SubmittableExtrinsic]] containing the signed cross-chain operation, that must be submitted by the account specified as the `submitterAddress` parameter.
 */
export async function generateDipProofForParent({
  call,
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
  accountIdRuntimeType = defaultValues.accountIdRuntimeType,
  blockNumberRuntimeType = defaultValues.blockNumberRuntimeType,
  identityDetailsRuntimeType = defaultValues.identityDetailsRuntimeType,
  includeWeb3Name = defaultValues.includeWeb3Name,
  linkedAccounts = defaultValues.linkedAccounts,
}: DipParentProofInput): Promise<SubmittableExtrinsic> {
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
    relayParentBlockHash: providerStateRootProofRelayBlockHash,
  } = await generateProviderStateRootProof({
    relayApi,
    providerApi,
    providerBlockHeight,
  })

  const providerStateRootProofRelayBlockHeader =
    await relayApi.rpc.chain.getHeader(providerStateRootProofRelayBlockHash)

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
      api: relayApi,
      call,
      submitterAddress,
      accountIdRuntimeType,
      blockHeight,
      blockNumberRuntimeType,
      genesisHash,
      identityDetailsRuntimeType,
    },
  })

  return relayApi.tx.dipConsumer.dispatchAs(toChain(didDocument.id), {
    [`V${proofVersion}`]: {
      paraStateRoot: {
        relayBlockHeight: providerStateRootProofRelayBlockHeight,
        proof: providerStateRootProof,
      },
      header: {
        ...providerStateRootProofRelayBlockHeader.toJSON(),
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
