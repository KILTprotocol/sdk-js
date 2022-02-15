/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group integration/did
 */

import { ApiPromise } from '@polkadot/api'
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
  NewLightDidAuthenticationKey,
  LightDidSupportedVerificationKeyTypes,
  FullDidCreationBuilder,
  FullDidUpdateBuilder,
  Web3Names,
  DidBatchBuilder,
} from '@kiltprotocol/did'
import { BlockchainApiConnection } from '@kiltprotocol/chain-helpers'
import {
  DidResolvedDetails,
  DidServiceEndpoint,
  EncryptionKeyType,
  KeyRelationship,
  KeyringPair,
  NewDidKey,
  NewDidVerificationKey,
  Permission,
  VerificationKeyType,
} from '@kiltprotocol/types'
import { UUID } from '@kiltprotocol/utils'

import { CType } from '../ctype'
import { disconnect } from '../kilt'
import {
  createEndowedTestAccount,
  devBob,
  initializeApi,
  submitExtrinsicWithResign,
  addressFromRandom,
  getDefaultMigrationHandler,
  getDefaultConsumeHandler,
  createFullDidFromSeed,
} from './utils'
import { DelegationNode } from '../delegation'

let paymentAccount: KeyringPair
const keystore = new DemoKeystore()
let api: ApiPromise

