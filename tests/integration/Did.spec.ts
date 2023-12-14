/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type {
  DidDocument,
  KiltKeyringPair,
  ResolutionResult,
  Service,
  SignerInterface,
  VerificationMethod,
} from '@kiltprotocol/types'
import type { ApiPromise } from '@polkadot/api'

import { BN } from '@polkadot/util'

import { CType, DelegationNode } from '@kiltprotocol/credentials'
import * as Did from '@kiltprotocol/did'
import { disconnect } from '@kiltprotocol/sdk-js'
import { Permission } from '@kiltprotocol/types'
import { UUID } from '@kiltprotocol/utils'

import type { KeyTool } from '../testUtils/index.js'

import {
  createFullDidFromSeed,
  createMinimalLightDidFromKeypair,
  getStoreTxFromDidDocument,
  makeEncryptionKey,
  makeSigningKeyTool,
} from '../testUtils/index.js'
import {
  createEndowedTestAccount,
  devBob,
  initializeApi,
  submitTx,
} from './utils.js'

let paymentAccount: KiltKeyringPair
let api: ApiPromise

beforeAll(async () => {
  api = await initializeApi()
}, 30_000)

beforeAll(async () => {
  paymentAccount = await createEndowedTestAccount()
}, 30_000)

describe('write and didDeleteTx', () => {
  let did: DidDocument
  let key: KeyTool
  let signers: SignerInterface[]

  beforeAll(async () => {
    key = await makeSigningKeyTool()
    did = await createMinimalLightDidFromKeypair(key.keypair)
    signers = await key.getSigners(did)
  })

  it('fails to create a new DID on chain with a different submitter than the one in the creation operation', async () => {
    const otherAccount = devBob
    const tx = await getStoreTxFromDidDocument(did, otherAccount.address, [
      key.storeDidSigner,
    ])

    await expect(submitTx(tx, paymentAccount)).rejects.toMatchObject({
      isBadOrigin: true,
    })
  }, 60_000)

  it('writes a new DID record to chain', async () => {
    const { publicKeyMultibase } = did.verificationMethod?.find(
      (vm) => vm.id === did.authentication?.[0]
    ) as VerificationMethod
    const { keyType, publicKey: authPublicKey } =
      Did.multibaseKeyToDidKey(publicKeyMultibase)
    const input: Did.CreateDocumentInput = {
      authentication: [{ publicKey: authPublicKey, type: keyType }] as [
        Did.NewLightDidVerificationKey
      ],
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
    }

    const tx = await Did.getStoreTx(input, paymentAccount.address, [
      key.storeDidSigner,
    ])

    await submitTx(tx, paymentAccount)

    const fullDid = Did.getFullDidFromVerificationMethod({
      publicKeyMultibase,
    })
    const fullDidLinkedInfo = await api.call.did.query(Did.toChain(fullDid))
    const { document: fullDidDocument } =
      Did.linkedInfoFromChain(fullDidLinkedInfo)

    // this is to make sure we have signers for the full DID available (same keys, but different id)
    signers.push(
      ...signers.map(({ algorithm, sign }) => ({
        id: fullDidDocument.id + fullDidDocument.authentication?.[0],
        algorithm,
        sign,
      }))
    )

    expect(fullDidDocument).toMatchObject<DidDocument>({
      id: fullDid,
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
      verificationMethod: [
        expect.objectContaining(<Partial<VerificationMethod>>{
          controller: fullDid,
          type: 'Multikey',
          // We cannot match the ID of the key because it will be defined by the blockchain while saving
          publicKeyMultibase: Did.keypairToMultibaseKey({
            type: 'sr25519',
            publicKey: authPublicKey,
          }),
        }),
      ],
    })
    expect(fullDidDocument.authentication).toHaveLength(1)
    expect(fullDidDocument.keyAgreement).toBe(undefined)
    expect(fullDidDocument.assertionMethod).toBe(undefined)
    expect(fullDidDocument.capabilityDelegation).toBe(undefined)
  }, 60_000)

  it('should return no results for empty accounts', async () => {
    const emptyDid = Did.getFullDid(
      (await makeSigningKeyTool()).keypair.address
    )

    const encodedDid = Did.toChain(emptyDid)
    expect((await api.call.did.query(encodedDid)).isSome).toBe(false)
  })

  it('fails to delete the DID using a different submitter than the one specified in the DID operation or using a services count that is too low', async () => {
    // We verify that the DID to delete is on chain.
    const fullDidLinkedInfo = await api.call.did.query(
      Did.toChain(Did.getFullDid(did.id))
    )
    const { document: fullDid } = Did.linkedInfoFromChain(fullDidLinkedInfo)
    expect(fullDid).not.toBeNull()

    const otherAccount = devBob

    // 10 is an example value. It is not used here since we are testing another error
    let call = api.tx.did.delete(new BN(10))

    let submittable = await Did.authorizeTx(
      fullDid.id,
      call,
      signers,
      // Use a different account than the submitter one
      otherAccount.address
    )

    await expect(submitTx(submittable, paymentAccount)).rejects.toMatchObject({
      section: 'did',
      name: 'BadDidOrigin',
    })

    // We use 1 here and this should fail as there are two services stored.
    call = api.tx.did.delete(new BN(1))

    submittable = await Did.authorizeTx(
      fullDid.id,
      call,
      signers,
      paymentAccount.address
    )

    // Will fail because count provided is too low
    await expect(submitTx(submittable, paymentAccount)).rejects.toMatchObject({
      section: 'did',
      name: expect.stringMatching(
        /^(StoredEndpointsCountTooLarge|MaxStoredEndpointsCountExceeded)$/
      ),
    })
  }, 60_000)

  it('deletes DID from previous step', async () => {
    // We verify that the DID to delete is on chain.
    const fullDidLinkedInfo = await api.call.did.query(
      Did.toChain(Did.getFullDid(did.id))
    )
    const { document: fullDid } = Did.linkedInfoFromChain(fullDidLinkedInfo)
    expect(fullDid).not.toBeNull()

    const encodedDid = Did.toChain(fullDid.id)
    const linkedInfo = Did.linkedInfoFromChain(
      await api.call.did.query(encodedDid)
    )
    const storedEndpointsCount = linkedInfo.document.service?.length ?? 0
    const call = api.tx.did.delete(storedEndpointsCount)

    const submittable = await Did.authorizeTx(
      fullDid.id,
      call,
      signers,
      paymentAccount.address
    )

    // Check that DID is not blacklisted.
    expect((await api.query.did.didBlacklist(encodedDid)).isNone).toBe(true)

    await submitTx(submittable, paymentAccount)

    expect((await api.call.did.query(encodedDid)).isNone).toBe(true)

    // Check that DID is now blacklisted.
    expect((await api.query.did.didBlacklist(encodedDid)).isSome).toBe(true)
  }, 60_000)
})

