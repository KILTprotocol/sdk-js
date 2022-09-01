/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group integration/did
 */

import type { ApiPromise } from '@polkadot/api'
import { BN } from '@polkadot/util'

import * as Did from '@kiltprotocol/did'
import { resolve, Web3Names } from '@kiltprotocol/did'
import {
  createFullDidFromSeed,
  createMinimalLightDidFromKeypair,
  KeyTool,
  makeEncryptionKeyTool,
  makeSigningKeyTool,
} from '@kiltprotocol/testing'
import { BlockchainApiConnection } from '@kiltprotocol/chain-helpers'
import {
  DidDetails,
  DidResolvedDetails,
  DidServiceEndpoint,
  KiltKeyringPair,
  NewDidEncryptionKey,
  NewDidVerificationKey,
  NewLightDidVerificationKey,
  Permission,
} from '@kiltprotocol/types'
import { UUID } from '@kiltprotocol/utils'

import * as CType from '../ctype'
import { disconnect } from '../kilt'
import {
  createEndowedTestAccount,
  devBob,
  initializeApi,
  submitExtrinsic,
} from './utils'
import { DelegationNode } from '../delegation'

let paymentAccount: KiltKeyringPair
let api: ApiPromise

beforeAll(async () => {
  await initializeApi()
  api = await BlockchainApiConnection.getConnectionOrConnect()
}, 30_000)

beforeAll(async () => {
  paymentAccount = await createEndowedTestAccount()
}, 30_000)

it('fetches the correct deposit amount', async () => {
  const depositAmount = await Did.Chain.queryDepositAmount()
  expect(depositAmount.toString()).toMatchInlineSnapshot('"2007900000000000"')
})

describe('write and didDeleteTx', () => {
  let details: DidDetails
  let key: KeyTool

  beforeAll(async () => {
    key = makeSigningKeyTool()
    details = await createMinimalLightDidFromKeypair(key.keypair)
  })

  it('fails to create a new DID on chain with a different submitter than the one in the creation operation', async () => {
    const otherAccount = devBob
    const tx = await Did.Chain.getStoreTx(
      details,
      otherAccount.address,
      key.sign
    )

    await expect(submitExtrinsic(tx, paymentAccount)).rejects.toMatchObject({
      isBadOrigin: true,
    })
  }, 60_000)

  it('writes a new DID record to chain', async () => {
    const newDetails = Did.createLightDidDetails({
      authentication: details.authentication as [NewLightDidVerificationKey],
      service: [
        {
          id: '#test-id-1',
          type: ['test-type-1'],
          serviceEndpoint: ['x:test-url-1'],
        },
        {
          id: '#test-id-2',
          type: ['test-type-2'],
          serviceEndpoint: ['x:test-url-2'],
        },
      ],
    })

    const tx = await Did.Chain.getStoreTx(
      newDetails,
      paymentAccount.address,
      key.sign
    )

    await submitExtrinsic(tx, paymentAccount)

    const fullDidUri = Did.Utils.getFullDidUri(newDetails.uri)
    const fullDid = (await Did.query(fullDidUri)) as DidDetails

    expect(fullDid).toMatchObject(<DidDetails>{
      uri: fullDidUri,
      authentication: [
        expect.objectContaining({
          // We cannot match the ID of the key because it will be defined by the blockchain while saving
          publicKey: newDetails.authentication[0].publicKey,
          type: 'sr25519',
        }),
      ],
      service: [
        {
          id: '#test-id-1',
          serviceEndpoint: ['x:test-url-1'],
          type: ['test-type-1'],
        },
        {
          id: '#test-id-2',
          serviceEndpoint: ['x:test-url-2'],
          type: ['test-type-2'],
        },
      ],
    })
  }, 60_000)

  it('should return no results for empty accounts', async () => {
    const emptyDid = Did.Utils.getFullDidUriFromKey(
      makeSigningKeyTool().authentication[0]
    )

    expect(await Did.Chain.queryServiceEndpoints(emptyDid)).toBeDefined()
    expect(await Did.Chain.queryServiceEndpoints(emptyDid)).toHaveLength(0)

    expect(
      await Did.Chain.queryServiceEndpoint(emptyDid, '#non-existing-service-id')
    ).toBeNull()

    const endpointsCount = await Did.Chain.queryEndpointsCounts(emptyDid)
    expect(endpointsCount.toString()).toStrictEqual(new BN(0).toString())
  })

  it('fails to delete the DID using a different submitter than the one specified in the DID operation or using a services count that is too low', async () => {
    // We verify that the DID to delete is on chain.
    const fullDid = (await Did.query(
      Did.Utils.getFullDidUri(details.uri)
    )) as DidDetails
    expect(fullDid).not.toBeNull()

    const otherAccount = devBob

    // 10 is an example value. It is not used here since we are testing another error
    let call = await api.tx.did.delete(new BN(10))

    let submittable = await Did.authorizeExtrinsic(
      fullDid,
      call,
      key.sign,
      // Use a different account than the submitter one
      otherAccount.address
    )

    await expect(
      submitExtrinsic(submittable, paymentAccount)
    ).rejects.toMatchObject({ section: 'did', name: 'BadDidOrigin' })

    // We use 1 here and this should fail as there are two service endpoints stored.
    call = await api.tx.did.delete(new BN(1))

    submittable = await Did.authorizeExtrinsic(
      fullDid,
      call,
      key.sign,
      paymentAccount.address
    )

    // Will fail because count provided is too low
    await expect(
      submitExtrinsic(submittable, paymentAccount)
    ).rejects.toMatchObject({
      section: 'did',
      name: 'StoredEndpointsCountTooLarge',
    })
  }, 60_000)

  it('deletes DID from previous step', async () => {
    // We verify that the DID to delete is on chain.
    const fullDid = (await Did.query(
      Did.Utils.getFullDidUri(details.uri)
    )) as DidDetails
    expect(fullDid).not.toBeNull()

    const storedEndpointsCount = await Did.Chain.queryEndpointsCounts(
      fullDid.uri
    )
    const call = await api.tx.did.delete(storedEndpointsCount)

    const submittable = await Did.authorizeExtrinsic(
      fullDid,
      call,
      key.sign,
      paymentAccount.address
    )

    // Check that DID is not blacklisted.
    expect(await Did.Chain.queryDeletedDids()).not.toContain(fullDid.uri)
    expect(await Did.Chain.queryDidDeletionStatus(fullDid.uri)).toBe(false)

    await submitExtrinsic(submittable, paymentAccount)

    expect(await Did.Chain.queryDetails(fullDid.uri)).toBeNull()

    // Check that DID is now blacklisted.
    expect(await Did.Chain.queryDeletedDids()).toContain(fullDid.uri)
    expect(await Did.Chain.queryDidDeletionStatus(fullDid.uri)).toBe(true)
  }, 60_000)
})