beforeAll(async () => {
  await initializeApi()
  ;({ api } = await BlockchainApiConnection.getConnectionOrConnect())
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
      keystore
    )

    await expect(
      submitExtrinsicWithResign(tx, paymentAccount)
    ).rejects.toMatchObject({ isBadOrigin: true })
  }, 60_000)

  it('writes a new DID record to chain', async () => {
    const newDetails = LightDidDetails.fromDetails({
      authenticationKey:
        details.authenticationKey as NewLightDidAuthenticationKey,
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
      keystore
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
  const newDetails = await DemoKeystoreUtils.createMinimalLightDidFromSeed(
    keystore
  )

  const tx = await DidChain.generateCreateTxFromDidDetails(
    newDetails,
    paymentAccount.address,
    keystore
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
  const newKeyDetails: NewDidKey = {
    publicKey: newKeypair.publicKey,
    type: DemoKeystore.getKeyTypeForAlg(
      newKeypair.alg
    ) as LightDidSupportedVerificationKeyTypes,
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
        type: DemoKeystore.getKeyTypeForAlg(
          didEd25519AuthenticationKeyDetails.alg
        ) as LightDidSupportedVerificationKeyTypes,
      },
      encryptionKey: {
        publicKey: didEncryptionKeyDetails.publicKey,
        type: DemoKeystore.getKeyTypeForAlg(
          didEncryptionKeyDetails.alg
        ) as EncryptionKeyType,
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
        type: DemoKeystore.getKeyTypeForAlg(
          didSr25519AuthenticationKeyDetails.alg
        ) as LightDidSupportedVerificationKeyTypes,
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
        type: DemoKeystore.getKeyTypeForAlg(
          didEd25519AuthenticationKeyDetails.alg
        ) as LightDidSupportedVerificationKeyTypes,
      },
      encryptionKey: {
        publicKey: didEncryptionKeyDetails.publicKey,
        type: DemoKeystore.getKeyTypeForAlg(
          didEncryptionKeyDetails.alg
        ) as EncryptionKeyType,
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
    const newKey: NewLightDidAuthenticationKey = await keystore
      .generateKeypair({
        alg: SigningAlgorithms.Ed25519,
      })
      .then(({ publicKey, alg }) => {
        return {
          publicKey,
          type: DemoKeystore.getKeyTypeForAlg(
            alg
          ) as LightDidSupportedVerificationKeyTypes,
        }
      })

    const lightDidDetails = LightDidDetails.fromDetails({
      authenticationKey: newKey,
    })
    didDetails = await FullDidCreationBuilder.fromLightDidDetails(
      api,
      lightDidDetails
    )
      .setAttestationKey(newKey)
      .setDelegationKey(newKey)
      .consumeWithHandler(keystore, paymentAccount.address, async (tx) =>
        submitExtrinsicWithResign(tx, paymentAccount)
      )
  }, 60_000)

  it('authorizes ctype creation with DID signature', async () => {
    const ctype = CType.fromSchema({
      title: UUID.generate(),
      properties: {},
      type: 'object',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
    })
    const call = await ctype.store()
    const tx = await didDetails.authorizeExtrinsic(
      call,
      keystore,
      paymentAccount.address
    )
    await expect(
      submitExtrinsicWithResign(tx, paymentAccount)
    ).resolves.not.toThrow()

    await expect(ctype.verifyStored()).resolves.toEqual(true)
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
    const call = await ctype.store()
    const tx2 = await didDetails.authorizeExtrinsic(
      call,
      keystore,
      paymentAccount.address
    )
    await expect(
      submitExtrinsicWithResign(tx2, paymentAccount)
    ).rejects.toMatchObject({ section: 'did', name: 'DidNotPresent' })

    await expect(ctype.verifyStored()).resolves.toEqual(false)
  }, 60_000)
})

describe('DID management batching', () => {
  describe('FullDidCreationBuilder', () => {
    it('Build a complete full DID from a full light DID', async () => {
      const authKey = await keystore.generateKeypair({
        alg: SigningAlgorithms.Sr25519,
      })
      const lightDidDetails = LightDidDetails.fromDetails({
        authenticationKey: {
          publicKey: authKey.publicKey,
          type: VerificationKeyType.Sr25519,
        },
        encryptionKey: {
          publicKey: Uint8Array.from(Array(32).fill(1)),
          type: EncryptionKeyType.X25519,
        },
        serviceEndpoints: [
          {
            id: 'id-1',
            types: ['type-1'],
            urls: ['url-1'],
          },
        ],
      })
      const builder = FullDidCreationBuilder.fromLightDidDetails(
        api,
        lightDidDetails
      )
        .addEncryptionKey({
          publicKey: Uint8Array.from(Array(32).fill(2)),
          type: EncryptionKeyType.X25519,
        })
        .addEncryptionKey({
          publicKey: Uint8Array.from(Array(32).fill(3)),
          type: EncryptionKeyType.X25519,
        })
        .setAttestationKey({
          publicKey: Uint8Array.from(Array(32).fill(1)),
          type: VerificationKeyType.Sr25519,
        })
        .setDelegationKey({
          publicKey: Uint8Array.from(Array(33).fill(1)),
          type: VerificationKeyType.Ecdsa,
        })
        .addServiceEndpoint({
          id: 'id-2',
          types: ['type-2'],
          urls: ['url-2'],
        })
        .addServiceEndpoint({
          id: 'id-3',
          types: ['type-3'],
          urls: ['url-3'],
        })

      await expect(
        builder
          .consume(keystore, paymentAccount.address)
          .then((ext) => submitExtrinsicWithResign(ext, paymentAccount))
      ).resolves.not.toThrow()

      const fullDid = await FullDidDetails.fromChainInfo(
        lightDidDetails.identifier
      )

      expect(fullDid).not.toBeNull()

      const authenticationKeys = fullDid!.getKeys(
        KeyRelationship.authentication
      )
      expect(authenticationKeys).toMatchObject<NewDidVerificationKey[]>([
        {
          publicKey: authKey.publicKey,
          type: VerificationKeyType.Sr25519,
        },
      ])

      const encryptionKeys = fullDid!.getKeys(KeyRelationship.keyAgreement)
      expect(encryptionKeys).toHaveLength(3)

      const assertionKeys = fullDid!.getKeys(KeyRelationship.assertionMethod)
      expect(assertionKeys).toMatchObject<NewDidVerificationKey[]>([
        {
          publicKey: Uint8Array.from(Array(32).fill(1)),
          type: VerificationKeyType.Sr25519,
        },
      ])

      const delegationKeys = fullDid!.getKeys(
        KeyRelationship.capabilityDelegation
      )
      expect(delegationKeys).toMatchObject<NewDidVerificationKey[]>([
        {
          publicKey: Uint8Array.from(Array(33).fill(1)),
          type: VerificationKeyType.Ecdsa,
        },
      ])

      const serviceEndpoints = fullDid!.getEndpoints()
      expect(serviceEndpoints).toHaveLength(3)
      expect(serviceEndpoints).toMatchObject<DidServiceEndpoint[]>([
        {
          id: 'id-3',
          types: ['type-3'],
          urls: ['url-3'],
        },
        {
          id: 'id-1',
          types: ['type-1'],
          urls: ['url-1'],
        },
        {
          id: 'id-2',
          types: ['type-2'],
          urls: ['url-2'],
        },
      ])
    })
  })

  describe('FullDidUpdateBuilder', () => {
    it('Build from a complete full DID and remove everything but the authentication key', async () => {
      const authKey = await keystore.generateKeypair({
        alg: SigningAlgorithms.Sr25519,
      })
      const lightDidDetails = LightDidDetails.fromDetails({
        authenticationKey: {
          publicKey: authKey.publicKey,
          type: VerificationKeyType.Sr25519,
        },
      })
      const createBuilder = FullDidCreationBuilder.fromLightDidDetails(
        api,
        lightDidDetails
      )
        .addEncryptionKey({
          publicKey: Uint8Array.from(Array(32).fill(1)),
          type: EncryptionKeyType.X25519,
        })
        .addEncryptionKey({
          publicKey: Uint8Array.from(Array(32).fill(2)),
          type: EncryptionKeyType.X25519,
        })
        .setAttestationKey({
          publicKey: Uint8Array.from(Array(32).fill(1)),
          type: VerificationKeyType.Sr25519,
        })
        .setDelegationKey({
          publicKey: Uint8Array.from(Array(33).fill(1)),
          type: VerificationKeyType.Ecdsa,
        })
        .addServiceEndpoint({
          id: 'id-1',
          types: ['type-1'],
          urls: ['url-1'],
        })
        .addServiceEndpoint({
          id: 'id-2',
          types: ['type-2'],
          urls: ['url-2'],
        })

      const initialFullDid = await createBuilder.consumeWithHandler(
        keystore,
        paymentAccount.address,
        getDefaultConsumeHandler(paymentAccount)
      )

      const updateBuilder = FullDidUpdateBuilder.fromFullDidDetails(
        api,
        initialFullDid
      )
        .removeAllEncryptionKeys()
        .removeAttestationKey()
        .removeDelegationKey()
        .removeAllServiceEndpoints()

      await expect(
        updateBuilder
          .consume(keystore, paymentAccount.address)
          .then((ext) => submitExtrinsicWithResign(ext, paymentAccount))
      ).resolves.not.toThrow()

      const finalFullDid = await FullDidDetails.fromChainInfo(
        initialFullDid.identifier
      ).then((did) => did as FullDidDetails)

      expect(finalFullDid).not.toBeNull()

      expect(
        finalFullDid.authenticationKey
      ).toMatchObject<NewDidVerificationKey>({
        publicKey: authKey.publicKey,
        type: VerificationKeyType.Sr25519,
      })

      expect(finalFullDid.encryptionKey).toBeUndefined()
      expect(finalFullDid.attestationKey).toBeUndefined()
      expect(finalFullDid.delegationKey).toBeUndefined()
      expect(finalFullDid.getEndpoints()).toHaveLength(0)
    }, 40_000)

    it('Correctly handles rotation of the authentication key', async () => {
      const authKey = await keystore.generateKeypair({
        alg: SigningAlgorithms.Sr25519,
      })
      const newAuthKey = await keystore.generateKeypair({
        alg: SigningAlgorithms.Ed25519,
      })
      const createBuilder = new FullDidCreationBuilder(api, {
        authenticationKey: {
          publicKey: authKey.publicKey,
          type: VerificationKeyType.Sr25519,
        },
      })

      const initialFullDid = await createBuilder.consumeWithHandler(
        keystore,
        paymentAccount.address,
        getDefaultConsumeHandler(paymentAccount)
      )

      const updateBuilder = FullDidUpdateBuilder.fromFullDidDetails(
        api,
        initialFullDid
      )
        .addServiceEndpoint({ id: 'id-1', types: ['type-1'], urls: ['url-1'] })
        .setAuthenticationKey({
          publicKey: newAuthKey.publicKey,
          type: VerificationKeyType.Ed25519,
        })
        .addServiceEndpoint({ id: 'id-2', types: ['type-2'], urls: ['url-2'] })

      // Fails if an authentication key is set twice for the same builder
      const builderCopy = updateBuilder
      expect(() =>
        builderCopy.setAuthenticationKey({
          publicKey: authKey.publicKey,
          type: VerificationKeyType.Sr25519,
        })
      ).toThrow()

      await expect(
        updateBuilder
          .consume(keystore, paymentAccount.address)
          .then((ext) => submitExtrinsicWithResign(ext, paymentAccount))
      ).resolves.not.toThrow()

      const finalFullDid = await FullDidDetails.fromChainInfo(
        initialFullDid.identifier
      ).then((did) => did as FullDidDetails)

      expect(finalFullDid).not.toBeNull()

      expect(
        finalFullDid.authenticationKey
      ).toMatchObject<NewDidVerificationKey>({
        publicKey: newAuthKey.publicKey,
        type: VerificationKeyType.Ed25519,
      })

      expect(finalFullDid.encryptionKey).toBeUndefined()
      expect(finalFullDid.attestationKey).toBeUndefined()
      expect(finalFullDid.delegationKey).toBeUndefined()
      expect(finalFullDid.getEndpoints()).toHaveLength(2)
    }, 40_000)
  })
})

describe('DID extrinsics batching', () => {
  let fullDid: FullDidDetails

  beforeAll(async () => {
    fullDid = await createFullDidFromSeed(paymentAccount, keystore)
  }, 50_000)

  it('non-atomic batch succeeds despite failures of some extrinsics', async () => {
    const ctype = CType.fromSchema({
      title: UUID.generate(),
      properties: {},
      type: 'object',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
    })
    const ctypeCreationTx = await ctype.store()
    const rootNode = DelegationNode.newRoot({
      account: fullDid.did,
      permissions: [Permission.DELEGATE],
      cTypeHash: ctype.hash,
    })
    const delegationCreationTx = await rootNode.store()
    const delegationRevocationTx = await rootNode.revoke(fullDid.did)
    const tx = await new DidBatchBuilder(api, fullDid)
      .addMultipleExtrinsics([
        ctypeCreationTx,
        // Will fail since the delegation cannot be revoked before it is added
        delegationRevocationTx,
        delegationCreationTx,
      ])
      .consume(keystore, paymentAccount.address, { atomic: false })

    // The entire submission promise is resolves and does not throw
    await expect(
      submitExtrinsicWithResign(tx, paymentAccount)
    ).resolves.not.toThrow()

    // The ctype has been created, even though the delegation operations failed.
    await expect(ctype.verifyStored()).resolves.toBeTruthy()
  })

  it('atomic batch fails if any extrinsics fail', async () => {
    const ctype = CType.fromSchema({
      title: UUID.generate(),
      properties: {},
      type: 'object',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
    })
    const ctypeCreationTx = await ctype.store()
    const rootNode = DelegationNode.newRoot({
      account: fullDid.did,
      permissions: [Permission.DELEGATE],
      cTypeHash: ctype.hash,
    })
    const delegationCreationTx = await rootNode.store()
    const delegationRevocationTx = await rootNode.revoke(fullDid.did)
    const tx = await new DidBatchBuilder(api, fullDid)
      .addMultipleExtrinsics([
        ctypeCreationTx,
        // Will fail since the delegation cannot be revoked before it is added
        delegationRevocationTx,
        delegationCreationTx,
      ])
      .consume(keystore, paymentAccount.address, { atomic: true })

    // The entire submission promise is rejected and throws.
    await expect(
      submitExtrinsicWithResign(tx, paymentAccount)
    ).rejects.toMatchObject({
      section: 'delegation',
      name: 'DelegationNotFound',
    })

    // The ctype has not been created, since atomicity ensures the whole batch is reverted in case of failure.
    await expect(ctype.verifyStored()).resolves.toBeFalsy()
  })

  it('can batch extrinsics for the same required key type', async () => {
    const web3NameClaimTx = await Web3Names.getClaimTx('test')
    const authorisedTx = await fullDid.authorizeExtrinsic(
      web3NameClaimTx,
      keystore,
      paymentAccount.address
    )
    await submitExtrinsicWithResign(authorisedTx, paymentAccount)

    const web3Name1ClaimExt = await Web3Names.getClaimTx('random-name-1')
    const web3Name1ReleaseExt = await Web3Names.getReleaseByOwnerTx()
    const web3Name2ClaimExt = await Web3Names.getClaimTx('random-name-2')
    const tx = await new DidBatchBuilder(api, fullDid)
      .addMultipleExtrinsics([
        web3Name1ClaimExt,
        web3Name1ReleaseExt,
        web3Name2ClaimExt,
      ])
      .consume(keystore, paymentAccount.address)
    await expect(
      submitExtrinsicWithResign(tx, paymentAccount)
    ).resolves.not.toThrow()

    // Test for correct creation and deletion
    await expect(
      Web3Names.queryDidIdentifierForWeb3Name('random-name-1')
    ).resolves.toBeNull()
    // Test for correct creation of second web3 name
    await expect(
      Web3Names.queryDidIdentifierForWeb3Name('random-name-2')
    ).resolves.toStrictEqual(fullDid.identifier)
  })

  it('can batch extrinsics for different required key types', async () => {
    // Authentication key
    const web3NameReleaseExt = await Web3Names.getReleaseByOwnerTx()
    // Attestation key
    const ctype1 = CType.fromSchema({
      title: UUID.generate(),
      properties: {},
      type: 'object',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
    })
    const ctype1Creation = await ctype1.store()
    // Delegation key
    const rootNode = DelegationNode.newRoot({
      account: fullDid.did,
      permissions: [Permission.DELEGATE],
      cTypeHash: ctype1.hash,
    })
    const delegationHierarchyCreation = await rootNode.store()

    // Authentication key
    const web3NameNewClaimExt = await Web3Names.getClaimTx('test-2')
    // Attestation key
    const ctype2 = CType.fromSchema({
      title: UUID.generate(),
      properties: {},
      type: 'object',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
    })
    const ctype2Creation = await ctype2.store()
    // Delegation key
    const delegationHierarchyRemoval = await rootNode.revoke(fullDid.did)

    const builder = new DidBatchBuilder(api, fullDid)
      .addSingleExtrinsic(web3NameReleaseExt)
      .addSingleExtrinsic(ctype1Creation)
      .addSingleExtrinsic(delegationHierarchyCreation)
      .addSingleExtrinsic(web3NameNewClaimExt)
      .addSingleExtrinsic(ctype2Creation)
      .addSingleExtrinsic(delegationHierarchyRemoval)

    const batchedExtrinsics = await builder.consume(
      keystore,
      paymentAccount.address
    )

    await expect(
      submitExtrinsicWithResign(batchedExtrinsics, paymentAccount)
    ).resolves.not.toThrow()

    // Test correct use of authentication keys
    await expect(Web3Names.queryDidForWeb3Name('test')).resolves.toBeNull()
    await expect(
      Web3Names.queryDidIdentifierForWeb3Name('test-2')
    ).resolves.toStrictEqual(fullDid.identifier)

    // Test correct use of attestation keys
    await expect(ctype1.verifyStored()).resolves.toBeTruthy()
    await expect(ctype2.verifyStored()).resolves.toBeTruthy()

    // Test correct use of delegation keys
    await expect(
      DelegationNode.query(rootNode.id).then((node) => node?.revoked)
    ).resolves.toBeTruthy()

    // Cannot consume the builder again
    await expect(
      builder.consume(keystore, paymentAccount.address)
    ).rejects.toThrow()
  })
})

afterAll(async () => disconnect())