it('creates and updates DID, and then reclaims the deposit back', async () => {
  const { keypair, getSigners, storeDidSigner } = await makeSigningKeyTool()
  const newDid = await createMinimalLightDidFromKeypair(keypair)

  const tx = await getStoreTxFromDidDocument(newDid, paymentAccount.address, [
    storeDidSigner,
  ])

  await submitTx(tx, paymentAccount)

  // This will better be handled once we have the UpdateBuilder class, which encapsulates all the logic.
  let fullDidLinkedInfo = await api.call.did.query(
    Did.toChain(Did.getFullDid(newDid.id))
  )
  let { document: fullDid } = Did.linkedInfoFromChain(fullDidLinkedInfo)

  const newKey = await makeSigningKeyTool()

  const updateAuthenticationKeyCall = api.tx.did.setAuthenticationKey(
    Did.publicKeyToChain(newKey.authentication[0])
  )
  const tx2 = await Did.authorizeTx(
    fullDid.id,
    updateAuthenticationKeyCall,
    await getSigners(fullDid),
    paymentAccount.address
  )
  await submitTx(tx2, paymentAccount)

  // Authentication key changed, so did must be updated.
  // Also this will better be handled once we have the UpdateBuilder class, which encapsulates all the logic.
  fullDidLinkedInfo = await api.call.did.query(
    Did.toChain(Did.getFullDid(newDid.id))
  )
  fullDid = Did.linkedInfoFromChain(fullDidLinkedInfo).document

  // Add a new service
  const newEndpoint: Did.NewService = {
    id: '#new-endpoint',
    type: ['new-type'],
    serviceEndpoint: ['x:new-url'],
  }
  const updateEndpointCall = api.tx.did.addServiceEndpoint(
    Did.serviceToChain(newEndpoint)
  )

  const tx3 = await Did.authorizeTx(
    fullDid.id,
    updateEndpointCall,
    await newKey.getSigners(fullDid),
    paymentAccount.address
  )
  await submitTx(tx3, paymentAccount)

  const encodedDid = Did.toChain(fullDid.id)
  const linkedInfo = Did.linkedInfoFromChain(
    await api.call.did.query(encodedDid)
  )
  expect(
    linkedInfo.document.service?.find((s) => s.id === newEndpoint.id)
  ).toStrictEqual(newEndpoint)

  // Delete the added service
  const removeEndpointCall = api.tx.did.removeServiceEndpoint(
    Did.fragmentIdToChain(newEndpoint.id)
  )
  const tx4 = await Did.authorizeTx(
    fullDid.id,
    removeEndpointCall,
    await newKey.getSigners(fullDid),
    paymentAccount.address
  )
  await submitTx(tx4, paymentAccount)

  // There should not be any endpoint with the given ID now.
  const linkedInfo2 = Did.linkedInfoFromChain(
    await api.call.did.query(encodedDid)
  )
  expect(
    linkedInfo2.document.service?.find((s) => s.id === newEndpoint.id)
  ).toBe(undefined)

  // Claim the deposit back
  const storedEndpointsCount = linkedInfo2.document.service?.length ?? 0
  const reclaimDepositTx = api.tx.did.reclaimDeposit(
    encodedDid,
    storedEndpointsCount
  )
  await submitTx(reclaimDepositTx, paymentAccount)
  // Verify that the DID has been deleted
  expect((await api.call.did.query(encodedDid)).isNone).toBe(true)
}, 80_000)

