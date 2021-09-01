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

import { encodeAddress } from '@kiltprotocol/utils/src/Crypto'
import type { ServiceDetails } from '@kiltprotocol/types'
import { hexToU8a } from '@polkadot/util'
import { getKiltDidFromIdentifier } from '../Did.utils'
import { LightDidDetails, LightDidDetailsCreationOpts } from './LightDidDetails'
import { serializeAndEncodeAdditionalLightDidDetails } from './utils'
import type { INewPublicKey } from '../types'

describe('Light DID tests', () => {
  const authPublicKey = hexToU8a(
    '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
  )
  const encPublicKey = hexToU8a(
    '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
  )
  const testDid = getKiltDidFromIdentifier(
    encodeAddress(authPublicKey, 38),
    'light',
    LightDidDetails.LIGHT_DID_VERSION
  )
  const authenticationDidKeyDetails: INewPublicKey = {
    publicKey: authPublicKey,
    type: 'ed25519',
  }
  let encryptionDidKeyDetails: INewPublicKey | undefined
  let services: ServiceDetails[] | undefined

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

    const encodedAdditionalDetails = serializeAndEncodeAdditionalLightDidDetails(
      didCreationDetails
    )!

    const did = new LightDidDetails(didCreationDetails)
    expect(did.did).toEqual(testDid.concat(':', encodedAdditionalDetails))
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

    const encodedAdditionalDetails = serializeAndEncodeAdditionalLightDidDetails(
      didCreationDetails
    )!

    const did = new LightDidDetails(didCreationDetails)
    expect(did.did).toEqual(testDid.concat(':', encodedAdditionalDetails))
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

    const encodedAdditionalDetails = serializeAndEncodeAdditionalLightDidDetails(
      didCreationDetails
    )!

    const did = new LightDidDetails(didCreationDetails)
    expect(did.did).toEqual(testDid.concat(':', encodedAdditionalDetails))
  })

  it('creates LightDidDetails from authentication key only', () => {
    const didCreationDetails: LightDidDetailsCreationOpts = {
      authenticationKey: authenticationDidKeyDetails,
    }

    const did = new LightDidDetails(didCreationDetails)
    // no concat of : and encoded details
    expect(did.did).toEqual(testDid)
  })
})