it('creates and updates DID, and then reclaims the deposit back', async () => {
  const { keypair, sign } = makeSigningKeyTool()
  const newDetails = await createMinimalLightDidFromKeypair(keypair)

  const tx = await Did.Chain.getStoreTx(
    newDetails,
    paymentAccount.address,
    sign
  )

  await submitExtrinsic(tx, paymentAccount)

  // This will better be handled once we have the UpdateBuilder class, which encapsulates all the logic.
  let fullDetails = (await Did.query(
    Did.Utils.getFullDidUri(newDetails.uri)
  )) as DidDetails

  const newKey = makeSigningKeyTool()

  const updateAuthenticationKeyCall = api.tx.did.setAuthenticationKey(
    Did.Chain.encodePublicKey(newKey.authentication[0])
  )
  const tx2 = await Did.authorizeExtrinsic(
    fullDetails,
    updateAuthenticationKeyCall,
    sign,
    paymentAccount.address
  )
  await submitExtrinsic(tx2, paymentAccount)

  // Authentication key changed, so details must be updated.
  // Also this will better be handled once we have the UpdateBuilder class, which encapsulates all the logic.
  fullDetails = (await Did.query(
    Did.Utils.getFullDidUri(newDetails.uri)
  )) as DidDetails

  // Add a new service endpoint
  const newEndpoint: DidServiceEndpoint = {
    id: '#new-endpoint',
    type: ['new-type'],
    serviceEndpoint: ['x:new-url'],
  }
  const updateEndpointCall = await Did.Chain.getAddEndpointExtrinsic(
    newEndpoint
  )

  const tx3 = await Did.authorizeExtrinsic(
    fullDetails,
    updateEndpointCall,
    newKey.sign,
    paymentAccount.address
  )
  await submitExtrinsic(tx3, paymentAccount)
  expect(
    await Did.Chain.queryServiceEndpoint(fullDetails.uri, newEndpoint.id)
  ).toStrictEqual(newEndpoint)

  // Delete the added service endpoint
  const removeEndpointCall = await api.tx.did.removeServiceEndpoint(
    Did.Chain.encodeResourceId(newEndpoint.id)
  )
  const tx4 = await Did.authorizeExtrinsic(
    fullDetails,
    removeEndpointCall,
    newKey.sign,
    paymentAccount.address
  )
  await submitExtrinsic(tx4, paymentAccount)

  // There should not be any endpoint with the given ID now.
  expect(
    await Did.Chain.queryServiceEndpoint(fullDetails.uri, newEndpoint.id)
  ).toBeNull()

  // Claim the deposit back
  const storedEndpointsCount = await Did.Chain.queryEndpointsCounts(
    fullDetails.uri
  )
  const reclaimDepositTx = await api.tx.did.reclaimDeposit(
    Did.Chain.encodeDid(fullDetails.uri),
    storedEndpointsCount
  )
  await submitExtrinsic(reclaimDepositTx, paymentAccount)
  // Verify that the DID has been deleted
  expect(await Did.Chain.queryDetails(fullDetails.uri)).toBeNull()
  expect(await Did.Chain.queryServiceEndpoints(fullDetails.uri)).toHaveLength(0)
  const newEndpointsCount = await Did.Chain.queryEndpointsCounts(
    fullDetails.uri
  )
  expect(newEndpointsCount.toString()).toStrictEqual(new BN(0).toString())
}, 80_000)

