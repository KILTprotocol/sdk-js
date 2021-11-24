/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/* eslint-disable @typescript-eslint/no-non-null-assertion */

/**
 * @group unit/did
 */

import { hexToU8a } from '@polkadot/util'
import { encodeAddress } from '@polkadot/util-crypto'
import type { IDidServiceEndpoint } from '@kiltprotocol/types'
import { LightDidDetails } from './LightDidDetails'
import type { INewPublicKey, LightDidDetailsCreationOpts } from '../types'

describe('Light DID v1 tests', () => {
  const authPublicKey = hexToU8a(
    '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
  )
  const encPublicKey = hexToU8a(
    '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
  )
  let serviceEndpoint: IDidServiceEndpoint
  const address = encodeAddress(authPublicKey, 38)
  const authenticationDidKeyDetails: INewPublicKey = {
    publicKey: authPublicKey,
    type: 'ed25519',
  }
  let encryptionDidKeyDetails: INewPublicKey | undefined

  it('creates LightDidDetails from authentication key only', () => {
    const didCreationDetails: LightDidDetailsCreationOpts = {
      authenticationKey: authenticationDidKeyDetails,
    }

    const did = new LightDidDetails(didCreationDetails)
    expect(did.did).toEqual(`did:kilt:light:01${address}`)
  })

  it('creates LightDidDetails from authentication key and encryption key', () => {
    encryptionDidKeyDetails = {
      publicKey: encPublicKey,
      type: 'x25519',
    }

    const didCreationDetails: LightDidDetailsCreationOpts = {
      authenticationKey: authenticationDidKeyDetails,
      encryptionKey: encryptionDidKeyDetails,
    }

    const did = new LightDidDetails(didCreationDetails)
    expect(did.did).toEqual(
      `did:kilt:light:01${address}:oWFlomlwdWJsaWNLZXnYQFggu7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7tkdHlwZWZ4MjU1MTk=`
    )
  })

  it('creates LightDidDetails from authentication key, encryption key, and service endpoints', () => {
    encryptionDidKeyDetails = {
      publicKey: encPublicKey,
      type: 'x25519',
    }

    serviceEndpoint = {
      id: 'my-service-endpoint',
      types: ['CollatorCredentialType', 'SocialKYCType'],
      urls: ['https://my_domain.org', 'random_domain'],
    }

    const didCreationDetails: LightDidDetailsCreationOpts = {
      authenticationKey: authenticationDidKeyDetails,
      encryptionKey: encryptionDidKeyDetails,
      serviceEndpoints: [serviceEndpoint],
    }

    const did = new LightDidDetails(didCreationDetails)
    expect(did.did).toEqual(
      `did:kilt:light:01${address}:omFlomlwdWJsaWNLZXnYQFggu7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7tkdHlwZWZ4MjU1MTlhc4GjYmlkc215LXNlcnZpY2UtZW5kcG9pbnRldHlwZXOCdkNvbGxhdG9yQ3JlZGVudGlhbFR5cGVtU29jaWFsS1lDVHlwZWR1cmxzgnVodHRwczovL215X2RvbWFpbi5vcmdtcmFuZG9tX2RvbWFpbg==`
    )
  })
})
