/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { RegistryTypes } from '@polkadot/types/types'

export const types10720: RegistryTypes = {
  // DID state_call
  RawDidLinkedInfo: {
    identifier: 'AccountId32',
    accounts: 'Vec<PalletDidLookupLinkableAccountLinkableAccountId>',
    w3n: 'Option<Text>',
    serviceEndpoints: 'Vec<RawServiceEndpoints>',
    details: 'RawDidDetails',
  },
  RawServiceEndpoints: {
    id: 'Text',
    serviceTypes: 'Vec<Text>',
    urls: 'Vec<Text>',
  },
  RawDidDetails: {
    authenticationKey: 'Hash',
    keyAgreementKeys: 'BTreeSet<Hash>',
    delegationKey: 'Option<Hash>',
    attestationKey: 'Option<Hash>',
    publicKeys: 'BTreeMap<Hash, DidDidDetailsDidPublicKeyDetails<BlockNumber>>',
    lastTxCounter: 'BlockNumber',
    deposit: 'KiltSupportDeposit<AccountId32, Balance>',
  },

  // TODO: Remove when we bump Spiritnet to 10900
  // ParachainStakingApi get_staking_rates
  StakingRates: {
    collatorStakingRate: 'Perquintill',
    collatorRewardRate: 'Perquintill',
    delegatorStakingRate: 'Perquintill',
    delegatorRewardRate: 'Perquintill',
  },
}
