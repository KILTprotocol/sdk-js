/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group integration/did
 */

import { ApiPromise } from '@polkadot/api'
import { BN } from '@polkadot/util'
import { blake2AsU8a, encodeAddress } from '@polkadot/util-crypto'

import {
  DemoKeystore,
  Chain as DidChain,
  SigningAlgorithms,
  LightDidDetails,
  FullDidDetails,
  DidDetails,
  EncryptionAlgorithms,
  resolveDoc,
  DemoKeystoreUtils,
  NewLightDidAuthenticationKey,
  LightDidSupportedVerificationKeyType,
  FullDidCreationBuilder,
  FullDidUpdateBuilder,
  Web3Names,
  DidBatchBuilder,
  Utils as DidUtils,
} from '@kiltprotocol/did'
import { BlockchainApiConnection } from '@kiltprotocol/chain-helpers'
import {
  DidResolvedDetails,
  DidServiceEndpoint,
  EncryptionKeyType,
  KeyRelationship,
  KeyringPair,
  NewDidEncryptionKey,
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
  getDefaultMigrationCallback,
  getDefaultSubmitCallback,
  createFullDidFromSeed,
} from './utils'
import { DelegationNode } from '../delegation'

let paymentAccount: KeyringPair
const keystore = new DemoKeystore()
let api: ApiPromise

beforeAll(async () => {
  await initializeApi()
  ;({ api } = await BlockchainApiConnection.getConnectionOrConnect())
}, 30_000)

beforeAll(async () => {
  paymentAccount = await createEndowedTestAccount()
}, 30_000)