describe('DID migration', () => {
  it('migrates light DID with ed25519 auth key and encryption key', async () => {
    const { sign, authentication } = makeSigningKeyTool('ed25519')
    const { keyAgreement } = makeEncryptionKeyTool(
      '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
    )
    const lightDidDetails = Did.createLightDidDetails({
      authentication,
      keyAgreement,
    })

    const storeTx = await Did.Chain.getStoreTx(
      lightDidDetails,
      paymentAccount.address,
      sign
    )

    await submitExtrinsic(storeTx, paymentAccount)
    const migratedFullDidUri = Did.Utils.getFullDidUri(lightDidDetails.uri)
    const migratedFullDid = await Did.query(migratedFullDidUri)
    if (!migratedFullDid) throw new Error('Cannot query created DID')

    expect(migratedFullDid).toMatchObject(<DidDetails>{
      uri: migratedFullDidUri,
      authentication: [
        expect.objectContaining({
          publicKey: lightDidDetails.authentication[0].publicKey,
          type: 'ed25519',
        }),
      ],
      keyAgreement: [
        expect.objectContaining({
          publicKey: lightDidDetails.keyAgreement?.[0].publicKey,
          type: 'x25519',
        }),
      ],
    })

    expect(await Did.Chain.queryDetails(migratedFullDid.uri)).not.toBeNull()

    const { metadata } = (await resolve(
      lightDidDetails.uri
    )) as DidResolvedDetails

    expect(metadata.canonicalId).toStrictEqual(migratedFullDid.uri)
    expect(metadata.deactivated).toBe(false)
  })

  it('migrates light DID with sr25519 auth key', async () => {
    const { authentication, sign } = makeSigningKeyTool()
    const lightDidDetails = Did.createLightDidDetails({
      authentication,
    })

    const storeTx = await Did.Chain.getStoreTx(
      lightDidDetails,
      paymentAccount.address,
      sign
    )

    await submitExtrinsic(storeTx, paymentAccount)
    const migratedFullDidUri = Did.Utils.getFullDidUri(lightDidDetails.uri)
    const migratedFullDid = await Did.query(migratedFullDidUri)
    if (!migratedFullDid) throw new Error('Cannot query created DID')

    expect(migratedFullDid).toMatchObject(<DidDetails>{
      uri: migratedFullDidUri,
      authentication: [
        expect.objectContaining({
          publicKey: lightDidDetails.authentication[0].publicKey,
          type: 'sr25519',
        }),
      ],
    })

    expect(await Did.Chain.queryDetails(migratedFullDid.uri)).not.toBeNull()

    const { metadata } = (await resolve(
      lightDidDetails.uri
    )) as DidResolvedDetails

    expect(metadata.canonicalId).toStrictEqual(migratedFullDid.uri)
    expect(metadata.deactivated).toBe(false)
  })

  it('migrates light DID with ed25519 auth key, encryption key, and service endpoints', async () => {
    const { sign, authentication } = makeSigningKeyTool('ed25519')
    const { keyAgreement } = makeEncryptionKeyTool(
      '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc'
    )
    const service: DidServiceEndpoint[] = [
      {
        id: '#id-1',
        type: ['type-1'],
        serviceEndpoint: ['x:url-1'],
      },
    ]
    const lightDidDetails = Did.createLightDidDetails({
      authentication,
      keyAgreement,
      service,
    })

    const storeTx = await Did.Chain.getStoreTx(
      lightDidDetails,
      paymentAccount.address,
      sign
    )

    await submitExtrinsic(storeTx, paymentAccount)
    const migratedFullDidUri = Did.Utils.getFullDidUri(lightDidDetails.uri)
    const migratedFullDid = await Did.query(migratedFullDidUri)
    if (!migratedFullDid) throw new Error('Cannot query created DID')

    expect(migratedFullDid).toMatchObject(<DidDetails>{
      uri: migratedFullDidUri,
      authentication: [
        expect.objectContaining({
          publicKey: lightDidDetails.authentication[0].publicKey,
          type: 'ed25519',
        }),
      ],
      keyAgreement: [
        expect.objectContaining({
          publicKey: lightDidDetails.keyAgreement?.[0].publicKey,
          type: 'x25519',
        }),
      ],
      service: [
        {
          id: '#id-1',
          type: ['type-1'],
          serviceEndpoint: ['x:url-1'],
        },
      ],
    })

    expect(await Did.Chain.queryDetails(migratedFullDid.uri)).not.toBeNull()

    const { metadata } = (await resolve(
      lightDidDetails.uri
    )) as DidResolvedDetails

    expect(metadata.canonicalId).toStrictEqual(migratedFullDid.uri)
    expect(metadata.deactivated).toBe(false)

    // Remove and claim the deposit back
    const storedEndpointsCount = await Did.Chain.queryEndpointsCounts(
      migratedFullDid.uri
    )
    const reclaimDepositTx = await api.tx.did.reclaimDeposit(
      Did.Chain.encodeDid(migratedFullDid.uri),
      storedEndpointsCount
    )
    await submitExtrinsic(reclaimDepositTx, paymentAccount)

    expect(await Did.Chain.queryDetails(migratedFullDid.uri)).toBeNull()
    expect(
      await Did.Chain.queryServiceEndpoints(migratedFullDid.uri)
    ).toStrictEqual([])
    expect(await Did.Chain.queryDidDeletionStatus(migratedFullDid.uri)).toBe(
      true
    )
  }, 60_000)
})

describe('DID authorization', () => {
  // Light DIDs cannot authorize extrinsics
  let didDetails: DidDetails
  const { sign, authentication } = makeSigningKeyTool('ed25519')

  beforeAll(async () => {
    const createTx = await Did.Chain.getStoreTx(
      {
        authentication,
        assertionMethod: authentication,
        capabilityDelegation: authentication,
      },
      paymentAccount.address,
      sign
    )
    await submitExtrinsic(createTx, paymentAccount)
    const optional = await Did.query(
      Did.Utils.getFullDidUriFromKey(authentication[0])
    )
    if (!optional) throw new Error('Cannot query created DID')
    didDetails = optional
  }, 60_000)

  it('authorizes ctype creation with DID signature', async () => {
    const ctype = CType.fromSchema({
      title: UUID.generate(),
      properties: {},
      type: 'object',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
    })
    const call = await CType.getStoreTx(ctype)
    const tx = await Did.authorizeExtrinsic(
      didDetails,
      call,
      sign,
      paymentAccount.address
    )
    await submitExtrinsic(tx, paymentAccount)

    expect(await CType.verifyStored(ctype)).toEqual(true)
  }, 60_000)

  it('no longer authorizes ctype creation after DID deletion', async () => {
    const storedEndpointsCount = await Did.Chain.queryEndpointsCounts(
      didDetails.uri
    )
    const deleteCall = await api.tx.did.delete(storedEndpointsCount)
    const tx = await Did.authorizeExtrinsic(
      didDetails,
      deleteCall,
      sign,
      paymentAccount.address
    )
    await submitExtrinsic(tx, paymentAccount)

    const ctype = CType.fromSchema({
      title: UUID.generate(),
      properties: {},
      type: 'object',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
    })
    const call = await CType.getStoreTx(ctype)
    const tx2 = await Did.authorizeExtrinsic(
      didDetails,
      call,
      sign,
      paymentAccount.address
    )
    await expect(submitExtrinsic(tx2, paymentAccount)).rejects.toMatchObject({
      section: 'did',
      name: 'DidNotPresent',
    })

    expect(await CType.verifyStored(ctype)).toEqual(false)
  }, 60_000)
})

