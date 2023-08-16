/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { Did, Utils } from '@kiltprotocol/sdk-js'
import nacl from 'tweetnacl'
import { v4 } from 'uuid'

import { makeEncryptionKeyTool } from '../testUtils/index.js'

jest.mock('uuid')
jest.mocked(v4).mockReturnValue('1ee1307c-9e65-475d-9061-0b5bfd86d2f7')

// Mock nacl randombytes, so that the nonce and ciphertext stay the same between runs
jest.spyOn(nacl, 'randomBytes').mockReturnValue(new Uint8Array(24).fill(42))

function makeLightDidFromSeed(seed: string) {
  const keypair = Utils.Crypto.makeKeypairFromUri(seed, 'sr25519')
  const { keyAgreement } = makeEncryptionKeyTool(seed)

  const did = Did.createLightDidDocument({
    authentication: [keypair],
    keyAgreement,
    service: [
      {
        id: '#1234',
        type: ['KiltPublishedCredentialCollectionV1'],
        serviceEndpoint: [
          'https://ipfs.io/ipfs/QmNUAwg7JPK9nnuZiUri5nDaqLHqUFtNoZYtfD22Q6w3c8',
        ],
      },
    ],
  })

  return { did }
}

describe('Breaking Changes', () => {
  describe('Light DID', () => {
    it('does not break the light did uri generation', () => {
      const { did } = makeLightDidFromSeed(
        '0x127f2375faf3472c2f94ffcdd5424590b27294631f2cb8041407e501bc97c44c'
      )

      expect(did.uri).toMatchInlineSnapshot(
        `"did:kilt:light:004quk8nu1MLvzdoT4fE6SJsLS4fFpyvuGz7sQpMF7ZAWTDoF5:z1msTRicERqs59nwMvp3yzMRBhUYGmkum7ehY7rtKQc8HzfEx4b4eyRhrc37ZShT3oG7E89x89vaG9W4hRxPS23EAFnCSeVbVRrKGJmFQvYhjgKSMmrGC7gSxgHe1a3g41uamhD49AEi13YVMkgeHpyEQJBy7N7gGyW7jTWFcwzAnws4wSazBVG1qHmVJrhmusoJoTfKTPKXkExKyur8Z341EkcRkHteY8dV3VjLXHnfhRW2yU9oM2cRm5ozgaufxrXsQBx33ygTW2wvrfzzXsYw4Bs6Vf2tC3ipBTDcKyCk6G88LYnzBosRM15W3KmDRciJ2iPjqiQkhYm77EQyaw"`
      )

      expect(
        Did.parseDocumentFromLightDid(
          'did:kilt:light:004quk8nu1MLvzdoT4fE6SJsLS4fFpyvuGz7sQpMF7ZAWTDoF5:z1msTRicERqs59nwMvp3yzMRBhUYGmkum7ehY7rtKQc8HzfEx4b4eyRhrc37ZShT3oG7E89x89vaG9W4hRxPS23EAFnCSeVbVRrKGJmFQvYhjgKSMmrGC7gSxgHe1a3g41uamhD49AEi13YVMkgeHpyEQJBy7N7gGyW7jTWFcwzAnws4wSazBVG1qHmVJrhmusoJoTfKTPKXkExKyur8Z341EkcRkHteY8dV3VjLXHnfhRW2yU9oM2cRm5ozgaufxrXsQBx33ygTW2wvrfzzXsYw4Bs6Vf2tC3ipBTDcKyCk6G88LYnzBosRM15W3KmDRciJ2iPjqiQkhYm77EQyaw'
        )
      ).toMatchSnapshot()
    })
  })
})
