/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { Call } from '@polkadot/types/interfaces'
import type { Did, Hash, KiltAddress, VerificationMethod } from '@kiltprotocol/types'

import { ApiPromise } from '@polkadot/api'

type ProviderParachainHeadProofOps = {
  relayApi: ApiPromise
  relayBlockHash: Hash
}
export async function generateProviderParachainHeadProof({ relayApi, relayBlockHash }: ProviderParachainHeadProofOps): Promise<Uint8Array[]> {
  if (relayApi.query.paras?.heads === undefined) {
    throw new Error(
      'The relaychain provided does not have the "parachains" pallet deployed, hence it is not a relaychain.'
    )
  }
}

type SiblingDipProofOps = {
  relayAddressOrApi: string | ApiPromise
  consumerAddressOrApi: string | ApiPromise
  did: Did
  call: Call
  submitterAccount: KiltAddress
  verificationMethodId: VerificationMethod
}
export async function generateSiblingDipProof()