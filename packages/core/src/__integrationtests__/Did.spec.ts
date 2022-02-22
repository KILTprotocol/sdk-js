/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group integration/did
 */

import { BN } from '@polkadot/util'
import {
  DemoKeystore,
  DidChain,
  SigningAlgorithms,
  LightDidDetails,
  FullDidDetails,
  DidDetails,
  EncryptionAlgorithms,
  resolveDoc,
  DemoKeystoreUtils,
} from '@kiltprotocol/did'
import { BlockchainApiConnection } from '@kiltprotocol/chain-helpers'
import {
  DidResolvedDetails,
  DidServiceEndpoint,
  KeyRelationship,
  KeyringPair,
  KeystoreSigner,
} from '@kiltprotocol/types'
import { UUID } from '@kiltprotocol/utils'

import * as CType from '../ctype'
import { disconnect } from '../kilt'
import {
  createEndowedTestAccount,
  devBob,
  initializeApi,
  submitExtrinsicWithResign,
  addressFromRandom,
  getDefaultMigrationHandler,
} from './utils'

let paymentAccount: KeyringPair
const keystore = new DemoKeystore()

beforeAll(async () => {
  await initializeApi()
  paymentAccount = await createEndowedTestAccount()
})

it('fetches the correct deposit amount', async () => {
  const depositAmount = await DidChain.queryDepositAmount()
  expect(depositAmount.toString()).toStrictEqual(
    new BN(2000000000000000).toString()
  )
})

describe('write and didDeleteTx', () => {
  let details: DidDetails
  beforeAll(async () => {
    details = await DemoKeystoreUtils.createMinimalLightDidFromSeed(keystore)
  })

  it('fails to create a new DID on chain with a different submitter than the one in the creation operation', async () => {
    const otherAccount = devBob
    const tx = await DidChain.generateCreateTxFromDidDetails(
      details,
      otherAccount.address,
      {
        alg: details.authenticationKey.type,
        signer: keystore as KeystoreSigner<string>,
        signingPublicKey: details.authenticationKey.publicKey,
      }
    )

    await expect(
      submitExtrinsicWithResign(tx, paymentAccount)
    ).rejects.toMatchObject({ isBadOrigin: true })
  }, 60_000)

  it('writes a new DID record to chain', async () => {
    const newDetails = LightDidDetails.fromDetails({
      authenticationKey: details.authenticationKey,
      serviceEndpoints: [
        {
          id: 'test-id-1',
          types: ['test-type-1'],
          urls: ['test-url-1'],
        },
        {
          id: 'test-id-2',
          types: ['test-type-2'],
          urls: ['test-url-2'],
        },
      ],
    })

    const tx = await DidChain.generateCreateTxFromDidDetails(
      newDetails,
      paymentAccount.address,
      {
        alg: newDetails.authenticationKey.type,
        signer: keystore as KeystoreSigner<string>,
        signingPublicKey: newDetails.authenticationKey.publicKey,
      }
    )

    await expect(
      submitExtrinsicWithResign(tx, paymentAccount)
    ).resolves.not.toThrow()

    details = (await FullDidDetails.fromChainInfo(
      newDetails.identifier
    )) as FullDidDetails

    // details and newDetails have the same identifier as the former is a resolved version of the latter.
    expect(details.identifier === newDetails.identifier)
    // The ID changes as on chain is the has of the public key, so we can't compare for key ID equality.
    expect(
      details?.authenticationKey.publicKey ===
        newDetails.authenticationKey.publicKey
    )
    expect(
      details?.authenticationKey.type === newDetails.authenticationKey.type
    )

    expect(details?.encryptionKey).toBeUndefined()
    expect(details?.attestationKey).toBeUndefined()
    expect(details?.delegationKey).toBeUndefined()

    expect(details?.getEndpoints()).toStrictEqual<DidServiceEndpoint[]>([
      {
        id: 'test-id-1',
        types: ['test-type-1'],
        urls: ['test-url-1'],
      },
      {
        id: 'test-id-2',
        types: ['test-type-2'],
        urls: ['test-url-2'],
      },
    ])

    const emptyAccount = addressFromRandom()

    // Should be defined and have 0 elements
    await expect(
      DidChain.queryServiceEndpoints(emptyAccount)
    ).resolves.toBeDefined()
    await expect(
      DidChain.queryServiceEndpoints(emptyAccount)
    ).resolves.toHaveLength(0)
    // Should return null
    await expect(
      DidChain.queryServiceEndpoint(emptyAccount, 'non-existing-service-id')
    ).resolves.toBeNull()
    // Should return 0
    const endpointsCount = await DidChain.queryEndpointsCounts(emptyAccount)
    expect(endpointsCount.toString()).toStrictEqual(new BN(0).toString())
  }, 60_000)

  it('fails to delete the DID using a different submitter than the one specified in the DID operation or using a services count that is too low', async () => {
    const otherAccount = devBob

    // 10 is an example value. It is not used here since we are testing another error
    let call = await DidChain.getDeleteDidExtrinsic(new BN(10))

    let submittable = await (details as FullDidDetails).authorizeExtrinsic(
      call,
      keystore,
      // Use a different account than the submitter one
      otherAccount.address
    )

    await expect(
      submitExtrinsicWithResign(submittable, paymentAccount)
    ).rejects.toMatchObject({ section: 'did', name: 'BadDidOrigin' })

    // We use 1 here and this should fail as there are two service endpoints stored.
    call = await DidChain.getDeleteDidExtrinsic(new BN(1))

    submittable = await (details as FullDidDetails).authorizeExtrinsic(
      call,
      keystore,
      paymentAccount.address
    )

    // Will fail because count provided is too low
    await expect(
      submitExtrinsicWithResign(submittable, paymentAccount)
    ).rejects.toMatchObject({
      section: 'did',
      name: 'StoredEndpointsCountTooLarge',
    })
  }, 60_000)

  it('deletes DID from previous step', async () => {
    // We verify that the DID to delete is on chain.
    await expect(
      DidChain.queryDetails(details.identifier)
    ).resolves.not.toBeNull()

    const storedEndpointsCount = await DidChain.queryEndpointsCounts(
      details.identifier
    )
    const call = await DidChain.getDeleteDidExtrinsic(storedEndpointsCount)

    const submittable = await (details as FullDidDetails).authorizeExtrinsic(
      call,
      keystore,
      paymentAccount.address
    )

    // Check that DID is not blacklisted.
    await expect(DidChain.queryDeletedDidIdentifiers()).resolves.not.toContain(
      details.identifier
    )
    await expect(
      DidChain.queryDidDeletionStatus(details.identifier)
    ).resolves.toBeFalsy()

    await expect(
      submitExtrinsicWithResign(submittable, paymentAccount)
    ).resolves.not.toThrow()

    await expect(DidChain.queryDetails(details.identifier)).resolves.toBeNull()

    // Check that DID is now blacklisted.
    await expect(DidChain.queryDeletedDidIdentifiers()).resolves.toContain(
      details.identifier
    )
    await expect(
      DidChain.queryDidDeletionStatus(details.identifier)
    ).resolves.toBeTruthy()
  }, 60_000)
})

