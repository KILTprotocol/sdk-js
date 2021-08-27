/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group unit/did
 */

import { stringToHex } from '@polkadot/util'
import { encodeAddress } from '@kiltprotocol/utils/src/Crypto'
import { blake2AsU8a } from '@polkadot/util-crypto'
import { getKiltDidFromIdentifier } from '../Did.utils'
import { LightDidDetails } from './LightDidDetails'
import type { LightDidDetailsCreationOpts } from './LightDidDetails'

describe('Light DID tests', () => {
  const testSeed = 'testseed'
  const testDid = getKiltDidFromIdentifier(
    encodeAddress(blake2AsU8a(testSeed, 32 * 8), 38)
  )
  const authenticationDidKeyDetails = {
    id: `${testDid}#1`,
    controller: testDid,
    includedAt: 100,
    type: 'ed25519',
    publicKeyHex: '0xaa',
  }
  const encryptionDidKeyDetails = {
    id: `${testDid}#2`,
    controller: testDid,
    includedAt: 101,
    type: 'x25519',
    publicKeyHex: '0xff',
  }
  const services = [
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
  const didDetails: LightDidDetailsCreationOpts = {
    authenticationKey: authenticationDidKeyDetails,
    encryptionKey: encryptionDidKeyDetails,
    services,
  }

  const encodedAdditionalDetails: string = stringToHex(
    JSON.stringify({
      encryptionKey: encryptionDidKeyDetails,
      services,
    })
  )

  it('creates LightDidDetails from authentication key, encryption key, and service endpoints', () => {
    const did = new LightDidDetails(didDetails)
    expect(did.did).toEqual(testDid.concat(encodedAdditionalDetails))
  })
})