describe('DID management batching', () => {
  describe('FullDidCreationBuilder', () => {
    it('Build a complete full DID', async () => {
      const { keypair, sign, authentication } = makeSigningKeyTool()
      const extrinsic = await Did.Chain.getStoreTx(
        {
          authentication,
          assertionMethod: [
            {
              publicKey: new Uint8Array(32).fill(1),
              type: 'sr25519',
            },
          ],
          capabilityDelegation: [
            {
              publicKey: new Uint8Array(33).fill(1),
              type: 'ecdsa',
            },
          ],
          keyAgreement: [
            {
              publicKey: new Uint8Array(32).fill(1),
              type: 'x25519',
            },
            {
              publicKey: new Uint8Array(32).fill(2),
              type: 'x25519',
            },
            {
              publicKey: new Uint8Array(32).fill(3),
              type: 'x25519',
            },
          ],
          service: [
            {
              id: '#id-1',
              type: ['type-1'],
              serviceEndpoint: ['x:url-1'],
            },
            {
              id: '#id-2',
              type: ['type-2'],
              serviceEndpoint: ['x:url-2'],
            },
            {
              id: '#id-3',
              type: ['type-3'],
              serviceEndpoint: ['x:url-3'],
            },
          ],
        },
        paymentAccount.address,
        sign
      )
      await submitExtrinsic(extrinsic, paymentAccount)

      const fullDid = await Did.query(
        Did.Utils.getFullDidUriFromKey(authentication[0])
      )

      expect(fullDid).not.toBeNull()
      if (!fullDid) throw new Error('Cannot query created DID')

      expect(fullDid).toMatchObject({
        authentication: [
          expect.objectContaining({
            publicKey: keypair.publicKey,
            type: 'sr25519',
          }),
        ],
        assertionMethod: [
          expect.objectContaining({
            publicKey: new Uint8Array(32).fill(1),
            type: 'sr25519',
          }),
        ],
        capabilityDelegation: [
          expect.objectContaining({
            publicKey: new Uint8Array(33).fill(1),
            type: 'ecdsa',
          }),
        ],
        keyAgreement: [
          expect.objectContaining({
            publicKey: new Uint8Array(32).fill(3),
            type: 'x25519',
          }),
          expect.objectContaining({
            publicKey: new Uint8Array(32).fill(2),
            type: 'x25519',
          }),
          expect.objectContaining({
            publicKey: new Uint8Array(32).fill(1),
            type: 'x25519',
          }),
        ],
        service: [
          {
            id: '#id-3',
            type: ['type-3'],
            serviceEndpoint: ['x:url-3'],
          },
          {
            id: '#id-1',
            type: ['type-1'],
            serviceEndpoint: ['x:url-1'],
          },
          {
            id: '#id-2',
            type: ['type-2'],
            serviceEndpoint: ['x:url-2'],
          },
        ],
      })
    })

    it('Build a minimal full DID with an Ecdsa key', async () => {
      const { keypair, sign } = makeSigningKeyTool('ecdsa-secp256k1')
      const didAuthKey: NewDidVerificationKey = {
        publicKey: keypair.publicKey,
        type: 'ecdsa',
      }

      const extrinsic = await Did.Chain.getStoreTx(
        { authentication: [didAuthKey] },
        paymentAccount.address,
        sign
      )
      await submitExtrinsic(extrinsic, paymentAccount)

      const fullDid = await Did.query(
        Did.Utils.getFullDidUriFromKey(didAuthKey)
      )

      expect(fullDid).not.toBeNull()
      expect(fullDid?.authentication).toMatchObject<NewDidVerificationKey[]>([
        {
          publicKey: keypair.publicKey,
          type: 'ecdsa',
        },
      ])
    })
  })

  describe('FullDidUpdateBuilder', () => {
    it('Build from a complete full DID and remove everything but the authentication key', async () => {
      const { keypair, sign, authentication } = makeSigningKeyTool()

      const createTx = await Did.Chain.getStoreTx(
        {
          authentication,
          keyAgreement: [
            {
              publicKey: new Uint8Array(32).fill(1),
              type: 'x25519',
            },
            {
              publicKey: new Uint8Array(32).fill(2),
              type: 'x25519',
            },
          ],
          assertionMethod: [
            {
              publicKey: new Uint8Array(32).fill(1),
              type: 'sr25519',
            },
          ],
          capabilityDelegation: [
            {
              publicKey: new Uint8Array(33).fill(1),
              type: 'ecdsa',
            },
          ],
          service: [
            {
              id: '#id-1',
              type: ['type-1'],
              serviceEndpoint: ['x:url-1'],
            },
            {
              id: '#id-2',
              type: ['type-2'],
              serviceEndpoint: ['x:url-2'],
            },
          ],
        },
        paymentAccount.address,
        sign
      )
      await submitExtrinsic(createTx, paymentAccount)

      const initialFullDid = await Did.query(
        Did.Utils.getFullDidUriFromKey(authentication[0])
      )
      if (!initialFullDid) throw new Error('Cannot query created DID')

      const encryptionKeys = initialFullDid.keyAgreement
      if (!encryptionKeys) throw new Error('No key agreement keys')

      const extrinsic = await Did.authorizeBatch({
        batchFunction: api.tx.utility.batchAll,
        did: initialFullDid,
        extrinsics: [
          await api.tx.did.removeKeyAgreementKey(
            Did.Utils.stripFragment(encryptionKeys[0].id)
          ),
          await api.tx.did.removeKeyAgreementKey(
            Did.Utils.stripFragment(encryptionKeys[1].id)
          ),
          await api.tx.did.removeAttestationKey(),
          await api.tx.did.removeDelegationKey(),
          await api.tx.did.removeServiceEndpoint('id-1'),
          await api.tx.did.removeServiceEndpoint('id-2'),
        ],
        sign,
        submitter: paymentAccount.address,
      })
      await submitExtrinsic(extrinsic, paymentAccount)

      const finalFullDid = (await Did.query(initialFullDid.uri)) as DidDetails

      expect(finalFullDid).not.toBeNull()

      expect(
        finalFullDid.authentication[0]
      ).toMatchObject<NewDidVerificationKey>({
        publicKey: keypair.publicKey,
        type: 'sr25519',
      })

      expect(finalFullDid.keyAgreement).toBeUndefined()
      expect(finalFullDid.assertionMethod).toBeUndefined()
      expect(finalFullDid.capabilityDelegation).toBeUndefined()
      expect(finalFullDid.service).toBeUndefined()
    }, 40_000)

    it('Correctly handles rotation of the authentication key', async () => {
      const { authentication, sign } = makeSigningKeyTool()
      const {
        authentication: [newAuthKey],
      } = makeSigningKeyTool('ed25519')

      const createTx = await Did.Chain.getStoreTx(
        { authentication },
        paymentAccount.address,
        sign
      )
      await submitExtrinsic(createTx, paymentAccount)

      const initialFullDid = await Did.query(
        Did.Utils.getFullDidUriFromKey(authentication[0])
      )
      if (!initialFullDid) throw new Error('Cannot query created DID')

      const extrinsic = await Did.authorizeBatch({
        batchFunction: api.tx.utility.batchAll,
        did: initialFullDid,
        extrinsics: [
          await Did.Chain.getAddEndpointExtrinsic({
            id: '#id-1',
            type: ['type-1'],
            serviceEndpoint: ['x:url-1'],
          }),
          api.tx.did.setAuthenticationKey(
            Did.Chain.encodePublicKey(newAuthKey)
          ),
          await Did.Chain.getAddEndpointExtrinsic({
            id: '#id-2',
            type: ['type-2'],
            serviceEndpoint: ['x:url-2'],
          }),
        ],
        sign,
        submitter: paymentAccount.address,
      })

      await submitExtrinsic(extrinsic, paymentAccount)

      const finalFullDid = (await Did.query(initialFullDid.uri)) as DidDetails

      expect(finalFullDid).not.toBeNull()

      expect(finalFullDid.authentication[0]).toMatchObject(newAuthKey)

      expect(finalFullDid.keyAgreement).toBeUndefined()
      expect(finalFullDid.assertionMethod).toBeUndefined()
      expect(finalFullDid.capabilityDelegation).toBeUndefined()
      expect(finalFullDid.service).toHaveLength(2)
    }, 40_000)

    it('simple `batch` succeeds despite failures of some extrinsics', async () => {
      const { authentication, sign } = makeSigningKeyTool()
      const tx = await Did.Chain.getStoreTx(
        {
          authentication,
          service: [
            {
              id: '#id-1',
              type: ['type-1'],
              serviceEndpoint: ['x:url-1'],
            },
          ],
        },
        paymentAccount.address,
        sign
      )
      // Create the full DID with a service endpoint
      await submitExtrinsic(tx, paymentAccount)
      const fullDid = await Did.query(
        Did.Utils.getFullDidUriFromKey(authentication[0])
      )
      if (!fullDid) throw new Error('Cannot query created DID')

      expect(fullDid.assertionMethod).toBeUndefined()

      // Try to set a new attestation key and a duplicate service endpoint
      const updateTx = await Did.authorizeBatch({
        batchFunction: api.tx.utility.batch,
        did: fullDid,
        extrinsics: [
          api.tx.did.setAttestationKey(
            Did.Chain.encodePublicKey(authentication[0])
          ),
          await Did.Chain.getAddEndpointExtrinsic({
            id: '#id-1',
            type: ['type-2'],
            serviceEndpoint: ['x:url-2'],
          }),
        ],
        sign,
        submitter: paymentAccount.address,
      })
      // Now the second operation fails but the batch succeeds
      await submitExtrinsic(updateTx, paymentAccount)

      const updatedFullDid = await Did.query(fullDid.uri)
      if (!updatedFullDid) throw new Error('Cannot query created DID')

      // .setAttestationKey() extrinsic went through in the batch
      expect(updatedFullDid.assertionMethod?.[0]).toBeDefined()
      // The service endpoint will match the one manually added, and not the one set in the batch
      expect(
        Did.getEndpoint(updatedFullDid, '#id-1')
      ).toStrictEqual<DidServiceEndpoint>({
        id: '#id-1',
        type: ['type-1'],
        serviceEndpoint: ['x:url-1'],
      })
    }, 60_000)

    it('batchAll fails if any extrinsics fails', async () => {
      const { authentication, sign } = makeSigningKeyTool()
      const createTx = await Did.Chain.getStoreTx(
        {
          authentication,
          service: [
            {
              id: '#id-1',
              type: ['type-1'],
              serviceEndpoint: ['x:url-1'],
            },
          ],
        },
        paymentAccount.address,
        sign
      )
      await submitExtrinsic(createTx, paymentAccount)
      const fullDid = await Did.query(
        Did.Utils.getFullDidUriFromKey(authentication[0])
      )
      if (!fullDid) throw new Error('Cannot query created DID')

      expect(fullDid.assertionMethod).toBeUndefined()

      // Use batchAll to set a new attestation key and a duplicate service endpoint
      const updateTx = await Did.authorizeBatch({
        batchFunction: api.tx.utility.batchAll,
        did: fullDid,
        extrinsics: [
          api.tx.did.setAttestationKey(
            Did.Chain.encodePublicKey(authentication[0])
          ),
          await Did.Chain.getAddEndpointExtrinsic({
            id: '#id-1',
            type: ['type-2'],
            serviceEndpoint: ['x:url-2'],
          }),
        ],
        sign,
        submitter: paymentAccount.address,
      })

      // Now, submitting will result in the second operation to fail AND the batch to fail, so we can test the atomic flag.
      await expect(
        submitExtrinsic(updateTx, paymentAccount)
      ).rejects.toMatchObject({
        section: 'did',
        name: 'ServiceAlreadyPresent',
      })

      const updatedFullDid = await Did.query(fullDid.uri)
      if (!updatedFullDid) throw new Error('Cannot query created DID')
      // .setAttestationKey() extrinsic went through but it was then reverted
      expect(updatedFullDid.assertionMethod).toBeUndefined()
      // The service endpoint will match the one manually added, and not the one set in the builder.
      expect(
        Did.getEndpoint(updatedFullDid, '#id-1')
      ).toStrictEqual<DidServiceEndpoint>({
        id: '#id-1',
        type: ['type-1'],
        serviceEndpoint: ['x:url-1'],
      })
    }, 60_000)
  })
})