it('creates and updates DID, and then reclaims the deposit back', async () => {
  const { publicKey, alg } = await keystore.generateKeypair({
    alg: SigningAlgorithms.Ed25519,
  })
  const newDetails = LightDidDetails.fromDetails({
    authenticationKey: {
      publicKey,
      type: alg,
    },
  })

  const tx = await DidChain.generateCreateTxFromDidDetails(
    newDetails,
    paymentAccount.address,
    {
      alg: newDetails.authenticationKey.type,
      signer: keystore as KeystoreSigner<string>,
      signingPublicKey: newDetails.authenticationKey.publicKey,
    }
  )

  await expect(
    submitExtrinsicWithResign(tx, paymentAccount)
  ).resolves.not.toThrow()

  // This will better be handled once we have the UpdateBuilder class, which encapsulates all the logic.
  let fullDetails = (await FullDidDetails.fromChainInfo(
    newDetails.identifier
  )) as FullDidDetails

  const newKeypair = await keystore.generateKeypair({
    alg: SigningAlgorithms.Sr25519,
  })
  const newKeyDetails: DidChain.NewDidKey = {
    publicKey: newKeypair.publicKey,
    type: newKeypair.alg,
  }

  const updateAuthenticationKeyCall = await DidChain.getSetKeyExtrinsic(
    KeyRelationship.authentication,
    newKeyDetails
  )
  const tx2 = await fullDetails.authorizeExtrinsic(
    updateAuthenticationKeyCall,
    keystore,
    paymentAccount.address
  )
  await expect(
    submitExtrinsicWithResign(tx2, paymentAccount)
  ).resolves.not.toThrow()

  // Authentication key changed, so details must be updated.
  // Also this will better be handled once we have the UpdateBuilder class, which encapsulates all the logic.
  fullDetails = (await FullDidDetails.fromChainInfo(
    fullDetails.identifier
  )) as FullDidDetails

  // Add a new service endpoint
  const newEndpoint: DidServiceEndpoint = {
    id: 'new-endpoint',
    types: ['new-type'],
    urls: ['new-url'],
  }
  const updateEndpointCall = await DidChain.getAddEndpointExtrinsic(newEndpoint)

  const tx3 = await fullDetails.authorizeExtrinsic(
    updateEndpointCall,
    keystore,
    paymentAccount.address
  )
  await expect(
    submitExtrinsicWithResign(tx3, paymentAccount)
  ).resolves.not.toThrow()
  await expect(
    DidChain.queryServiceEndpoint(fullDetails.identifier, newEndpoint.id)
  ).resolves.toStrictEqual(newEndpoint)

  // Delete the added service endpoint
  const removeEndpointCall = await DidChain.getRemoveEndpointExtrinsic(
    newEndpoint.id
  )
  const tx4 = await fullDetails.authorizeExtrinsic(
    removeEndpointCall,
    keystore,
    paymentAccount.address
  )
  await expect(
    submitExtrinsicWithResign(tx4, paymentAccount)
  ).resolves.not.toThrow()

  // There should not be any endpoint with the given ID now.
  await expect(
    DidChain.queryServiceEndpoint(fullDetails.identifier, newEndpoint.id)
  ).resolves.toBeNull()

  // Claim the deposit back
  const storedEndpointsCount = await DidChain.queryEndpointsCounts(
    fullDetails.identifier
  )
  const reclaimDepositTx = await DidChain.getReclaimDepositExtrinsic(
    fullDetails.identifier,
    storedEndpointsCount
  )
  await expect(
    submitExtrinsicWithResign(reclaimDepositTx, paymentAccount)
  ).resolves.not.toThrow()
  // Verify that the DID has been deleted
  await expect(
    DidChain.queryDetails(fullDetails.identifier)
  ).resolves.toBeNull()
  await expect(
    DidChain.queryServiceEndpoints(fullDetails.identifier)
  ).resolves.toHaveLength(0)
  const newEndpointsCount = await DidChain.queryEndpointsCounts(
    fullDetails.identifier
  )
  expect(newEndpointsCount.toString()).toStrictEqual(new BN(0).toString())
}, 80_000)