it('fetches the correct deposit amount', async () => {
  const depositAmount = await DidChain.queryDepositAmount()
  expect(depositAmount.toString()).toMatchInlineSnapshot('"2007900000000000"')
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
          urls: ['x:test-url-1'],
        },
        {
          id: 'test-id-2',
          types: ['test-type-2'],
          urls: ['x:test-url-2'],
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
      DidUtils.getKiltDidFromIdentifier(newDetails.identifier, 'full')
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
        urls: ['x:test-url-1'],
      },
      {
        id: 'test-id-2',
        types: ['test-type-2'],
        urls: ['x:test-url-2'],
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
    DidUtils.getKiltDidFromIdentifier(newDetails.identifier, 'full')
  )) as FullDidDetails

  const newKeypair = await keystore.generateKeypair({
    alg: SigningAlgorithms.Sr25519,
  })
  const newKeyDetails: NewDidKey = {
    publicKey: newKeypair.publicKey,
    type: DidUtils.getVerificationKeyTypeForSigningAlgorithm(
      newKeypair.alg
    ) as LightDidSupportedVerificationKeyType,
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
    DidUtils.getKiltDidFromIdentifier(newDetails.identifier, 'full')
  )) as FullDidDetails

  // Add a new service endpoint
  const newEndpoint: DidServiceEndpoint = {
    id: 'new-endpoint',
    types: ['new-type'],
    urls: ['x:new-url'],
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
        type: DidUtils.getVerificationKeyTypeForSigningAlgorithm(
          didEd25519AuthenticationKeyDetails.alg
        ) as LightDidSupportedVerificationKeyType,
      },
      encryptionKey: {
        publicKey: didEncryptionKeyDetails.publicKey,
        type: DidUtils.getEncryptionKeyTypeForEncryptionAlgorithm(
          didEncryptionKeyDetails.alg
        ),
      },
    })

    const migratedFullDid = await lightDidDetails.migrate(
      paymentAccount.address,
      keystore,
      getDefaultMigrationCallback(paymentAccount)
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
      lightDidDetails.uri
    )) as DidResolvedDetails

    expect(metadata.canonicalId).toStrictEqual(migratedFullDid.uri)
    expect(metadata.deactivated).toBeFalsy()
  })

  it('migrates light DID with sr25519 auth key', async () => {
    const didSr25519AuthenticationKeyDetails = await keystore.generateKeypair({
      alg: SigningAlgorithms.Sr25519,
    })
    const lightDidDetails = LightDidDetails.fromDetails({
      authenticationKey: {
        publicKey: didSr25519AuthenticationKeyDetails.publicKey,
        type: DidUtils.getVerificationKeyTypeForSigningAlgorithm(
          didSr25519AuthenticationKeyDetails.alg
        ) as LightDidSupportedVerificationKeyType,
      },
    })

    const migratedFullDid = await lightDidDetails.migrate(
      paymentAccount.address,
      keystore,
      getDefaultMigrationCallback(paymentAccount)
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
      lightDidDetails.uri
    )) as DidResolvedDetails

    expect(metadata.canonicalId).toStrictEqual(migratedFullDid.uri)
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
        urls: ['x:url-1'],
      },
    ]
    const lightDidDetails = LightDidDetails.fromDetails({
      authenticationKey: {
        publicKey: didEd25519AuthenticationKeyDetails.publicKey,
        type: DidUtils.getVerificationKeyTypeForSigningAlgorithm(
          didEd25519AuthenticationKeyDetails.alg
        ) as LightDidSupportedVerificationKeyType,
      },
      encryptionKey: {
        publicKey: didEncryptionKeyDetails.publicKey,
        type: DidUtils.getEncryptionKeyTypeForEncryptionAlgorithm(
          didEncryptionKeyDetails.alg
        ),
      },
      serviceEndpoints,
    })

    const migratedFullDid = await lightDidDetails.migrate(
      paymentAccount.address,
      keystore,
      getDefaultMigrationCallback(paymentAccount),
      { withServiceEndpoints: true, withEncryptionKey: true }
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
      lightDidDetails.uri
    )) as DidResolvedDetails

    expect(metadata.canonicalId).toStrictEqual(migratedFullDid.uri)
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
          type: DidUtils.getVerificationKeyTypeForSigningAlgorithm(
            alg
          ) as LightDidSupportedVerificationKeyType,
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
      .buildAndSubmit(keystore, paymentAccount.address, async (tx) =>
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
    const call = await ctype.getStoreTx()
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
    const call = await ctype.getStoreTx()
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
            urls: ['x:url-1'],
          },
        ],
      })
      const builder = FullDidCreationBuilder.fromLightDidDetails(
        api,
        lightDidDetails,
        { withServiceEndpoints: true, withEncryptionKey: true }
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
          urls: ['x:url-2'],
        })
        .addServiceEndpoint({
          id: 'id-3',
          types: ['type-3'],
          urls: ['x:url-3'],
        })

      await expect(
        builder
          .build(keystore, paymentAccount.address)
          .then((ext) => submitExtrinsicWithResign(ext, paymentAccount))
      ).resolves.not.toThrow()

      const fullDid = await FullDidDetails.fromChainInfo(
        DidUtils.getKiltDidFromIdentifier(lightDidDetails.identifier, 'full')
      )

      expect(fullDid).not.toBeNull()

      const authenticationKeys = fullDid!.getVerificationKeys(
        KeyRelationship.authentication
      )
      expect(authenticationKeys).toMatchObject<NewDidVerificationKey[]>([
        {
          publicKey: authKey.publicKey,
          type: VerificationKeyType.Sr25519,
        },
      ])

      const encryptionKeys = fullDid!.getEncryptionKeys(
        KeyRelationship.keyAgreement
      )
      expect(encryptionKeys).toHaveLength(3)

      const assertionKeys = fullDid!.getVerificationKeys(
        KeyRelationship.assertionMethod
      )
      expect(assertionKeys).toMatchObject<NewDidVerificationKey[]>([
        {
          publicKey: Uint8Array.from(Array(32).fill(1)),
          type: VerificationKeyType.Sr25519,
        },
      ])

      const delegationKeys = fullDid!.getVerificationKeys(
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
          urls: ['x:url-3'],
        },
        {
          id: 'id-1',
          types: ['type-1'],
          urls: ['x:url-1'],
        },
        {
          id: 'id-2',
          types: ['type-2'],
          urls: ['x:url-2'],
        },
      ])
    })

    it('Build a minimal full DID with an Ecdsa key', async () => {
      const authKey = await keystore.generateKeypair({
        alg: SigningAlgorithms.EcdsaSecp256k1,
      })
      const didAuthKey: NewDidVerificationKey = {
        publicKey: authKey.publicKey,
        type: VerificationKeyType.Ecdsa,
      }
      const encodedEcdsaAddress = encodeAddress(
        blake2AsU8a(authKey.publicKey),
        38
      )

      const builder = new FullDidCreationBuilder(api, didAuthKey)

      await expect(
        builder
          .build(keystore, paymentAccount.address)
          .then((ext) => submitExtrinsicWithResign(ext, paymentAccount))
      ).resolves.not.toThrow()

      const fullDid = await FullDidDetails.fromChainInfo(
        DidUtils.getKiltDidFromIdentifier(encodedEcdsaAddress, 'full')
      )

      expect(fullDid).not.toBeNull()

      const authenticationKeys = fullDid!.getVerificationKeys(
        KeyRelationship.authentication
      )
      expect(authenticationKeys).toMatchObject<NewDidVerificationKey[]>([
        {
          publicKey: authKey.publicKey,
          type: VerificationKeyType.Ecdsa,
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
          urls: ['x:url-1'],
        })
        .addServiceEndpoint({
          id: 'id-2',
          types: ['type-2'],
          urls: ['x:url-2'],
        })

      const initialFullDid = await createBuilder.buildAndSubmit(
        keystore,
        paymentAccount.address,
        getDefaultSubmitCallback(paymentAccount)
      )

      const updateBuilder = new FullDidUpdateBuilder(api, initialFullDid)
        .removeAllEncryptionKeys()
        .removeAttestationKey()
        .removeDelegationKey()
        .removeAllServiceEndpoints()

      await expect(
        updateBuilder
          .build(keystore, paymentAccount.address)
          .then((ext) => submitExtrinsicWithResign(ext, paymentAccount))
      ).resolves.not.toThrow()

      const finalFullDid = await FullDidDetails.fromChainInfo(
        initialFullDid.uri
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
        publicKey: authKey.publicKey,
        type: VerificationKeyType.Sr25519,
      })

      const initialFullDid = await createBuilder.buildAndSubmit(
        keystore,
        paymentAccount.address,
        getDefaultSubmitCallback(paymentAccount)
      )

      const updateBuilder = new FullDidUpdateBuilder(api, initialFullDid)
        .addServiceEndpoint({
          id: 'id-1',
          types: ['type-1'],
          urls: ['x:url-1'],
        })
        .setAuthenticationKey({
          publicKey: newAuthKey.publicKey,
          type: VerificationKeyType.Ed25519,
        })
        .addServiceEndpoint({
          id: 'id-2',
          types: ['type-2'],
          urls: ['x:url-2'],
        })

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
          .build(keystore, paymentAccount.address)
          .then((ext) => submitExtrinsicWithResign(ext, paymentAccount))
      ).resolves.not.toThrow()

      const finalFullDid = await FullDidDetails.fromChainInfo(
        initialFullDid.uri
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

    it('non-atomic builder succeeds despite failures of some extrinsics', async () => {
      const authKey = await keystore.generateKeypair({
        alg: SigningAlgorithms.Sr25519,
      })
      const createBuilder = new FullDidCreationBuilder(api, {
        publicKey: authKey.publicKey,
        type: VerificationKeyType.Sr25519,
      }).addServiceEndpoint({
        id: 'id-1',
        types: ['type-1'],
        urls: ['x:url-1'],
      })
      // Create the full DID with a service endpoint
      const fullDid = await createBuilder.buildAndSubmit(
        keystore,
        paymentAccount.address,
        async (tx) => submitExtrinsicWithResign(tx, paymentAccount)
      )
      expect(fullDid.attestationKey).toBeUndefined()

      // Configure the builder to set a new attestation key and a service endpoint
      const updateBuilder = new FullDidUpdateBuilder(api, fullDid)
        .setAttestationKey({
          publicKey: authKey.publicKey,
          type: VerificationKeyType.Sr25519,
        })
        .addServiceEndpoint({
          id: 'id-2',
          types: ['type-2'],
          urls: ['x:url-2'],
        })

      // Before consuming the builder, let's add the same service endpoint to the DID directly
      const newEndpointTx = await DidChain.getAddEndpointExtrinsic({
        id: 'id-2',
        types: ['type-22'],
        urls: ['x:url-22'],
      })
      const authorisedTx = await fullDid.authorizeExtrinsic(
        newEndpointTx,
        keystore,
        paymentAccount.address
      )
      await expect(
        submitExtrinsicWithResign(authorisedTx, paymentAccount)
      ).resolves.not.toThrow()

      // Now, consuming the builder will result in the second operation to fail but the batch to succeed, so we can test the atomic flag.
      await expect(
        updateBuilder.buildAndSubmit(
          keystore,
          paymentAccount.address,
          async (tx) => submitExtrinsicWithResign(tx, paymentAccount),
          // Not atomic
          false
        )
      ).resolves.not.toThrow()

      const updatedFullDid = await FullDidDetails.fromChainInfo(fullDid.uri)
      // .setAttestationKey() extrinsic went through in the batch
      expect(updatedFullDid!.attestationKey).toBeDefined()
      // The service endpoint will match the one manually added, and not the one set in the builder.
      expect(
        updatedFullDid!.getEndpoint('id-2')
      ).toStrictEqual<DidServiceEndpoint>({
        id: 'id-2',
        types: ['type-22'],
        urls: ['x:url-22'],
      })
    }, 60_000)

    it('atomic builder fails if any extrinsics fails', async () => {
      const authKey = await keystore.generateKeypair({
        alg: SigningAlgorithms.Sr25519,
      })
      const createBuilder = new FullDidCreationBuilder(api, {
        publicKey: authKey.publicKey,
        type: VerificationKeyType.Sr25519,
      }).addServiceEndpoint({
        id: 'id-1',
        types: ['type-1'],
        urls: ['x:url-1'],
      })
      // Create the full DID with a service endpoint
      const fullDid = await createBuilder.buildAndSubmit(
        keystore,
        paymentAccount.address,
        async (tx) => submitExtrinsicWithResign(tx, paymentAccount)
      )
      expect(fullDid.attestationKey).toBeUndefined()

      // Configure the builder to set a new attestation key and a service endpoint
      const updateBuilder = new FullDidUpdateBuilder(api, fullDid)
        .setAttestationKey({
          publicKey: authKey.publicKey,
          type: VerificationKeyType.Sr25519,
        })
        .addServiceEndpoint({
          id: 'id-2',
          types: ['type-2'],
          urls: ['x:url-2'],
        })

      // Before consuming the builder, let's add the same service endpoint to the DID directly
      const newEndpointTx = await DidChain.getAddEndpointExtrinsic({
        id: 'id-2',
        types: ['type-22'],
        urls: ['x:url-22'],
      })
      const authorisedTx = await fullDid.authorizeExtrinsic(
        newEndpointTx,
        keystore,
        paymentAccount.address
      )
      await expect(
        submitExtrinsicWithResign(authorisedTx, paymentAccount)
      ).resolves.not.toThrow()

      // Now, consuming the builder will result in the second operation to fail AND the batch to fail, so we can test the atomic flag.
      await expect(
        updateBuilder.buildAndSubmit(
          keystore,
          paymentAccount.address,
          async (tx) => submitExtrinsicWithResign(tx, paymentAccount),
          // Atomic
          true
        )
      ).rejects.toMatchObject({
        section: 'did',
        name: 'ServiceAlreadyPresent',
      })

      const updatedFullDid = await FullDidDetails.fromChainInfo(fullDid.uri)
      // .setAttestationKey() extrinsic went through but it was then reverted
      expect(updatedFullDid!.attestationKey).toBeUndefined()
      // The service endpoint will match the one manually added, and not the one set in the builder.
      expect(
        updatedFullDid!.getEndpoint('id-2')
      ).toStrictEqual<DidServiceEndpoint>({
        id: 'id-2',
        types: ['type-22'],
        urls: ['x:url-22'],
      })
    }, 60_000)
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
    const ctypeCreationTx = await ctype.getStoreTx()
    const rootNode = DelegationNode.newRoot({
      account: fullDid.uri,
      permissions: [Permission.DELEGATE],
      cTypeHash: ctype.hash,
    })
    const delegationCreationTx = await rootNode.getStoreTx()
    const delegationRevocationTx = await rootNode.getRevokeTx(fullDid.uri)
    const tx = await new DidBatchBuilder(api, fullDid)
      .addMultipleExtrinsics([
        ctypeCreationTx,
        // Will fail since the delegation cannot be revoked before it is added
        delegationRevocationTx,
        delegationCreationTx,
      ])
      .build(keystore, paymentAccount.address, { atomic: false })

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
    const ctypeCreationTx = await ctype.getStoreTx()
    const rootNode = DelegationNode.newRoot({
      account: fullDid.uri,
      permissions: [Permission.DELEGATE],
      cTypeHash: ctype.hash,
    })
    const delegationCreationTx = await rootNode.getStoreTx()
    const delegationRevocationTx = await rootNode.getRevokeTx(fullDid.uri)
    const tx = await new DidBatchBuilder(api, fullDid)
      .addMultipleExtrinsics([
        ctypeCreationTx,
        // Will fail since the delegation cannot be revoked before it is added
        delegationRevocationTx,
        delegationCreationTx,
      ])
      .build(keystore, paymentAccount.address, { atomic: true })

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
    const web3NameClaimTx = await Web3Names.getClaimTx('test-1')
    const authorisedTx = await fullDid.authorizeExtrinsic(
      web3NameClaimTx,
      keystore,
      paymentAccount.address
    )
    await submitExtrinsicWithResign(authorisedTx, paymentAccount)

    const web3Name1ReleaseExt = await Web3Names.getReleaseByOwnerTx()
    const web3Name2ClaimExt = await Web3Names.getClaimTx('test-2')
    const tx = await new DidBatchBuilder(api, fullDid)
      .addMultipleExtrinsics([web3Name1ReleaseExt, web3Name2ClaimExt])
      .build(keystore, paymentAccount.address)
    await expect(
      submitExtrinsicWithResign(tx, paymentAccount)
    ).resolves.not.toThrow()

    // Test for correct creation and deletion
    await expect(
      Web3Names.queryDidIdentifierForWeb3Name('test-1')
    ).resolves.toBeNull()
    // Test for correct creation of second web3 name
    await expect(
      Web3Names.queryDidIdentifierForWeb3Name('test-2')
    ).resolves.toStrictEqual(fullDid.identifier)
  }, 30_000)

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
    const ctype1Creation = await ctype1.getStoreTx()
    // Delegation key
    const rootNode = DelegationNode.newRoot({
      account: fullDid.uri,
      permissions: [Permission.DELEGATE],
      cTypeHash: ctype1.hash,
    })
    const delegationHierarchyCreation = await rootNode.getStoreTx()

    // Authentication key
    const web3NameNewClaimExt = await Web3Names.getClaimTx('test-2')
    // Attestation key
    const ctype2 = CType.fromSchema({
      title: UUID.generate(),
      properties: {},
      type: 'object',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
    })
    const ctype2Creation = await ctype2.getStoreTx()
    // Delegation key
    const delegationHierarchyRemoval = await rootNode.getRevokeTx(fullDid.uri)

    const builder = new DidBatchBuilder(api, fullDid)
      .addSingleExtrinsic(web3NameReleaseExt)
      .addSingleExtrinsic(ctype1Creation)
      .addSingleExtrinsic(delegationHierarchyCreation)
      .addSingleExtrinsic(web3NameNewClaimExt)
      .addSingleExtrinsic(ctype2Creation)
      .addSingleExtrinsic(delegationHierarchyRemoval)

    const batchedExtrinsics = await builder.build(
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
  })
})

