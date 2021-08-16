/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group unit/did
 */

import { TypeRegistry } from '@kiltprotocol/chain-helpers'
import { KeyRelationship, ServicesResolver } from '@kiltprotocol/types'
import { Crypto } from '@kiltprotocol/utils'
import { IDidRecord } from '../types'
import { DefaultResolver } from './DefaultResolver'

jest.mock('../Did.chain', () => {
  const queryByDID = jest.fn(
    async (did: string): Promise<IDidRecord | null> => ({
      did,
      authenticationKey: `${did}#auth`,
      keyAgreementKeys: [`${did}#x25519`],
      publicKeys: [
        {
          id: `${did}#auth`,
          type: 'ed25519',
          controller: did,
          publicKeyHex: '0x123',
          includedAt: 200,
        },
        {
          id: `${did}#x25519`,
          type: 'x25519',
          controller: did,
          publicKeyHex: '0x25519',
          includedAt: 250,
        },
      ],
      lastTxCounter: TypeRegistry.createType('u64', 10),
      endpointData: {
        urls: ['ipfs://mydidstuff'],
        contentHash: Crypto.hashStr('stuff'),
        contentType: 'application/json',
      },
    })
  )
  return {
    queryByDID,
    queryById: jest.fn(
      async (id: string): Promise<IDidRecord | null> =>
        queryByDID(`did:kilt:${id}`)
    ),
  }
})

const identifier = '4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs'
const did = `did:kilt:${identifier}`

it('resolves stuff', async () => {
  await expect(DefaultResolver.resolve({ did })).resolves.toMatchObject({
    did,
    identifier,
  })
})

it('has the right keys', async () => {
  const didRecord = await DefaultResolver.resolve({ did })
  expect(didRecord?.getKeyIds()).toStrictEqual([`${did}#auth`, `${did}#x25519`])
  expect(didRecord?.getKeyIds(KeyRelationship.authentication)).toStrictEqual([
    `${did}#auth`,
  ])
  expect(didRecord?.getKeys(KeyRelationship.keyAgreement)).toStrictEqual([
    {
      id: `${did}#x25519`,
      controller: did,
      includedAt: 250,
      type: 'x25519',
      publicKeyHex: '0x25519',
    },
  ])
})

it('adds services when service resolver is present', async () => {
  const service = {
    id: `${did}#messaging`,
    type: 'DidComm messaging',
    serviceEndpoint: `example.com/didcomm/${did}`,
  }
  const servicesResolver: ServicesResolver = jest.fn(async () => [service])

  await expect(
    DefaultResolver.resolve({ did }).then((didDetails) =>
      didDetails?.getServices('DidComm messaging')
    )
  ).resolves.toMatchObject([])

  await expect(
    DefaultResolver.resolve({
      did,
      servicesResolver,
    }).then((didDetails) => didDetails?.getServices('DidComm messaging'))
  ).resolves.toMatchObject([service])

  expect(servicesResolver).toHaveBeenCalledWith(
    expect.any(String),
    ['ipfs://mydidstuff'],
    'application/json'
  )
})