describe('DID migration', () => {
  it('migrates light DID with ed25519 auth key and encryption key', async () => {
    const { storeDidSigner, authentication } = await makeSigningKeyTool(
      'ed25519'
    )
    const { keyAgreement } = makeEncryptionKey(
      '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
    )
    const lightDid = Did.createLightDidDocument({
      authentication,
      keyAgreement,
    })

    const storeTx = await getStoreTxFromDidDocument(
      lightDid,
      paymentAccount.address,
      [storeDidSigner]
    )

    await submitTx(storeTx, paymentAccount)
    const migratedFullDid = Did.getFullDid(lightDid.id)
    const migratedFullDidLinkedInfo = await api.call.did.query(
      Did.toChain(migratedFullDid)
    )
    const { document: migratedFullDidDocument } = Did.linkedInfoFromChain(
      migratedFullDidLinkedInfo
    )

    expect(migratedFullDidDocument).toMatchObject(<Partial<DidDocument>>{
      id: migratedFullDid,
      verificationMethod: [
        expect.objectContaining(<Partial<VerificationMethod>>{
          controller: migratedFullDid,
          type: 'Multikey',
          // We cannot match the ID of the key because it will be defined by the blockchain while saving
          publicKeyMultibase: Did.keypairToMultibaseKey(authentication[0]),
        }),
        expect.objectContaining(<Partial<VerificationMethod>>{
          controller: migratedFullDid,
          type: 'Multikey',
          // We cannot match the ID of the key because it will be defined by the blockchain while saving
          publicKeyMultibase: Did.keypairToMultibaseKey(keyAgreement[0]),
        }),
      ],
    })
    expect(migratedFullDidDocument.authentication).toHaveLength(1)
    expect(migratedFullDidDocument.keyAgreement).toHaveLength(1)
    expect(migratedFullDidDocument.assertionMethod).toBe(undefined)
    expect(migratedFullDidDocument.capabilityDelegation).toBe(undefined)

    expect(
      (await api.call.did.query(Did.toChain(migratedFullDidDocument.id))).isSome
    ).toBe(true)

    const { didDocumentMetadata } = (await Did.resolve(
      lightDid.id
    )) as ResolutionResult

    expect(didDocumentMetadata.canonicalId).toStrictEqual(
      migratedFullDidDocument.id
    )
    expect(didDocumentMetadata.deactivated).toBe(undefined)
  })

  it('migrates light DID with sr25519 auth key', async () => {
    const { authentication, storeDidSigner } = await makeSigningKeyTool()
    const lightDid = Did.createLightDidDocument({
      authentication,
    })

    const storeTx = await getStoreTxFromDidDocument(
      lightDid,
      paymentAccount.address,
      [storeDidSigner]
    )

    await submitTx(storeTx, paymentAccount)
    const migratedFullDid = Did.getFullDid(lightDid.id)
    const migratedFullDidLinkedInfo = await api.call.did.query(
      Did.toChain(migratedFullDid)
    )
    const { document: migratedFullDidDocument } = Did.linkedInfoFromChain(
      migratedFullDidLinkedInfo
    )

    expect(migratedFullDidDocument).toMatchObject(<Partial<DidDocument>>{
      id: migratedFullDid,
      verificationMethod: [
        expect.objectContaining(<Partial<VerificationMethod>>{
          controller: migratedFullDid,
          type: 'Multikey',
          // We cannot match the ID of the key because it will be defined by the blockchain while saving
          publicKeyMultibase: Did.keypairToMultibaseKey(authentication[0]),
        }),
      ],
    })
    expect(migratedFullDidDocument.authentication).toHaveLength(1)
    expect(migratedFullDidDocument.keyAgreement).toBe(undefined)
    expect(migratedFullDidDocument.assertionMethod).toBe(undefined)
    expect(migratedFullDidDocument.capabilityDelegation).toBe(undefined)

    expect(
      (await api.call.did.query(Did.toChain(migratedFullDidDocument.id))).isSome
    ).toBe(true)

    const { didDocumentMetadata } = (await Did.resolve(
      lightDid.id
    )) as ResolutionResult

    expect(didDocumentMetadata.canonicalId).toStrictEqual(
      migratedFullDidDocument.id
    )
    expect(didDocumentMetadata.deactivated).toBe(undefined)
  })

  it('migrates light DID with ed25519 auth key, encryption key, and services', async () => {
    const { storeDidSigner, authentication } = await makeSigningKeyTool(
      'ed25519'
    )
    const { keyAgreement } = makeEncryptionKey(
      '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc'
    )
    const service: Did.NewService[] = [
      {
        id: '#id-1',
        type: ['type-1'],
        serviceEndpoint: ['x:url-1'],
      },
    ]
    const lightDid = Did.createLightDidDocument({
      authentication,
      keyAgreement,
      service,
    })

    const storeTx = await getStoreTxFromDidDocument(
      lightDid,
      paymentAccount.address,
      [storeDidSigner]
    )

    await submitTx(storeTx, paymentAccount)
    const migratedFullDid = Did.getFullDid(lightDid.id)
    const migratedFullDidLinkedInfo = await api.call.did.query(
      Did.toChain(migratedFullDid)
    )
    const { document: migratedFullDidDocument } = Did.linkedInfoFromChain(
      migratedFullDidLinkedInfo
    )

    expect(migratedFullDidDocument).toMatchObject(<Partial<DidDocument>>{
      id: migratedFullDid,
      verificationMethod: [
        expect.objectContaining(<Partial<VerificationMethod>>{
          controller: migratedFullDid,
          type: 'Multikey',
          // We cannot match the ID of the key because it will be defined by the blockchain while saving
          publicKeyMultibase: Did.keypairToMultibaseKey(authentication[0]),
        }),
        expect.objectContaining(<Partial<VerificationMethod>>{
          controller: migratedFullDid,
          type: 'Multikey',
          // We cannot match the ID of the key because it will be defined by the blockchain while saving
          publicKeyMultibase: Did.keypairToMultibaseKey(keyAgreement[0]),
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
    expect(migratedFullDidDocument.authentication).toHaveLength(1)
    expect(migratedFullDidDocument.keyAgreement).toHaveLength(1)
    expect(migratedFullDidDocument.assertionMethod).toBe(undefined)
    expect(migratedFullDidDocument.capabilityDelegation).toBe(undefined)

    const encodedDid = Did.toChain(migratedFullDidDocument.id)
    expect((await api.call.did.query(encodedDid)).isSome).toBe(true)

    const { didDocumentMetadata } = (await Did.resolve(
      lightDid.id
    )) as ResolutionResult

    expect(didDocumentMetadata.canonicalId).toStrictEqual(
      migratedFullDidDocument.id
    )
    expect(didDocumentMetadata.deactivated).toBe(undefined)

    // Remove and claim the deposit back
    const linkedInfo = Did.linkedInfoFromChain(
      await api.call.did.query(encodedDid)
    )
    const storedEndpointsCount = linkedInfo.document.service?.length ?? 0
    const reclaimDepositTx = api.tx.did.reclaimDeposit(
      encodedDid,
      storedEndpointsCount
    )
    await submitTx(reclaimDepositTx, paymentAccount)

    expect((await api.call.did.query(encodedDid)).isNone).toBe(true)
    expect((await api.query.did.didBlacklist(encodedDid)).isSome).toBe(true)
  }, 60_000)
})

describe('DID authorization', () => {
  // Light DIDs cannot authorize extrinsics
  let did: DidDocument
  let signers: SignerInterface[]

  beforeAll(async () => {
    const { getSigners, storeDidSigner, authentication } =
      await makeSigningKeyTool('ed25519')

    const createTx = await Did.getStoreTx(
      {
        authentication,
        assertionMethod: authentication,
        capabilityDelegation: authentication,
      },
      paymentAccount.address,
      [storeDidSigner]
    )
    await submitTx(createTx, paymentAccount)
    const didLinkedInfo = await api.call.did.query(
      Did.toChain(
        Did.getFullDidFromVerificationMethod({
          publicKeyMultibase: Did.keypairToMultibaseKey(authentication[0]),
        })
      )
    )
    did = Did.linkedInfoFromChain(didLinkedInfo).document
    signers = await getSigners(did)
  }, 60_000)

  it('authorizes ctype creation with DID signature', async () => {
    const cType = CType.fromProperties(UUID.generate(), {})
    const call = api.tx.ctype.add(CType.toChain(cType))
    const tx = await Did.authorizeTx(
      did.id,
      call,
      signers,
      paymentAccount.address
    )
    await submitTx(tx, paymentAccount)

    await expect(CType.verifyStored(cType)).resolves.not.toThrow()
  }, 60_000)

  it('no longer authorizes ctype creation after DID deletion', async () => {
    const linkedInfo = Did.linkedInfoFromChain(
      await api.call.did.query(Did.toChain(did.id))
    )
    const storedEndpointsCount = linkedInfo.document.service?.length ?? 0
    const deleteCall = api.tx.did.delete(storedEndpointsCount)
    const tx = await Did.authorizeTx(
      did.id,
      deleteCall,
      signers,
      paymentAccount.address
    )
    await submitTx(tx, paymentAccount)

    const cType = CType.fromProperties(UUID.generate(), {})
    const call = api.tx.ctype.add(CType.toChain(cType))
    const tx2 = await Did.authorizeTx(
      did, // this is to trick the signer into signing the tx although the DID has been deactivated
      call,
      signers,
      paymentAccount.address
    )
    await expect(submitTx(tx2, paymentAccount)).rejects.toMatchObject({
      section: 'did',
      name: expect.stringMatching(/^(DidNotPresent|NotFound)$/),
    })

    await expect(CType.verifyStored(cType)).rejects.toThrow()
  }, 60_000)
})

describe('DID management batching', () => {
  describe('FullDidCreationBuilder', () => {
    it('Build a complete full DID', async () => {
      const { storeDidSigner, authentication } = await makeSigningKeyTool()
      const extrinsic = await Did.getStoreTx(
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
        [storeDidSigner]
      )
      await submitTx(extrinsic, paymentAccount)
      const fullDidLinkedInfo = await api.call.did.query(
        Did.toChain(
          Did.getFullDidFromVerificationMethod({
            publicKeyMultibase: Did.keypairToMultibaseKey(authentication[0]),
          })
        )
      )
      const { document: fullDid } = Did.linkedInfoFromChain(fullDidLinkedInfo)

      expect(fullDid).not.toBeNull()
      expect(fullDid.verificationMethod).toEqual<Partial<VerificationMethod[]>>(
        expect.arrayContaining([
          expect.objectContaining({
            // Authentication
            controller: fullDid.id,
            type: 'Multikey',
            publicKeyMultibase: Did.keypairToMultibaseKey(authentication[0]),
          }),
          // Assertion method
          expect.objectContaining({
            controller: fullDid.id,
            type: 'Multikey',
            publicKeyMultibase: Did.keypairToMultibaseKey({
              type: 'sr25519',
              publicKey: new Uint8Array(32).fill(1),
            }),
          }),
          // Capability delegation
          expect.objectContaining({
            controller: fullDid.id,
            type: 'Multikey',
            publicKeyMultibase: Did.keypairToMultibaseKey({
              type: 'ecdsa',
              publicKey: new Uint8Array(33).fill(1),
            }),
          }),
          // Key agreement 1
          expect.objectContaining({
            controller: fullDid.id,
            type: 'Multikey',
            publicKeyMultibase: Did.keypairToMultibaseKey({
              type: 'x25519',
              publicKey: new Uint8Array(32).fill(1),
            }),
          }),
          // Key agreement 2
          expect.objectContaining({
            controller: fullDid.id,
            type: 'Multikey',
            publicKeyMultibase: Did.keypairToMultibaseKey({
              type: 'x25519',
              publicKey: new Uint8Array(32).fill(2),
            }),
          }),
          // Key agreement 3
          expect.objectContaining({
            controller: fullDid.id,
            type: 'Multikey',
            publicKeyMultibase: Did.keypairToMultibaseKey({
              type: 'x25519',
              publicKey: new Uint8Array(32).fill(3),
            }),
          }),
        ])
      )
      expect(fullDid).toMatchObject(<Partial<DidDocument>>{
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
      expect(fullDid.authentication).toHaveLength(1)
      expect(fullDid.assertionMethod).toHaveLength(1)
      expect(fullDid.capabilityDelegation).toHaveLength(1)
      expect(fullDid.keyAgreement).toHaveLength(3)
    })

    it('Build a minimal full DID with an Ecdsa key', async () => {
      const { keypair, storeDidSigner } = await makeSigningKeyTool('ecdsa')
      const didAuthKey: Did.NewDidVerificationKey = {
        publicKey: keypair.publicKey,
        type: 'ecdsa',
      }

      const extrinsic = await Did.getStoreTx(
        { authentication: [didAuthKey] },
        paymentAccount.address,
        [storeDidSigner]
      )
      await submitTx(extrinsic, paymentAccount)

      const fullDidLinkedInfo = await api.call.did.query(
        Did.toChain(
          Did.getFullDidFromVerificationMethod({
            publicKeyMultibase: Did.keypairToMultibaseKey(didAuthKey),
          })
        )
      )
      const { document: fullDid } = Did.linkedInfoFromChain(fullDidLinkedInfo)

      expect(fullDid).not.toBeNull()
      expect(fullDid).toMatchObject(<Partial<DidDocument>>{
        verificationMethod: [
          // Authentication
          expect.objectContaining(<Partial<VerificationMethod>>{
            controller: fullDid.id,
            type: 'Multikey',
            publicKeyMultibase: Did.keypairToMultibaseKey(didAuthKey),
          }),
        ],
      })
      expect(fullDid.authentication).toHaveLength(1)
      expect(fullDid.assertionMethod).toBe(undefined)
      expect(fullDid.capabilityDelegation).toBe(undefined)
      expect(fullDid.keyAgreement).toBe(undefined)
    })
  })

  describe('FullDidUpdateBuilder', () => {
    it('Build from a complete full DID and remove everything but the authentication key', async () => {
      const { keypair, getSigners, storeDidSigner, authentication } =
        await makeSigningKeyTool()

      const createTx = await Did.getStoreTx(
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
        [storeDidSigner]
      )
      await submitTx(createTx, paymentAccount)

      const initialFullDidLinkedInfo = await api.call.did.query(
        Did.toChain(
          Did.getFullDidFromVerificationMethod({
            publicKeyMultibase: Did.keypairToMultibaseKey(authentication[0]),
          })
        )
      )
      const { document: initialFullDid } = Did.linkedInfoFromChain(
        initialFullDidLinkedInfo
      )

      const encryptionKeys = initialFullDid.keyAgreement
      if (!encryptionKeys) throw new Error('No key agreement keys')

      const extrinsic = await Did.authorizeBatch({
        batchFunction: api.tx.utility.batchAll,
        did: initialFullDid.id,
        extrinsics: [
          api.tx.did.removeKeyAgreementKey(
            Did.fragmentIdToChain(
              initialFullDid.verificationMethod!.find(
                (vm) => vm.id === encryptionKeys[0]
              )!.id
            )
          ),
          api.tx.did.removeKeyAgreementKey(
            Did.fragmentIdToChain(
              initialFullDid.verificationMethod!.find(
                (vm) => vm.id === encryptionKeys[1]
              )!.id
            )
          ),
          api.tx.did.removeAttestationKey(),
          api.tx.did.removeDelegationKey(),
          api.tx.did.removeServiceEndpoint('id-1'),
          api.tx.did.removeServiceEndpoint('id-2'),
        ],
        signers: await getSigners(initialFullDid),
        submitter: paymentAccount.address,
      })
      await submitTx(extrinsic, paymentAccount)

      const finalFullDidLinkedInfo = await api.call.did.query(
        Did.toChain(initialFullDid.id)
      )
      const { document: finalFullDid } = Did.linkedInfoFromChain(
        finalFullDidLinkedInfo
      )

      expect(finalFullDid).not.toBeNull()

      expect(finalFullDid).toMatchObject(<Partial<DidDocument>>{
        verificationMethod: [
          // Authentication
          expect.objectContaining(<Partial<VerificationMethod>>{
            controller: finalFullDid.id,
            type: 'Multikey',
            publicKeyMultibase: Did.keypairToMultibaseKey({
              publicKey: keypair.publicKey,
              type: 'sr25519',
            }),
          }),
        ],
      })
      expect(finalFullDid.authentication).toHaveLength(1)
      expect(finalFullDid.assertionMethod).toBe(undefined)
      expect(finalFullDid.capabilityDelegation).toBe(undefined)
      expect(finalFullDid.keyAgreement).toBe(undefined)
    }, 40_000)

    it('Correctly handles rotation of the authentication key', async () => {
      const { authentication, getSigners, storeDidSigner } =
        await makeSigningKeyTool()
      const {
        authentication: [newAuthKey],
      } = await makeSigningKeyTool('ed25519')

      const createTx = await Did.getStoreTx(
        { authentication },
        paymentAccount.address,
        [storeDidSigner]
      )
      await submitTx(createTx, paymentAccount)

      const initialFullDidLinkedInfo = await api.call.did.query(
        Did.toChain(
          Did.getFullDidFromVerificationMethod({
            publicKeyMultibase: Did.keypairToMultibaseKey(authentication[0]),
          })
        )
      )
      const { document: initialFullDid } = Did.linkedInfoFromChain(
        initialFullDidLinkedInfo
      )

      const extrinsic = await Did.authorizeBatch({
        batchFunction: api.tx.utility.batchAll,
        did: initialFullDid.id,
        extrinsics: [
          api.tx.did.addServiceEndpoint(
            Did.serviceToChain({
              id: '#id-1',
              type: ['type-1'],
              serviceEndpoint: ['x:url-1'],
            })
          ),
          api.tx.did.setAuthenticationKey(Did.publicKeyToChain(newAuthKey)),
          api.tx.did.addServiceEndpoint(
            Did.serviceToChain({
              id: '#id-2',
              type: ['type-2'],
              serviceEndpoint: ['x:url-2'],
            })
          ),
        ],
        signers: await getSigners(initialFullDid),
        submitter: paymentAccount.address,
      })

      await submitTx(extrinsic, paymentAccount)

      const finalFullDidLinkedInfo = await api.call.did.query(
        Did.toChain(initialFullDid.id)
      )
      const { document: finalFullDid } = Did.linkedInfoFromChain(
        finalFullDidLinkedInfo
      )

      expect(finalFullDid).not.toBeNull()
      expect(finalFullDid).toMatchObject(<Partial<DidDocument>>{
        verificationMethod: [
          // Authentication
          expect.objectContaining(<Partial<VerificationMethod>>{
            controller: finalFullDid.id,
            type: 'Multikey',
            publicKeyMultibase: Did.keypairToMultibaseKey({
              publicKey: newAuthKey.publicKey,
              type: 'ed25519',
            }),
          }),
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
      })

      expect(finalFullDid.authentication).toHaveLength(1)
      expect(finalFullDid.keyAgreement).toBeUndefined()
      expect(finalFullDid.assertionMethod).toBeUndefined()
      expect(finalFullDid.capabilityDelegation).toBeUndefined()
    }, 40_000)

    it('simple `batch` succeeds despite failures of some extrinsics', async () => {
      const { authentication, getSigners, storeDidSigner } =
        await makeSigningKeyTool()
      const tx = await Did.getStoreTx(
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
        [storeDidSigner]
      )
      // Create the full DIgetStoreTx
      await submitTx(tx, paymentAccount)
      const fullDidLinkedInfo = await api.call.did.query(
        Did.toChain(
          Did.getFullDidFromVerificationMethod({
            publicKeyMultibase: Did.keypairToMultibaseKey(authentication[0]),
          })
        )
      )
      const { document: fullDid } = Did.linkedInfoFromChain(fullDidLinkedInfo)

      expect(fullDid.assertionMethod).toBeUndefined()

      // Try to set a new attestation key and a duplicate service
      const updateTx = await Did.authorizeBatch({
        batchFunction: api.tx.utility.batch,
        did: fullDid.id,
        extrinsics: [
          api.tx.did.setAttestationKey(Did.publicKeyToChain(authentication[0])),
          api.tx.did.addServiceEndpoint(
            Did.serviceToChain({
              id: '#id-1',
              type: ['type-2'],
              serviceEndpoint: ['x:url-2'],
            })
          ),
        ],
        signers: await getSigners(fullDid),
        submitter: paymentAccount.address,
      })
      // Now the second operation fails but the batch succeeds
      await submitTx(updateTx, paymentAccount)

      const updatedFullDidLinkedInfo = await api.call.did.query(
        Did.toChain(fullDid.id)
      )
      const { document: updatedFullDid } = Did.linkedInfoFromChain(
        updatedFullDidLinkedInfo
      )

      expect(updatedFullDid).toMatchObject<Partial<DidDocument>>({
        verificationMethod: [
          expect.objectContaining({
            // Authentication and assertionMethod
            controller: fullDid.id,
            type: 'Multikey',
            publicKeyMultibase: Did.keypairToMultibaseKey(authentication[0]),
          }),
        ],
        // Old service maintained
        service: [
          {
            id: '#id-1',
            type: ['type-1'],
            serviceEndpoint: ['x:url-1'],
          },
        ],
      })

      expect(updatedFullDid.authentication).toHaveLength(1)
      expect(updatedFullDid.keyAgreement).toBeUndefined()
      // .setAttestationKey() extrinsic went through in the batch
      expect(updatedFullDid.assertionMethod).toStrictEqual(
        updatedFullDid.authentication
      )
      expect(updatedFullDid.capabilityDelegation).toBeUndefined()
    }, 60_000)

    it('batchAll fails if any extrinsics fails', async () => {
      const { authentication, getSigners, storeDidSigner } =
        await makeSigningKeyTool()
      const createTx = await Did.getStoreTx(
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
        [storeDidSigner]
      )
      await submitTx(createTx, paymentAccount)
      const fullDidLinkedInfo = await api.call.did.query(
        Did.toChain(
          Did.getFullDidFromVerificationMethod({
            publicKeyMultibase: Did.keypairToMultibaseKey(authentication[0]),
          })
        )
      )
      const { document: fullDid } = Did.linkedInfoFromChain(fullDidLinkedInfo)

      expect(fullDid.assertionMethod).toBeUndefined()

      // Use batchAll to set a new attestation key and a duplicate service
      const updateTx = await Did.authorizeBatch({
        batchFunction: api.tx.utility.batchAll,
        did: fullDid.id,
        extrinsics: [
          api.tx.did.setAttestationKey(Did.publicKeyToChain(authentication[0])),
          api.tx.did.addServiceEndpoint(
            Did.serviceToChain({
              id: '#id-1',
              type: ['type-2'],
              serviceEndpoint: ['x:url-2'],
            })
          ),
        ],
        signers: await getSigners(fullDid),
        submitter: paymentAccount.address,
      })

      // Now, submitting will result in the second operation to fail AND the batch to fail, so we can test the atomic flag.
      await expect(submitTx(updateTx, paymentAccount)).rejects.toMatchObject({
        section: 'did',
        name: expect.stringMatching(/^ServiceAlready(Exists|Present)$/),
      })

      const updatedFullDidLinkedInfo = await api.call.did.query(
        Did.toChain(fullDid.id)
      )
      const { document: updatedFullDid } = Did.linkedInfoFromChain(
        updatedFullDidLinkedInfo
      )
      // .setAttestationKey() extrinsic went through but it was then reverted
      expect(updatedFullDid.assertionMethod).toBeUndefined()
      // The service will match the one manually added, and not the one set in the builder.
      expect(
        updatedFullDid.service?.find((s) => s.id === '#id-1')
      ).toStrictEqual<Service>({
        id: '#id-1',
        type: ['type-1'],
        serviceEndpoint: ['x:url-1'],
      })
    }, 60_000)
  })
})

describe('DID extrinsics batching', () => {
  let fullDid: DidDocument
  let key: KeyTool

  beforeAll(async () => {
    key = await makeSigningKeyTool()
    fullDid = await createFullDidFromSeed(paymentAccount, key.keypair)
  }, 50_000)

  it('simple batch succeeds despite failures of some extrinsics', async () => {
    const cType = CType.fromProperties(UUID.generate(), {})
    const ctypeStoreTx = api.tx.ctype.add(CType.toChain(cType))
    const rootNode = DelegationNode.newRoot({
      account: fullDid.id,
      permissions: [Permission.DELEGATE],
      cTypeHash: CType.idToHash(cType.$id),
    })
    const delegationStoreTx = await rootNode.getStoreTx()
    const delegationRevocationTx = await rootNode.getRevokeTx(fullDid.id)
    const tx = await Did.authorizeBatch({
      batchFunction: api.tx.utility.batch,
      did: fullDid.id,
      extrinsics: [
        ctypeStoreTx,
        // Will fail since the delegation cannot be revoked before it is added
        delegationRevocationTx,
        delegationStoreTx,
      ],
      signers: await key.getSigners(fullDid),
      submitter: paymentAccount.address,
    })

    // The entire submission promise is resolves and does not throw
    await submitTx(tx, paymentAccount)

    // The ctype has been created, even though the delegation operations failed.
    await expect(CType.verifyStored(cType)).resolves.not.toThrow()
  })

  it('batchAll fails if any extrinsics fail', async () => {
    const cType = CType.fromProperties(UUID.generate(), {})
    const ctypeStoreTx = api.tx.ctype.add(CType.toChain(cType))
    const rootNode = DelegationNode.newRoot({
      account: fullDid.id,
      permissions: [Permission.DELEGATE],
      cTypeHash: CType.idToHash(cType.$id),
    })
    const delegationStoreTx = await rootNode.getStoreTx()
    const delegationRevocationTx = await rootNode.getRevokeTx(fullDid.id)
    const tx = await Did.authorizeBatch({
      batchFunction: api.tx.utility.batchAll,
      did: fullDid.id,
      extrinsics: [
        ctypeStoreTx,
        // Will fail since the delegation cannot be revoked before it is added
        delegationRevocationTx,
        delegationStoreTx,
      ],
      signers: await key.getSigners(fullDid),
      submitter: paymentAccount.address,
    })

    // The entire submission promise is rejected and throws.
    await expect(submitTx(tx, paymentAccount)).rejects.toMatchObject({
      section: 'delegation',
      name: 'DelegationNotFound',
    })

    // The ctype has not been created, since atomicity ensures the whole batch is reverted in case of failure.
    await expect(CType.verifyStored(cType)).rejects.toThrow()
  })

  it('can batch extrinsics for the same required key type', async () => {
    const web3NameClaimTx = api.tx.web3Names.claim('test-1')
    const authorizedTx = await Did.authorizeTx(
      fullDid.id,
      web3NameClaimTx,
      await key.getSigners(fullDid),
      paymentAccount.address
    )
    await submitTx(authorizedTx, paymentAccount)

    const web3Name1ReleaseExt = api.tx.web3Names.releaseByOwner()
    const web3Name2ClaimExt = api.tx.web3Names.claim('test-2')
    const tx = await Did.authorizeBatch({
      batchFunction: api.tx.utility.batch,
      did: fullDid.id,
      extrinsics: [web3Name1ReleaseExt, web3Name2ClaimExt],
      signers: await key.getSigners(fullDid),
      submitter: paymentAccount.address,
    })
    await submitTx(tx, paymentAccount)

    // Test for correct creation and deletion
    const encoded1 = await api.call.did.queryByWeb3Name('test-1')
    expect(encoded1.isSome).toBe(false)
    // Test for correct creation of second web3 name
    const encoded2 = await api.call.did.queryByWeb3Name('test-2')
    expect(Did.linkedInfoFromChain(encoded2).document.id).toStrictEqual(
      fullDid.id
    )
  }, 30_000)

  it('can batch extrinsics for different required key types', async () => {
    // Authentication key
    const web3NameReleaseExt = api.tx.web3Names.releaseByOwner()
    // Attestation key
    const ctype1 = CType.fromProperties(UUID.generate(), {})
    const ctype1Creation = api.tx.ctype.add(CType.toChain(ctype1))
    // Delegation key
    const rootNode = DelegationNode.newRoot({
      account: fullDid.id,
      permissions: [Permission.DELEGATE],
      cTypeHash: CType.idToHash(ctype1.$id),
    })
    const delegationHierarchyCreation = await rootNode.getStoreTx()

    // Authentication key
    const web3NameNewClaimExt = api.tx.web3Names.claim('test-2')
    // Attestation key
    const ctype2 = CType.fromProperties(UUID.generate(), {})
    const ctype2Creation = api.tx.ctype.add(CType.toChain(ctype2))
    // Delegation key
    const delegationHierarchyRemoval = await rootNode.getRevokeTx(fullDid.id)

    const batchedExtrinsics = await Did.authorizeBatch({
      batchFunction: api.tx.utility.batchAll,
      did: fullDid.id,
      extrinsics: [
        web3NameReleaseExt,
        ctype1Creation,
        delegationHierarchyCreation,
        web3NameNewClaimExt,
        ctype2Creation,
        delegationHierarchyRemoval,
      ],
      signers: await key.getSigners(fullDid),
      submitter: paymentAccount.address,
    })

    await submitTx(batchedExtrinsics, paymentAccount)

    // Test correct use of authentication keys
    const encoded = await api.call.did.queryByWeb3Name('test')
    expect(encoded.isSome).toBe(false)

    const {
      document: { id },
    } = Did.linkedInfoFromChain(await api.call.did.queryByWeb3Name('test-2'))
    expect(id).toStrictEqual(fullDid.id)

    // Test correct use of attestation keys
    await expect(CType.verifyStored(ctype1)).resolves.not.toThrow()
    await expect(CType.verifyStored(ctype2)).resolves.not.toThrow()

    // Test correct use of delegation keys
    const node = await DelegationNode.fetch(rootNode.id)
    expect(node.revoked).toBe(true)
  })
})

describe('Runtime constraints', () => {
  let testAuthKey: Did.NewDidVerificationKey
  let storeDidSigner: SignerInterface
  beforeAll(async () => {
    const tool = await makeSigningKeyTool('ed25519')
    testAuthKey = {
      publicKey: tool.keypair.publicKey,
      type: 'ed25519',
    }
    storeDidSigner = tool.storeDidSigner
  })
  describe('DID creation', () => {
    it('should not be possible to create a DID with too many encryption keys', async () => {
      // Maximum is 10
      const newKeyAgreementKeys = Array(10).map(
        (_, index): Did.NewDidEncryptionKey => ({
          publicKey: Uint8Array.from(new Array(32).fill(index)),
          type: 'x25519',
        })
      )
      await Did.getStoreTx(
        {
          authentication: [testAuthKey],
          keyAgreement: newKeyAgreementKeys,
        },
        paymentAccount.address,
        [storeDidSigner]
      )
      // One more than the maximum
      newKeyAgreementKeys.push({
        publicKey: Uint8Array.from(new Array(32).fill(100)),
        type: 'x25519',
      })
      await expect(
        Did.getStoreTx(
          {
            authentication: [testAuthKey],
            keyAgreement: newKeyAgreementKeys,
          },

          paymentAccount.address,
          [storeDidSigner]
        )
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"The number of key agreement keys in the creation operation is greater than the maximum allowed, which is 10"`
      )
    }, 30_000)

    it('should not be possible to create a DID with too many services', async () => {
      // MaxgetStoreTx
      const newServiceEndpoints = Array(25).map(
        (_, index): Did.NewService => ({
          id: `#service-${index}`,
          type: [`type-${index}`],
          serviceEndpoint: [`x:url-${index}`],
        })
      )
      await Did.getStoreTx(
        {
          authentication: [testAuthKey],
          service: newServiceEndpoints,
        },
        paymentAccount.address,
        [storeDidSigner]
      )
      // One more than the maximum
      newServiceEndpoints.push({
        id: '#service-100',
        type: ['type-100'],
        serviceEndpoint: ['x:url-100'],
      })
      await expect(
        Did.getStoreTx(
          {
            authentication: [testAuthKey],
            service: newServiceEndpoints,
          },

          paymentAccount.address,
          [storeDidSigner]
        )
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Cannot store more than 25 services per DID"`
      )
    }, 30_000)

    it('should not be possible to create a DID with a service that is too long', async () => {
      const serviceId = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
      const limit = api.consts.did.maxServiceIdLength.toNumber()
      expect(serviceId.length).toBeGreaterThan(limit)
    })

    it('should not be possible to create a DID with a service that has too many types', async () => {
      const types = ['type-1', 'type-2']
      const limit = api.consts.did.maxNumberOfTypesPerService.toNumber()
      expect(types.length).toBeGreaterThan(limit)
    })

    it('should not be possible to create a DID with a service that has too many URIs', async () => {
      const uris = ['x:url-1', 'x:url-2', 'x:url-3']
      const limit = api.consts.did.maxNumberOfUrlsPerService.toNumber()
      expect(uris.length).toBeGreaterThan(limit)
    })

    it('should not be possible to create a DID with a service that has a type that is too long', async () => {
      const type = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
      const limit = api.consts.did.maxServiceTypeLength.toNumber()
      expect(type.length).toBeGreaterThan(limit)
    })

    it('should not be possible to create a DID with a service that has a URI that is too long', async () => {
      const uri =
        'a:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
      const limit = api.consts.did.maxServiceUrlLength.toNumber()
      expect(uri.length).toBeGreaterThan(limit)
    })
  })
})

afterAll(async () => {
  await disconnect()
})