describe('DID migration', () => {
  it('migrates light DID with ed25519 auth key and encryption key', async () => {
    const didEd25519AuthenticationKeyDetails = await keystore.generateKeypair({
      alg: SigningAlgorithms.Ed25519,
    })
    const didEncryptionKeyDetails = await keystore.generateKeypair({
      seed: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      alg: EncryptionAlgorithms.NaclBox,
    })
    const lightDidDetails = LightDidDetails.fromDetails({
      authenticationKey: {
        publicKey: didEd25519AuthenticationKeyDetails.publicKey,
        type: DemoKeystore.getKeypairTypeForAlg(
          didEd25519AuthenticationKeyDetails.alg
        ),
      },
      encryptionKey: {
        publicKey: didEncryptionKeyDetails.publicKey,
        type: DemoKeystore.getKeypairTypeForAlg(didEncryptionKeyDetails.alg),
      },
    })

    const migratedFullDid = await lightDidDetails.migrate(
      paymentAccount.address,
      keystore,
      getDefaultMigrationHandler(paymentAccount)
    )

    // The key id for the authentication and encryption keys are overwritten when a light
    // DID is migrated, so we only need to check that the public key value is the same.
    // We  use a set because keys might be returned in a different order.
    const migratedDidKeys = new Set(
      migratedFullDid.getKeys().map((k) => k.publicKey)
    )
    const lightDidKeys = new Set(
      lightDidDetails.getKeys().map((k) => k.publicKey)
    )
    expect(migratedDidKeys).toStrictEqual(lightDidKeys)
    // The same thing does NOT apply to service endpoints, so here we can simply check for
    // equality.
    expect(migratedFullDid.getEndpoints()).toStrictEqual(
      lightDidDetails.getEndpoints()
    )
    // The main identifier should be left untouched
    expect(migratedFullDid.identifier).toStrictEqual(lightDidDetails.identifier)

    await expect(
      DidChain.queryDetails(migratedFullDid.identifier)
    ).resolves.not.toBeNull()

    const { metadata } = (await resolveDoc(
      lightDidDetails.did
    )) as DidResolvedDetails

    expect(metadata.canonicalId).toStrictEqual(migratedFullDid.did)
    expect(metadata.deactivated).toBeFalsy()
  })

  it('migrates light DID with sr25519 auth key', async () => {
    const didSr25519AuthenticationKeyDetails = await keystore.generateKeypair({
      alg: SigningAlgorithms.Sr25519,
    })
    const lightDidDetails = LightDidDetails.fromDetails({
      authenticationKey: {
        publicKey: didSr25519AuthenticationKeyDetails.publicKey,
        type: DemoKeystore.getKeypairTypeForAlg(
          didSr25519AuthenticationKeyDetails.alg
        ),
      },
    })

    const migratedFullDid = await lightDidDetails.migrate(
      paymentAccount.address,
      keystore,
      getDefaultMigrationHandler(paymentAccount)
    )

    // The key id for the authentication and encryption keys are overwritten when a light
    // DID is migrated, so we only need to check that the public key value is the same.
    // We  use a set because keys might be returned in a different order.
    const migratedDidKeys = new Set(
      migratedFullDid.getKeys().map((k) => k.publicKey)
    )
    const lightDidKeys = new Set(
      lightDidDetails.getKeys().map((k) => k.publicKey)
    )
    expect(migratedDidKeys).toStrictEqual(lightDidKeys)
    // The same thing does NOT apply to service endpoints, so here we can simply check for
    // equality.
    expect(migratedFullDid.getEndpoints()).toStrictEqual(
      lightDidDetails.getEndpoints()
    )
    // The main identifier should be left untouched
    expect(migratedFullDid.identifier).toStrictEqual(lightDidDetails.identifier)

    await expect(
      DidChain.queryDetails(migratedFullDid.identifier)
    ).resolves.not.toBeNull()

    const { metadata } = (await resolveDoc(
      lightDidDetails.did
    )) as DidResolvedDetails

    expect(metadata.canonicalId).toStrictEqual(migratedFullDid.did)
    expect(metadata.deactivated).toBeFalsy()
  })

  it('migrates light DID with ed25519 auth key, encryption key, and service endpoints', async () => {
    const didEd25519AuthenticationKeyDetails = await keystore.generateKeypair({
      alg: SigningAlgorithms.Ed25519,
    })
    const didEncryptionKeyDetails = await keystore.generateKeypair({
      seed: '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
      alg: EncryptionAlgorithms.NaclBox,
    })
    const serviceEndpoints: DidServiceEndpoint[] = [
      {
        id: 'id-1',
        types: ['type-1'],
        urls: ['url-1'],
      },
    ]
    const lightDidDetails = LightDidDetails.fromDetails({
      authenticationKey: {
        publicKey: didEd25519AuthenticationKeyDetails.publicKey,
        type: DemoKeystore.getKeypairTypeForAlg(
          didEd25519AuthenticationKeyDetails.alg
        ),
      },
      encryptionKey: {
        publicKey: didEncryptionKeyDetails.publicKey,
        type: DemoKeystore.getKeypairTypeForAlg(didEncryptionKeyDetails.alg),
      },
      serviceEndpoints,
    })

    const migratedFullDid = await lightDidDetails.migrate(
      paymentAccount.address,
      keystore,
      getDefaultMigrationHandler(paymentAccount)
    )

    // The key id for the authentication and encryption keys are overwritten when a light
    // DID is migrated, so we only need to check that the public key value is the same.
    // We  use a set because keys might be returned in a different order.
    const migratedDidKeys = new Set(
      migratedFullDid.getKeys().map((k) => k.publicKey)
    )
    const lightDidKeys = new Set(
      lightDidDetails.getKeys().map((k) => k.publicKey)
    )
    expect(migratedDidKeys).toStrictEqual(lightDidKeys)
    // The same thing does NOT apply to service endpoints, so here we can simply check for
    // equality.
    expect(migratedFullDid.getEndpoints()).toStrictEqual(
      lightDidDetails.getEndpoints()
    )
    // The main identifier should be left untouched
    expect(migratedFullDid.identifier).toStrictEqual(lightDidDetails.identifier)

    await expect(
      DidChain.queryDetails(migratedFullDid.identifier)
    ).resolves.not.toBeNull()

    const { metadata } = (await resolveDoc(
      lightDidDetails.did
    )) as DidResolvedDetails

    expect(metadata.canonicalId).toStrictEqual(migratedFullDid.did)
    expect(metadata.deactivated).toBeFalsy()

    // Remove and claim the deposit back
    const storedEndpointsCount = await DidChain.queryEndpointsCounts(
      migratedFullDid.identifier
    )
    const reclaimDepositTx = await DidChain.getReclaimDepositExtrinsic(
      migratedFullDid.identifier,
      storedEndpointsCount
    )
    await expect(
      submitExtrinsicWithResign(reclaimDepositTx, paymentAccount)
    ).resolves.not.toThrow()

    await expect(
      DidChain.queryDetails(migratedFullDid.identifier)
    ).resolves.toBeNull()
    await expect(
      DidChain.queryServiceEndpoints(migratedFullDid.identifier)
    ).resolves.toStrictEqual([])
    await expect(
      DidChain.queryDidDeletionStatus(migratedFullDid.identifier)
    ).resolves.toBeTruthy()
  }, 60_000)
})

