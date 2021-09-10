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

import type { IServiceDetails } from '@kiltprotocol/types'
import { hexToU8a } from '@polkadot/util'
import { encodeAddress } from '@polkadot/util-crypto'
import { LightDidDetails, LightDidDetailsCreationOpts } from './LightDidDetails'
import type { INewPublicKey } from '../types'

describe('Light DID v1 tests', () => {
  const authPublicKey = hexToU8a(
    '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
  )
  const encPublicKey = hexToU8a(
    '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
  )
  const address = encodeAddress(authPublicKey, 38)
  const authenticationDidKeyDetails: INewPublicKey = {
    publicKey: authPublicKey,
    type: 'ed25519',
  }
  let encryptionDidKeyDetails: INewPublicKey | undefined
  let services: IServiceDetails[] | undefined

  it('creates LightDidDetails from authentication key, encryption key, and service endpoints', () => {
    encryptionDidKeyDetails = {
      publicKey: encPublicKey,
      type: 'x25519',
    }
    services = [
      {
        id: `service1`,
        type: 'messaging',
        serviceEndpoint: 'example.com',
      },
      {
        id: `service2`,
        type: 'telephone',
        serviceEndpoint: '123344',
      },
    ]

    const didCreationDetails: LightDidDetailsCreationOpts = {
      authenticationKey: authenticationDidKeyDetails,
      encryptionKey: encryptionDidKeyDetails,
      services,
    }

    const did = new LightDidDetails(didCreationDetails)
    expect(did.did).toEqual(
      `did:kilt:light:01${address}:omFlomlwdWJsaWNLZXlYILu7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7ZHR5cGVmeDI1NTE5YXOCo2JpZGhzZXJ2aWNlMWR0eXBlaW1lc3NhZ2luZ29zZXJ2aWNlRW5kcG9pbnRrZXhhbXBsZS5jb22jYmlkaHNlcnZpY2UyZHR5cGVpdGVsZXBob25lb3NlcnZpY2VFbmRwb2ludGYxMjMzNDQ=`
    )
  })

  it('creates LightDidDetails from authentication key and encryption key only', () => {
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
      `did:kilt:light:01${address}:oWFlomlwdWJsaWNLZXlYILu7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7ZHR5cGVmeDI1NTE5`
    )
  })

  it('creates LightDidDetails from authentication key and service endpoints only', () => {
    services = [
      {
        id: `service1`,
        type: 'messaging',
        serviceEndpoint: 'example.com',
      },
      {
        id: `service2`,
        type: 'telephone',
        serviceEndpoint: '123344',
      },
    ]

    const didCreationDetails: LightDidDetailsCreationOpts = {
      authenticationKey: authenticationDidKeyDetails,
      services,
    }

    const did = new LightDidDetails(didCreationDetails)
    expect(did.did).toEqual(
      `did:kilt:light:01${address}:oWFzgqNiaWRoc2VydmljZTFkdHlwZWltZXNzYWdpbmdvc2VydmljZUVuZHBvaW50a2V4YW1wbGUuY29to2JpZGhzZXJ2aWNlMmR0eXBlaXRlbGVwaG9uZW9zZXJ2aWNlRW5kcG9pbnRmMTIzMzQ0`
    )
  })

  it('creates LightDidDetails from authentication key only', () => {
    const didCreationDetails: LightDidDetailsCreationOpts = {
      authenticationKey: authenticationDidKeyDetails,
    }

    const did = new LightDidDetails(didCreationDetails)
    // no concat of : and encoded details
    expect(did.did).toEqual(`did:kilt:light:01${address}`)
  })
})
