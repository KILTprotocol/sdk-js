/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { RegistryTypes } from '@polkadot/types/types'
import { subtype } from './subtype.js'
import { types17 } from './types_17.js'

export const types18: RegistryTypes = {
  // Remove old DID types
  ...subtype(types17, [
    'DidCreationOperation',
    'DidUpdateOperation',
    'DidDeletionOperation',
  ]),

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
