/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { RegistryTypes } from '@polkadot/types/types'
import { types17 } from './types_17.js'

// Remove old DID types
delete types17.DidCreationOperation
delete types17.DidUpdateOperation
delete types17.DidDeletionOperation

export const types18: RegistryTypes = {
  ...types17,

  // DID management update
  DidCreationDetails: {
    did: 'DidIdentifierOf',
    newKeyAgreementKeys: 'BTreeSet<DidEncryptionKey>',
    newAttestationKey: 'Option<DidVerificationKey>',
    newDelegationKey: 'Option<DidVerificationKey>',
    newEndpointUrl: 'Option<Url>',
  },
  DidUpdateDetails: {
    newAuthenticationKey: 'Option<DidVerificationKey>',
    newKeyAgreementKeys: 'BTreeSet<DidEncryptionKey>',
    attestationKeyUpdate: 'DidVerificationKeyUpdateAction',
    delegationKeyUpdate: 'DidVerificationKeyUpdateAction',
    publicKeysToRemove: 'BTreeSet<KeyIdOf>',
    newEndpointUrl: 'Option<Url>',
  },
}
