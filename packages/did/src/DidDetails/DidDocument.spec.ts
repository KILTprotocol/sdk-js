/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import {
  DidDocument,
  DidVerificationMethod,
  DidService,
} from '@kiltprotocol/types'

import { getService, getKey, getKeys } from './DidDocument'

const minimalDid: DidDocument = {
  id: 'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs',
  verificationMethod: [
    {
      id: 'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs#authentication',
      controller: 'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs',
      publicKeyMultibase: 'z00000',
      type: 'Sr25519VerificationKey2020',
    },
  ],
  authentication: ['#authentication'],
}

const maximalDid: DidDocument = {
  id: 'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs',
  verificationMethod: [
    {
      id: 'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs#authentication',
      controller: 'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs',
      publicKeyMultibase: 'z00000',
      type: 'Sr25519VerificationKey2020',
    },
    {
      id: 'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs#assertionMethod',
      controller: 'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs',
      publicKeyMultibase: 'z00000',
      type: 'Ed25519VerificationKey2018',
    },
    {
      id: 'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs#capabilityDelegation',
      controller: 'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs',
      publicKeyMultibase: 'z00000',
      type: 'EcdsaSecp256k1VerificationKey2019',
    },
    {
      id: 'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs#capabilityInvocation',
      controller: 'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs',
      publicKeyMultibase: 'z00000',
      type: 'EcdsaSecp256k1VerificationKey2019',
    },
    {
      id: 'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs#keyAgreement',
      controller: 'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs',
      publicKeyMultibase: 'z00000',
      type: 'X25519KeyAgreementKey2019',
    },
  ],
  authentication: ['#authentication'],
  assertionMethod: ['#assertionMethod'],
  capabilityDelegation: ['#capabilityDelegation'],
  capabilityInvocation: ['#capabilityInvocation'],
  keyAgreement: ['#keyAgreement'],
  service: [
    {
      id: 'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs#service',
      type: ['foo'],
      serviceEndpoint: ['https://example.com/'],
    },
  ],
}

describe('DidDetais', () => {
  describe('getKeys', () => {
    it('should get keys of a minimal DID', async () => {
      expect(getKeys(minimalDid)).toEqual(<DidVerificationMethod[]>[
        {
          id: 'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs#authentication',
          controller:
            'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs',
          publicKeyMultibase: 'z00000',
          type: 'Sr25519VerificationKey2020',
        },
      ])
    })
    it('should get keys of a maximal DID', async () => {
      expect(getKeys(maximalDid)).toEqual(<DidVerificationMethod[]>[
        {
          id: 'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs#authentication',
          controller:
            'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs',
          publicKeyMultibase: 'z00000',
          type: 'Sr25519VerificationKey2020',
        },
        {
          id: 'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs#assertionMethod',
          controller:
            'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs',
          publicKeyMultibase: 'z00000',
          type: 'Ed25519VerificationKey2018',
        },
        {
          id: 'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs#capabilityDelegation',
          controller:
            'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs',
          publicKeyMultibase: 'z00000',
          type: 'EcdsaSecp256k1VerificationKey2019',
        },
        {
          id: 'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs#capabilityInvocation',
          controller:
            'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs',
          publicKeyMultibase: 'z00000',
          type: 'EcdsaSecp256k1VerificationKey2019',
        },
        {
          id: 'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs#keyAgreement',
          controller:
            'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs',
          publicKeyMultibase: 'z00000',
          type: 'X25519KeyAgreementKey2019',
        },
      ])
    })
  })
  describe('getKey', () => {
    it('should get key by ID', async () => {
      expect(getKey(maximalDid, '#capabilityDelegation')).toEqual(<
        DidVerificationMethod
      >{
        id: 'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs#capabilityDelegation',
        controller: 'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs',
        publicKeyMultibase: 'z00000',
        type: 'EcdsaSecp256k1VerificationKey2019',
      })
    })
    it('should return undefined when key not found', async () => {
      expect(getKey(minimalDid, '#capabilityDelegation')).toEqual(undefined)
    })
  })
  describe('getService', () => {
    it('should get endpoint by ID', async () => {
      expect(getService(maximalDid, '#service')).toEqual(<DidService>{
        id: 'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs#service',
        type: ['foo'],
        serviceEndpoint: ['https://example.com/'],
      })
    })
    it('should return undefined when key not found', async () => {
      expect(getService(minimalDid, '#service')).toEqual(undefined)
    })
  })
})
