/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { TypeRegistry } from '@kiltprotocol/chain-helpers'
import { IDidRecord } from '../types'
import { resolveDid, ServicesResolver } from './Resolver'

jest.mock('../Did.chain', () => ({
  queryByDID: jest.fn(
    async (did: string): Promise<IDidRecord | null> => ({
      did,
      authenticationKey: `${did}#auth`,
      keyAgreementKeys: [`${did}#x25519`],
      publicKeys: [
        {
          id: `${did}#auth`,
          includedAt: 200,
          type: 'ed25519',
          publicKeyHex: '0x123',
        },
        {
          id: `${did}#x25519`,
          includedAt: 250,
          type: 'x25519',
          publicKeyHex: '0x25519',
        },
      ],
      lastTxCounter: TypeRegistry.createType('u64', 10),
      endpointUrl: 'ipfs://mydidstuff',
    })
  ),
}))

it('resolves stuff', async () => {
  await expect(resolveDid({ did: 'did:kilt:test' })).resolves.toMatchObject({
    did: 'did:kilt:test',
    identifier: 'test',
  })
})

it('has the right keys', async () => {
  const didRecord = await resolveDid({ did: 'did:kilt:test' })
  expect(didRecord?.getKeyIds()).toStrictEqual([
    'did:kilt:test#auth',
    'did:kilt:test#x25519',
  ])
  expect(didRecord?.getKeyIds('authentication')).toStrictEqual([
    'did:kilt:test#auth',
  ])
  expect(didRecord?.getKeys('keyAgreement')).toStrictEqual([
    {
      id: 'did:kilt:test#x25519',
      includedAt: 250,
      type: 'x25519',
      publicKeyHex: '0x25519',
    },
  ])
})

it('adds services when service resolver is present', async () => {
  const service = {
    id: 'did:kilt:test#messaging',
    type: 'DidComm messaging',
    serviceEndpoint: 'example.com/didcomm/did:kilt:test',
  }
  const servicesResolver: ServicesResolver = jest.fn(async () => [service])

  await expect(
    resolveDid({ did: 'did:kilt:test' }).then((did) =>
      did?.getServices('DidComm messaging')
    )
  ).resolves.toMatchObject([])

  await expect(
    resolveDid({ did: 'did:kilt:test', servicesResolver }).then((did) =>
      did?.getServices('DidComm messaging')
    )
  ).resolves.toMatchObject([service])

  expect(servicesResolver).toHaveBeenCalledWith(
    'ipfs://mydidstuff',
    expect.objectContaining({ did: 'did:kilt:test' })
  )
})