describe('DID extrinsics batching', () => {
  let fullDid: DidDetails
  let key: KeyTool

  beforeAll(async () => {
    key = makeSigningKeyTool()
    fullDid = await createFullDidFromSeed(paymentAccount, key.keypair)
  }, 50_000)

  it('simple batch succeeds despite failures of some extrinsics', async () => {
    const ctype = CType.fromSchema({
      title: UUID.generate(),
      properties: {},
      type: 'object',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
    })
    const ctypeStoreTx = await CType.getStoreTx(ctype)
    const rootNode = DelegationNode.newRoot({
      account: fullDid.uri,
      permissions: [Permission.DELEGATE],
      cTypeHash: ctype.hash,
    })
    const delegationStoreTx = await rootNode.getStoreTx()
    const delegationRevocationTx = await rootNode.getRevokeTx(fullDid.uri)
    const tx = await Did.authorizeBatch({
      batchFunction: api.tx.utility.batch,
      did: fullDid,
      extrinsics: [
        ctypeStoreTx,
        // Will fail since the delegation cannot be revoked before it is added
        delegationRevocationTx,
        delegationStoreTx,
      ],
      sign: key.sign,
      submitter: paymentAccount.address,
    })

    // The entire submission promise is resolves and does not throw
    await submitExtrinsic(tx, paymentAccount)

    // The ctype has been created, even though the delegation operations failed.
    expect(await CType.verifyStored(ctype)).toBe(true)
  })

  it('batchAll fails if any extrinsics fail', async () => {
    const ctype = CType.fromSchema({
      title: UUID.generate(),
      properties: {},
      type: 'object',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
    })
    const ctypeStoreTx = await CType.getStoreTx(ctype)
    const rootNode = DelegationNode.newRoot({
      account: fullDid.uri,
      permissions: [Permission.DELEGATE],
      cTypeHash: ctype.hash,
    })
    const delegationStoreTx = await rootNode.getStoreTx()
    const delegationRevocationTx = await rootNode.getRevokeTx(fullDid.uri)
    const tx = await Did.authorizeBatch({
      batchFunction: api.tx.utility.batchAll,
      did: fullDid,
      extrinsics: [
        ctypeStoreTx,
        // Will fail since the delegation cannot be revoked before it is added
        delegationRevocationTx,
        delegationStoreTx,
      ],
      sign: key.sign,
      submitter: paymentAccount.address,
    })

    // The entire submission promise is rejected and throws.
    await expect(submitExtrinsic(tx, paymentAccount)).rejects.toMatchObject({
      section: 'delegation',
      name: 'DelegationNotFound',
    })

    // The ctype has not been created, since atomicity ensures the whole batch is reverted in case of failure.
    expect(await CType.verifyStored(ctype)).toBe(false)
  })

  it('can batch extrinsics for the same required key type', async () => {
    const web3NameClaimTx = await api.tx.web3Names.claim('test-1')
    const authorizedTx = await Did.authorizeExtrinsic(
      fullDid,
      web3NameClaimTx,
      key.sign,
      paymentAccount.address
    )
    await submitExtrinsic(authorizedTx, paymentAccount)

    const web3Name1ReleaseExt = await api.tx.web3Names.releaseByOwner()
    const web3Name2ClaimExt = await api.tx.web3Names.claim('test-2')
    const tx = await Did.authorizeBatch({
      batchFunction: api.tx.utility.batch,
      did: fullDid,
      extrinsics: [web3Name1ReleaseExt, web3Name2ClaimExt],
      sign: key.sign,
      submitter: paymentAccount.address,
    })
    await submitExtrinsic(tx, paymentAccount)

    // Test for correct creation and deletion
    const encoded1 = await api.query.web3Names.owner('test-1')
    expect(encoded1.isSome).toBe(false)
    // Test for correct creation of second web3 name
    const encoded2 = await api.query.web3Names.owner('test-2')
    expect(Web3Names.decodeWeb3NameOwner(encoded2).owner).toStrictEqual(
      fullDid.uri
    )
  }, 30_000)

  it('can batch extrinsics for different required key types', async () => {
    // Authentication key
    const web3NameReleaseExt = await api.tx.web3Names.releaseByOwner()
    // Attestation key
    const ctype1 = CType.fromSchema({
      title: UUID.generate(),
      properties: {},
      type: 'object',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
    })
    const ctype1Creation = await CType.getStoreTx(ctype1)
    // Delegation key
    const rootNode = DelegationNode.newRoot({
      account: fullDid.uri,
      permissions: [Permission.DELEGATE],
      cTypeHash: ctype1.hash,
    })
    const delegationHierarchyCreation = await rootNode.getStoreTx()

    // Authentication key
    const web3NameNewClaimExt = await api.tx.web3Names.claim('test-2')
    // Attestation key
    const ctype2 = CType.fromSchema({
      title: UUID.generate(),
      properties: {},
      type: 'object',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
    })
    const ctype2Creation = await CType.getStoreTx(ctype2)
    // Delegation key
    const delegationHierarchyRemoval = await rootNode.getRevokeTx(fullDid.uri)

    const batchedExtrinsics = await Did.authorizeBatch({
      batchFunction: api.tx.utility.batchAll,
      did: fullDid,
      extrinsics: [
        web3NameReleaseExt,
        ctype1Creation,
        delegationHierarchyCreation,
        web3NameNewClaimExt,
        ctype2Creation,
        delegationHierarchyRemoval,
      ],
      sign: key.sign,
      submitter: paymentAccount.address,
    })

    await submitExtrinsic(batchedExtrinsics, paymentAccount)

    // Test correct use of authentication keys
    const encoded = await api.query.web3Names.owner('test')
    expect(encoded.isSome).toBe(false)

    const { owner } = Web3Names.decodeWeb3NameOwner(
      await api.query.web3Names.owner('test-2')
    )
    expect(owner).toStrictEqual(fullDid.uri)

    // Test correct use of attestation keys
    expect(await CType.verifyStored(ctype1)).toBe(true)
    expect(await CType.verifyStored(ctype2)).toBe(true)

    // Test correct use of delegation keys
    const node = await DelegationNode.query(rootNode.id)
    expect(node?.revoked).toBe(true)
  })
})

