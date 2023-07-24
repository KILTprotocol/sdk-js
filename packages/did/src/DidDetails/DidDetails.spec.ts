/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { DidDocument, DidKey, DidServiceEndpoint } from '@kiltprotocol/types'

import { getService, getKey, getKeys } from './DidDetails'

const minimalDid: DidDocument = {
  uri: 'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs',
  authentication: [
    {
      id: '#authentication',
      publicKey: new Uint8Array(0),
      type: 'sr25519',
    },
  ],
}

const maximalDid: DidDocument = {
  uri: 'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs',
  authentication: [
    {
      id: '#authentication',
      publicKey: new Uint8Array(0),
      type: 'sr25519',
    },
  ],
  assertionMethod: [
    {
      id: '#assertionMethod',
      publicKey: new Uint8Array(0),
      type: 'ed25519',
    },
  ],
  capabilityDelegation: [
    {
      id: '#capabilityDelegation',
      publicKey: new Uint8Array(0),
      type: 'ecdsa',
    },
  ],
  keyAgreement: [
    {
      id: '#keyAgreement',
      publicKey: new Uint8Array(0),
      type: 'x25519',
    },
  ],
  service: [
    {
      id: '#service',
      type: ['foo'],
      serviceEndpoint: ['https://example.com/'],
    },
  ],
}

describe('DidDetais', () => {
  describe('getKeys', () => {
    it('should get keys of a minimal DID', async () => {
      expect(getKeys(minimalDid)).toEqual(<DidKey[]>[
        {
          id: '#authentication',
          publicKey: new Uint8Array(0),
          type: 'sr25519',
        },
      ])
    })
    it('should get keys of a maximal DID', async () => {
      expect(getKeys(maximalDid)).toEqual(<DidKey[]>[
        {
          id: '#authentication',
          publicKey: new Uint8Array(0),
          type: 'sr25519',
        },
        {
          id: '#assertionMethod',
          publicKey: new Uint8Array(0),
          type: 'ed25519',
        },
        {
          id: '#capabilityDelegation',
          publicKey: new Uint8Array(0),
          type: 'ecdsa',
        },
        {
          id: '#keyAgreement',
          publicKey: new Uint8Array(0),
          type: 'x25519',
        },
      ])
    })
  })
  describe('getKey', () => {
    it('should get key by ID', async () => {
      expect(getKey(maximalDid, '#capabilityDelegation')).toEqual(<DidKey>{
        id: '#capabilityDelegation',
        publicKey: new Uint8Array(0),
        type: 'ecdsa',
      })
    })
    it('should return undefined when key not found', async () => {
      expect(getKey(minimalDid, '#capabilityDelegation')).toEqual(undefined)
    })
  })
  describe('getService', () => {
    it('should get endpoint by ID', async () => {
      expect(getService(maximalDid, '#service')).toEqual(<DidServiceEndpoint>{
        id: '#service',
        serviceEndpoint: ['https://example.com/'],
        type: ['foo'],
      })
    })
    it('should return undefined when key not found', async () => {
      expect(getService(minimalDid, '#service')).toEqual(undefined)
    })
  })
})
