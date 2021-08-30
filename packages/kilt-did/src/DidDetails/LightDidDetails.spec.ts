/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group unit/did
 */

import { encodeAddress } from '@kiltprotocol/utils/src/Crypto'
import type { IDidKeyDetails, ServiceDetails } from '@kiltprotocol/types'
import { hexToU8a } from '@polkadot/util'
import { getKiltDidFromIdentifier } from '../Did.utils'
import { LightDidDetails } from './LightDidDetails'
import type { LightDidDetailsCreationOpts } from './LightDidDetails'
import { serializeAndEncodeAdditionalLightDidDetails } from './utils'

describe('Light DID tests', () => {
  const authPublicKeyHex =
    '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
  const encPublicKeyHex =
    '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
  const testDid = getKiltDidFromIdentifier(
    encodeAddress(hexToU8a(authPublicKeyHex), 38)
  )
  const authenticationDidKeyDetails = {
    id: `${testDid}#1`,
    controller: testDid,
    includedAt: 100,
    type: 'ed25519',
    publicKeyHex: authPublicKeyHex,
  }
  let encryptionDidKeyDetails: IDidKeyDetails | undefined
  let services: ServiceDetails[] | undefined

  it('creates LightDidDetails from authentication key, encryption key, and service endpoints', () => {
    encryptionDidKeyDetails = {
      id: `${testDid}#2`,
      controller: testDid,
      includedAt: 101,
      type: 'x25519',
      publicKeyHex: encPublicKeyHex,
    }
    services = [
      {
        id: `${testDid}#service1`,
        type: 'messaging',
        serviceEndpoint: 'example.com',
      },
      {
        id: `${testDid}#service2`,
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
      id: `${testDid}#2`,
      controller: testDid,
      includedAt: 101,
      type: 'x25519',
      publicKeyHex: encPublicKeyHex,
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
        id: `${testDid}#service1`,
        type: 'messaging',
        serviceEndpoint: 'example.com',
      },
      {
        id: `${testDid}#service2`,
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