describe('Runtime constraints', () => {
  let testAuthKey: NewDidVerificationKey
  const { keypair, sign } = makeSigningKeyTool('ed25519')

  beforeAll(async () => {
    testAuthKey = {
      publicKey: keypair.publicKey,
      type: 'ed25519',
    }
  })
  describe('DID creation', () => {
    it('should not be possible to create a DID with too many encryption keys', async () => {
      // Maximum is 10
      const newKeyAgreementKeys = Array(10).map(
        (_, index): NewDidEncryptionKey => ({
          publicKey: Uint8Array.from(new Array(32).fill(index)),
          type: 'x25519',
        })
      )
      await Did.Chain.getStoreTx(
        {
          authentication: [testAuthKey],
          keyAgreement: newKeyAgreementKeys,
        },
        paymentAccount.address,
        sign
      )
      // One more than the maximum
      newKeyAgreementKeys.push({
        publicKey: Uint8Array.from(new Array(32).fill(100)),
        type: 'x25519',
      })
      await expect(
        Did.Chain.getStoreTx(
          {
            authentication: [testAuthKey],
            keyAgreement: newKeyAgreementKeys,
          },

          paymentAccount.address,
          sign
        )
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"The number of key agreement keys in the creation operation is greater than the maximum allowed, which is 10"`
      )
    }, 30_000)

    it('should not be possible to create a DID with too many service endpoints', async () => {
      // Maximum is 25
      const newServiceEndpoints = Array(25).map(
        (_, index): DidServiceEndpoint => ({
          id: `#service-${index}`,
          type: [`type-${index}`],
          serviceEndpoint: [`x:url-${index}`],
        })
      )
      await Did.Chain.getStoreTx(
        {
          authentication: [testAuthKey],
          service: newServiceEndpoints,
        },
        paymentAccount.address,
        sign
      )
      // One more than the maximum
      newServiceEndpoints.push({
        id: '#service-100',
        type: ['type-100'],
        serviceEndpoint: ['x:url-100'],
      })
      await expect(
        Did.Chain.getStoreTx(
          {
            authentication: [testAuthKey],
            service: newServiceEndpoints,
          },

          paymentAccount.address,
          sign
        )
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Cannot store more than 25 service endpoints per DID"`
      )
    }, 30_000)

    it('should not be possible to create a DID with a service endpoint that is too long', async () => {
      await Did.Chain.getStoreTx(
        {
          authentication: [testAuthKey],
          service: [
            {
              // Maximum is 50
              id: '#aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
              type: ['type-a'],
              serviceEndpoint: ['x:url-a'],
            },
          ],
        },
        paymentAccount.address,
        sign
      )
      await expect(
        Did.Chain.getStoreTx(
          {
            authentication: [testAuthKey],
            service: [
              {
                // One more than the maximum
                id: '#aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
                type: ['type-a'],
                serviceEndpoint: ['x:url-a'],
              },
            ],
          },

          paymentAccount.address,
          sign
        )
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"The service ID \\"#aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\\" is too long (51 bytes). Max number of bytes allowed for a service ID is 50."`
      )
    }, 30_000)

    it('should not be possible to create a DID with a service endpoint that has too many types', async () => {
      const newEndpoint: DidServiceEndpoint = {
        id: '#id-1',
        // Maximum is 1
        type: Array(1).map((_, index): string => `type-${index}`),
        serviceEndpoint: ['x:url-1'],
      }
      await Did.Chain.getStoreTx(
        {
          authentication: [testAuthKey],
          service: [newEndpoint],
        },
        paymentAccount.address,
        sign
      )
      // One more than the maximum
      newEndpoint.type.push('new-type')
      await expect(
        Did.Chain.getStoreTx(
          {
            authentication: [testAuthKey],
            service: [newEndpoint],
          },
          paymentAccount.address,
          sign
        )
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"The service with ID \\"#id-1\\" has too many types (2). Max number of types allowed per service is 1."`
      )
    }, 30_000)

    it('should not be possible to create a DID with a service endpoint that has too many URIs', async () => {
      const newEndpoint: DidServiceEndpoint = {
        id: '#id-1',
        // Maximum is 1
        type: ['type-1'],
        serviceEndpoint: Array(1).map((_, index): string => `x:url-${index}`),
      }
      await Did.Chain.getStoreTx(
        {
          authentication: [testAuthKey],
          service: [newEndpoint],
        },
        paymentAccount.address,
        sign
      )
      // One more than the maximum
      newEndpoint.serviceEndpoint.push('x:new-url')
      await expect(
        Did.Chain.getStoreTx(
          {
            authentication: [testAuthKey],
            service: [newEndpoint],
          },

          paymentAccount.address,
          sign
        )
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"The service with ID \\"#id-1\\" has too many URIs (2). Max number of URIs allowed per service is 1."`
      )
    }, 30_000)

    it('should not be possible to create a DID with a service endpoint that has a type that is too long', async () => {
      await Did.Chain.getStoreTx(
        {
          authentication: [testAuthKey],
          service: [
            {
              id: '#id-1',
              // Maximum is 50
              type: ['aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'],
              serviceEndpoint: ['x:url-1'],
            },
          ],
        },
        paymentAccount.address,
        sign
      )
      await expect(
        Did.Chain.getStoreTx(
          {
            authentication: [testAuthKey],
            service: [
              {
                id: '#id-1',
                // One more than the maximum
                type: ['aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'],
                serviceEndpoint: ['x:url-1'],
              },
            ],
          },

          paymentAccount.address,
          sign
        )
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"The service with ID \\"#id-1\\" has the type \\"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\\" that is too long (51 bytes). Max number of bytes allowed for a service type is 50."`
      )
    }, 30_000)

    it('should not be possible to create a DID with a service endpoint that has a URI that is too long', async () => {
      await Did.Chain.getStoreTx(
        {
          authentication: [testAuthKey],
          service: [
            {
              id: '#id-1',
              type: ['type-1'],
              // Maximum is 200
              serviceEndpoint: [
                'a:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
              ],
            },
          ],
        },
        paymentAccount.address,
        sign
      )
      await expect(
        Did.Chain.getStoreTx(
          {
            authentication: [testAuthKey],
            service: [
              {
                id: '#id-1',
                type: ['type-1'],
                // One more than the maximum
                serviceEndpoint: [
                  'a:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
                ],
              },
            ],
          },

          paymentAccount.address,
          sign
        )
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"The service with ID \\"#id-1\\" has the URI \\"a:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\\" that is too long (202 bytes). Max number of bytes allowed for a service URI is 200."`
      )
    }, 30_000)
  })

  describe('Service endpoint addition', () => {
    it('should not be possible to add a service endpoint that is too long', async () => {
      await Did.Chain.getAddEndpointExtrinsic({
        // Maximum is 50
        id: '#aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        type: ['type-a'],
        serviceEndpoint: ['x:url-a'],
      })
      await expect(
        Did.Chain.getAddEndpointExtrinsic({
          // One more than maximum
          id: '#aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          type: ['type-a'],
          serviceEndpoint: ['x:url-a'],
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"The service ID \\"#aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\\" is too long (51 bytes). Max number of bytes allowed for a service ID is 50."`
      )
    }, 30_000)

    it('should not be possible to add a service endpoint that has too many types', async () => {
      const newEndpoint: DidServiceEndpoint = {
        id: '#id-1',
        // Maximum is 1
        type: Array(1).map((_, index): string => `type-${index}`),
        serviceEndpoint: ['x:url-1'],
      }
      await Did.Chain.getAddEndpointExtrinsic(newEndpoint)
      // One more than the maximum
      newEndpoint.type.push('new-type')
      await expect(
        Did.Chain.getAddEndpointExtrinsic(newEndpoint)
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"The service with ID \\"#id-1\\" has too many types (2). Max number of types allowed per service is 1."`
      )
    }, 30_000)

    it('should not be possible to add a service endpoint that has too many URIs', async () => {
      const newEndpoint: DidServiceEndpoint = {
        id: '#id-1',
        // Maximum is 1
        type: ['type-1'],
        serviceEndpoint: Array(1).map((_, index): string => `x:url-${index}`),
      }
      await Did.Chain.getAddEndpointExtrinsic(newEndpoint)
      // One more than the maximum
      newEndpoint.serviceEndpoint.push('x:new-url')
      await expect(
        Did.Chain.getAddEndpointExtrinsic(newEndpoint)
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"The service with ID \\"#id-1\\" has too many URIs (2). Max number of URIs allowed per service is 1."`
      )
    }, 30_000)

    it('should not be possible to add a service endpoint that has a type that is too long', async () => {
      await Did.Chain.getAddEndpointExtrinsic({
        id: '#id-1',
        // Maximum is 50
        type: ['aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'],
        serviceEndpoint: ['x:url-1'],
      })
      await expect(
        Did.Chain.getAddEndpointExtrinsic({
          id: '#id-1',
          // One more than the maximum
          type: ['aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'],
          serviceEndpoint: ['x:url-1'],
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"The service with ID \\"#id-1\\" has the type \\"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\\" that is too long (51 bytes). Max number of bytes allowed for a service type is 50."`
      )
    }, 30_000)

    it('should not be possible to add a service endpoint that has a URI that is too long', async () => {
      await Did.Chain.getAddEndpointExtrinsic({
        id: '#id-1',
        type: ['type-1'],
        // Maximum is 200
        serviceEndpoint: [
          'a:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        ],
      })
      await expect(
        Did.Chain.getAddEndpointExtrinsic({
          id: '#id-1',
          type: ['type-1'],
          // One more than the maximum
          serviceEndpoint: [
            'a:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          ],
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"The service with ID \\"#id-1\\" has the URI \\"a:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\\" that is too long (201 bytes). Max number of bytes allowed for a service URI is 200."`
      )
    }, 30_000)
  })
})

afterAll(async () => {
  await disconnect()
})