describe('Runtime constraints', () => {
  let testAuthKey: NewDidVerificationKey
  beforeAll(async () => {
    testAuthKey = await keystore
      .generateKeypair({ alg: SigningAlgorithms.Ed25519 })
      .then(({ publicKey }) => {
        return {
          publicKey,
          type: VerificationKeyType.Ed25519,
        }
      })
  })
  describe('DID creation', () => {
    it('should not be possible to create a DID with too many encryption keys', async () => {
      // Maximum is 10
      const newKeyAgreementKeys = Array(10).map(
        (_, index): NewDidEncryptionKey => {
          return {
            publicKey: Uint8Array.from(new Array(32).fill(index)),
            type: EncryptionKeyType.X25519,
          }
        }
      )
      await expect(
        DidChain.generateCreateTxFromCreationDetails(
          {
            authenticationKey: testAuthKey,
            identifier: encodeAddress(testAuthKey.publicKey),
            keyAgreementKeys: newKeyAgreementKeys,
          },
          paymentAccount.address,
          keystore
        )
      ).resolves.not.toThrow()
      // One more than the maximum
      newKeyAgreementKeys.push({
        publicKey: Uint8Array.from(new Array(32).fill(100)),
        type: EncryptionKeyType.X25519,
      })
      await expect(
        DidChain.generateCreateTxFromCreationDetails(
          {
            authenticationKey: testAuthKey,
            identifier: encodeAddress(testAuthKey.publicKey),
            keyAgreementKeys: newKeyAgreementKeys,
          },
          paymentAccount.address,
          keystore
        )
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        '"The number of key agreement keys in the creation operation is greater than the maximum allowed, which is 10."'
      )
    }, 30_000)

    it('should not be possible to create a DID with too many service endpoints', async () => {
      // Maximum is 25
      const newServiceEndpoints = Array(25).map(
        (_, index): DidServiceEndpoint => {
          return {
            id: `service-${index}`,
            types: [`type-${index}`],
            urls: [`x:url-${index}`],
          }
        }
      )
      await expect(
        DidChain.generateCreateTxFromCreationDetails(
          {
            authenticationKey: testAuthKey,
            identifier: encodeAddress(testAuthKey.publicKey),
            serviceEndpoints: newServiceEndpoints,
          },
          paymentAccount.address,
          keystore
        )
      ).resolves.not.toThrow()
      // One more than the maximum
      newServiceEndpoints.push({
        id: 'service-100',
        types: ['type-100'],
        urls: ['x:url-100'],
      })
      await expect(
        DidChain.generateCreateTxFromCreationDetails(
          {
            authenticationKey: testAuthKey,
            identifier: encodeAddress(testAuthKey.publicKey),
            serviceEndpoints: newServiceEndpoints,
          },
          paymentAccount.address,
          keystore
        )
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        '"Cannot store more than 25 service endpoints per DID."'
      )
    }, 30_000)

    it('should not be possible to create a DID with a service endpoint that is too long', async () => {
      await expect(
        DidChain.generateCreateTxFromCreationDetails(
          {
            authenticationKey: testAuthKey,
            identifier: encodeAddress(testAuthKey.publicKey),
            serviceEndpoints: [
              {
                // Maximum is 50
                id: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
                types: ['type-a'],
                urls: ['x:url-a'],
              },
            ],
          },
          paymentAccount.address,
          keystore
        )
      ).resolves.not.toThrow()
      await expect(
        DidChain.generateCreateTxFromCreationDetails(
          {
            authenticationKey: testAuthKey,
            identifier: encodeAddress(testAuthKey.publicKey),
            serviceEndpoints: [
              {
                // One more than the maximum
                id: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
                types: ['type-a'],
                urls: ['x:url-a'],
              },
            ],
          },

          paymentAccount.address,
          keystore
        )
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"The service ID 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' is too long (51 bytes). Max number of bytes allowed for a service ID is 50."`
      )
    }, 30_000)

    it('should not be possible to create a DID with a service endpoint that has too many types', async () => {
      const newEndpoint: DidServiceEndpoint = {
        id: 'id-1',
        // Maximum is 1
        types: Array(1).map((_, index): string => `type-${index}`),
        urls: ['x:url-1'],
      }
      await expect(
        DidChain.generateCreateTxFromCreationDetails(
          {
            authenticationKey: testAuthKey,
            identifier: encodeAddress(testAuthKey.publicKey),
            serviceEndpoints: [newEndpoint],
          },
          paymentAccount.address,
          keystore
        )
      ).resolves.not.toThrow()
      // One more than the maximum
      newEndpoint.types.push('new-type')
      await expect(
        DidChain.generateCreateTxFromCreationDetails(
          {
            authenticationKey: testAuthKey,
            identifier: encodeAddress(testAuthKey.publicKey),
            serviceEndpoints: [newEndpoint],
          },

          paymentAccount.address,
          keystore
        )
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"The service with ID 'id-1' has too many types (2). Max number of types allowed per service is 1."`
      )
    }, 30_000)

    it('should not be possible to create a DID with a service endpoint that has too many URLs', async () => {
      const newEndpoint: DidServiceEndpoint = {
        id: 'id-1',
        // Maximum is 1
        types: ['type-1'],
        urls: Array(1).map((_, index): string => `x:url-${index}`),
      }
      await expect(
        DidChain.generateCreateTxFromCreationDetails(
          {
            authenticationKey: testAuthKey,
            identifier: encodeAddress(testAuthKey.publicKey),
            serviceEndpoints: [newEndpoint],
          },
          paymentAccount.address,
          keystore
        )
      ).resolves.not.toThrow()
      // One more than the maximum
      newEndpoint.urls.push('x:new-url')
      await expect(
        DidChain.generateCreateTxFromCreationDetails(
          {
            authenticationKey: testAuthKey,
            identifier: encodeAddress(testAuthKey.publicKey),
            serviceEndpoints: [newEndpoint],
          },

          paymentAccount.address,
          keystore
        )
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"The service with ID 'id-1' has too many URLs (2). Max number of URLs allowed per service is 1."`
      )
    }, 30_000)

    it('should not be possible to create a DID with a service endpoint that has a type that is too long', async () => {
      await expect(
        DidChain.generateCreateTxFromCreationDetails(
          {
            authenticationKey: testAuthKey,
            identifier: encodeAddress(testAuthKey.publicKey),
            serviceEndpoints: [
              {
                id: 'id-1',
                // Maximum is 50
                types: ['aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'],
                urls: ['x:url-1'],
              },
            ],
          },
          paymentAccount.address,
          keystore
        )
      ).resolves.not.toThrow()
      await expect(
        DidChain.generateCreateTxFromCreationDetails(
          {
            authenticationKey: testAuthKey,
            identifier: encodeAddress(testAuthKey.publicKey),
            serviceEndpoints: [
              {
                id: 'id-1',
                // One more than the maximum
                types: ['aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'],
                urls: ['x:url-1'],
              },
            ],
          },

          paymentAccount.address,
          keystore
        )
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"The service with ID 'id-1' has the type 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' that is too long (51 bytes). Max number of bytes allowed for a service type is 50."`
      )
    }, 30_000)

    it('should not be possible to create a DID with a service endpoint that has a URL that is too long', async () => {
      await expect(
        DidChain.generateCreateTxFromCreationDetails(
          {
            authenticationKey: testAuthKey,
            identifier: encodeAddress(testAuthKey.publicKey),
            serviceEndpoints: [
              {
                id: 'id-1',
                types: ['type-1'],
                // Maximum is 200
                urls: [
                  'a:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
                ],
              },
            ],
          },
          paymentAccount.address,
          keystore
        )
      ).resolves.not.toThrow()
      await expect(
        DidChain.generateCreateTxFromCreationDetails(
          {
            authenticationKey: testAuthKey,
            identifier: encodeAddress(testAuthKey.publicKey),
            serviceEndpoints: [
              {
                id: 'id-1',
                types: ['type-1'],
                // One more than the maximum
                urls: [
                  'a:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
                ],
              },
            ],
          },

          paymentAccount.address,
          keystore
        )
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"The service with ID 'id-1' has the URL 'a:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' that is too long (202 bytes). Max number of bytes allowed for a service URL is 200."`
      )
    }, 30_000)
  })

  describe('Service endpoint addition', () => {
    it('should not be possible to add a service endpoint that is too long', async () => {
      await expect(
        DidChain.getAddEndpointExtrinsic({
          // Maximum is 50
          id: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          types: ['type-a'],
          urls: ['x:url-a'],
        })
      ).resolves.not.toThrow()
      await expect(
        DidChain.getAddEndpointExtrinsic({
          // One more than maximum
          id: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          types: ['type-a'],
          urls: ['x:url-a'],
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"The service ID 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' is too long (51 bytes). Max number of bytes allowed for a service ID is 50."`
      )
    }, 30_000)

    it('should not be possible to add a service endpoint that has too many types', async () => {
      const newEndpoint: DidServiceEndpoint = {
        id: 'id-1',
        // Maximum is 1
        types: Array(1).map((_, index): string => `type-${index}`),
        urls: ['x:url-1'],
      }
      await expect(
        DidChain.getAddEndpointExtrinsic(newEndpoint)
      ).resolves.not.toThrow()
      // One more than the maximum
      newEndpoint.types.push('new-type')
      await expect(
        DidChain.getAddEndpointExtrinsic(newEndpoint)
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"The service with ID 'id-1' has too many types (2). Max number of types allowed per service is 1."`
      )
    }, 30_000)

    it('should not be possible to add a service endpoint that has too many URLs', async () => {
      const newEndpoint: DidServiceEndpoint = {
        id: 'id-1',
        // Maximum is 1
        types: ['type-1'],
        urls: Array(1).map((_, index): string => `x:url-${index}`),
      }
      await expect(
        DidChain.getAddEndpointExtrinsic(newEndpoint)
      ).resolves.not.toThrow()
      // One more than the maximum
      newEndpoint.urls.push('x:new-url')
      await expect(
        DidChain.getAddEndpointExtrinsic(newEndpoint)
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"The service with ID 'id-1' has too many URLs (2). Max number of URLs allowed per service is 1."`
      )
    }, 30_000)

    it('should not be possible to add a service endpoint that has a type that is too long', async () => {
      await expect(
        DidChain.getAddEndpointExtrinsic({
          id: 'id-1',
          // Maximum is 50
          types: ['aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'],
          urls: ['x:url-1'],
        })
      ).resolves.not.toThrow()
      await expect(
        DidChain.getAddEndpointExtrinsic({
          id: 'id-1',
          // One more than the maximum
          types: ['aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'],
          urls: ['x:url-1'],
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"The service with ID 'id-1' has the type 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' that is too long (51 bytes). Max number of bytes allowed for a service type is 50."`
      )
    }, 30_000)

    it('should not be possible to add a service endpoint that has a URL that is too long', async () => {
      await expect(
        DidChain.getAddEndpointExtrinsic({
          id: 'id-1',
          types: ['type-1'],
          // Maximum is 200
          urls: [
            'a:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          ],
        })
      ).resolves.not.toThrow()
      await expect(
        DidChain.getAddEndpointExtrinsic({
          id: 'id-1',
          types: ['type-1'],
          // One more than the maximum
          urls: [
            'a:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          ],
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"The service with ID 'id-1' has the URL 'a:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' that is too long (201 bytes). Max number of bytes allowed for a service URL is 200."`
      )
    }, 30_000)
  })
})

afterAll(async () => disconnect())