describe('DID authorization', () => {
  // Light DIDs cannot authorise extrinsics
  let didDetails: FullDidDetails

  beforeAll(async () => {
    const newKey: DidChain.NewDidKey = await keystore
      .generateKeypair({
        alg: SigningAlgorithms.Ed25519,
      })
      .then(({ publicKey, alg }) => {
        return {
          publicKey,
          type: alg,
        }
      })

    const lightDidDetails = LightDidDetails.fromDetails({
      authenticationKey: newKey,
    })
    const fullDidDetails = await lightDidDetails.migrate(
      paymentAccount.address,
      keystore,
      getDefaultMigrationHandler(paymentAccount)
    )

    // TODO: these steps can be combined in one operation once we have a builder.
    const newAssertionKeyExtrinsic = await DidChain.getSetKeyExtrinsic(
      KeyRelationship.assertionMethod,
      newKey
    )
    let signedExtrinsic = await fullDidDetails.authorizeExtrinsic(
      newAssertionKeyExtrinsic,
      keystore,
      paymentAccount.address
    )
    await expect(
      submitExtrinsicWithResign(signedExtrinsic, paymentAccount)
    ).resolves.not.toThrow()

    const newDelegationKeyExtrinsic = await DidChain.getSetKeyExtrinsic(
      KeyRelationship.capabilityDelegation,
      newKey
    )
    signedExtrinsic = await fullDidDetails.authorizeExtrinsic(
      newDelegationKeyExtrinsic,
      keystore,
      paymentAccount.address
    )
    await expect(
      submitExtrinsicWithResign(signedExtrinsic, paymentAccount)
    ).resolves.not.toThrow()

    didDetails = (await FullDidDetails.fromChainInfo(
      fullDidDetails.identifier
    )) as FullDidDetails
  }, 60_000)

  it('authorizes ctype creation with DID signature', async () => {
    const ctype = CType.fromSchema({
      title: UUID.generate(),
      properties: {},
      type: 'object',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
    })
    const call = await CType.store(ctype)
    const tx = await didDetails.authorizeExtrinsic(
      call,
      keystore,
      paymentAccount.address
    )
    await expect(
      submitExtrinsicWithResign(tx, paymentAccount)
    ).resolves.not.toThrow()

    await expect(CType.verifyStored(ctype)).resolves.toEqual(true)
  }, 60_000)

  it('authorizes batch with DID signature', async () => {
    const ctype1 = CType.fromSchema({
      title: UUID.generate(),
      properties: {},
      type: 'object',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
    })
    const ctype2 = CType.fromSchema({
      title: UUID.generate(),
      properties: {},
      type: 'object',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
    })
    const calls = await Promise.all([ctype1, ctype2].map((c) => CType.store(c)))
    const batch = await BlockchainApiConnection.getConnectionOrConnect().then(
      ({ api }) => api.tx.utility.batch(calls)
    )
    const tx = await didDetails.authorizeBatch(
      batch,
      keystore,
      paymentAccount.address,
      KeyRelationship.assertionMethod
    )
    await expect(
      submitExtrinsicWithResign(tx, paymentAccount)
    ).resolves.not.toThrow()

    await expect(CType.verifyStored(ctype1)).resolves.toEqual(true)
    await expect(CType.verifyStored(ctype2)).resolves.toEqual(true)
  }, 60_000)

  it('no longer authorizes ctype creation after DID deletion', async () => {
    const storedEndpointsCount = await DidChain.queryEndpointsCounts(
      didDetails.identifier
    )
    const deleteCall = await DidChain.getDeleteDidExtrinsic(
      storedEndpointsCount
    )
    const tx = await didDetails.authorizeExtrinsic(
      deleteCall,
      keystore,
      paymentAccount.address
    )
    await expect(
      submitExtrinsicWithResign(tx, paymentAccount)
    ).resolves.not.toThrow()

    const ctype = CType.fromSchema({
      title: UUID.generate(),
      properties: {},
      type: 'object',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
    })
    const call = await CType.store(ctype)
    const tx2 = await didDetails.authorizeExtrinsic(
      call,
      keystore,
      paymentAccount.address
    )
    await expect(
      submitExtrinsicWithResign(tx2, paymentAccount)
    ).rejects.toMatchObject({ section: 'did', name: 'DidNotPresent' })

    await expect(CType.verifyStored(ctype)).resolves.toEqual(false)
  }, 60_000)
})

afterAll(async () => disconnect())
