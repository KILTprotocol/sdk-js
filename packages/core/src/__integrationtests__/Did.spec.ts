/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
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
import {
  createFullDidFromSeed,
  createMinimalLightDidFromKeypair,
  KeyTool,
  makeEncryptionKeyTool,
  makeSigningKeyTool,
} from '@kiltprotocol/testing'
import {
  DidDocument,
  DidResolutionResult,
  DidServiceEndpoint,
  KiltKeyringPair,
  NewDidEncryptionKey,
  NewDidVerificationKey,
  NewLightDidVerificationKey,
  Permission,
  SignCallback,
} from '@kiltprotocol/types'
import { UUID } from '@kiltprotocol/utils'

import * as CType from '../ctype'
import { disconnect } from '../kilt'
import {
  createEndowedTestAccount,
  devBob,
  initializeApi,
  submitTx,
} from './utils'
import { DelegationNode } from '../delegation'

let paymentAccount: KiltKeyringPair
let api: ApiPromise

beforeAll(async () => {
  api = await initializeApi()
}, 30_000)

beforeAll(async () => {
  paymentAccount = await createEndowedTestAccount()
}, 30_000)

it('fetches the correct deposit amount', async () => {
  const depositAmount = api.consts.did.deposit.toBn()
  expect(depositAmount.toString()).toMatchInlineSnapshot('"2007900000000000"')
})

describe('write and didDeleteTx', () => {
  let did: DidDocument
  let key: KeyTool
  let signCallback: SignCallback

  beforeAll(async () => {
    key = makeSigningKeyTool()
    did = await createMinimalLightDidFromKeypair(key.keypair)
    signCallback = key.getSignCallback(did)
  })

  it('fails to create a new DID on chain with a different submitter than the one in the creation operation', async () => {
    const otherAccount = devBob
    const tx = await Did.getStoreTx(
      did,
      otherAccount.address,
      key.storeDidCallback
    )

    await expect(submitTx(tx, paymentAccount)).rejects.toMatchObject({
      isBadOrigin: true,
    })
  }, 60_000)

  it('writes a new DID record to chain', async () => {
    const newDid = Did.createLightDidDocument({
      authentication: did.authentication as [NewLightDidVerificationKey],
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

    const tx = await Did.getStoreTx(
      newDid,
      paymentAccount.address,
      key.storeDidCallback
    )

    await submitTx(tx, paymentAccount)

    const fullDidUri = Did.getFullDidUri(newDid.uri)
    const fullDidLinkedInfo = await api.call.did.query(Did.toChain(fullDidUri))
    const { document: fullDid } = Did.linkedInfoFromChain(fullDidLinkedInfo)

    expect(fullDid).toMatchObject(<DidDocument>{
      uri: fullDidUri,
      authentication: [
        expect.objectContaining({
          // We cannot match the ID of the key because it will be defined by the blockchain while saving
          publicKey: newDid.authentication[0].publicKey,
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
    const emptyDid = Did.getFullDidUriFromKey(
      makeSigningKeyTool().authentication[0]
    )

    const encodedDid = Did.toChain(emptyDid)
    expect((await api.call.did.query(encodedDid)).isSome).toBe(false)
  })

  it('fails to delete the DID using a different submitter than the one specified in the DID operation or using a services count that is too low', async () => {
    // We verify that the DID to delete is on chain.
    const fullDidLinkedInfo = await api.call.did.query(
      Did.toChain(Did.getFullDidUri(did.uri))
    )
    const { document: fullDid } = Did.linkedInfoFromChain(fullDidLinkedInfo)
    expect(fullDid).not.toBeNull()

    const otherAccount = devBob

    // 10 is an example value. It is not used here since we are testing another error
    let call = api.tx.did.delete(new BN(10))

    let submittable = await Did.authorizeTx(
      fullDid.uri,
      call,
      signCallback,
      // Use a different account than the submitter one
      otherAccount.address
    )

    await expect(submitTx(submittable, paymentAccount)).rejects.toMatchObject({
      section: 'did',
      name: 'BadDidOrigin',
    })

    // We use 1 here and this should fail as there are two service endpoints stored.
    call = api.tx.did.delete(new BN(1))

    submittable = await Did.authorizeTx(
      fullDid.uri,
      call,
      signCallback,
      paymentAccount.address
    )

    // Will fail because count provided is too low
    await expect(submitTx(submittable, paymentAccount)).rejects.toMatchObject({
      section: 'did',
      name: 'StoredEndpointsCountTooLarge',
    })
  }, 60_000)

  it('deletes DID from previous step', async () => {
    // We verify that the DID to delete is on chain.
    const fullDidLinkedInfo = await api.call.did.query(
      Did.toChain(Did.getFullDidUri(did.uri))
    )
    const { document: fullDid } = Did.linkedInfoFromChain(fullDidLinkedInfo)
    expect(fullDid).not.toBeNull()

    const encodedDid = Did.toChain(fullDid.uri)
    const linkedInfo = Did.linkedInfoFromChain(
      await api.call.did.query(encodedDid)
    )
    const storedEndpointsCount = linkedInfo.document.service?.length ?? 0
    const call = api.tx.did.delete(storedEndpointsCount)

    const submittable = await Did.authorizeTx(
      fullDid.uri,
      call,
      signCallback,
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
  const { keypair, getSignCallback, storeDidCallback } = makeSigningKeyTool()
  const newDid = await createMinimalLightDidFromKeypair(keypair)

  const tx = await Did.getStoreTx(
    newDid,
    paymentAccount.address,
    storeDidCallback
  )

  await submitTx(tx, paymentAccount)

  // This will better be handled once we have the UpdateBuilder class, which encapsulates all the logic.
  let fullDidLinkedInfo = await api.call.did.query(
    Did.toChain(Did.getFullDidUri(newDid.uri))
  )
  let { document: fullDid } = Did.linkedInfoFromChain(fullDidLinkedInfo)

  const newKey = makeSigningKeyTool()

  const updateAuthenticationKeyCall = api.tx.did.setAuthenticationKey(
    Did.publicKeyToChain(newKey.authentication[0])
  )
  const tx2 = await Did.authorizeTx(
    fullDid.uri,
    updateAuthenticationKeyCall,
    getSignCallback(fullDid),
    paymentAccount.address
  )
  await submitTx(tx2, paymentAccount)

  // Authentication key changed, so did must be updated.
  // Also this will better be handled once we have the UpdateBuilder class, which encapsulates all the logic.
  fullDidLinkedInfo = await api.call.did.query(
    Did.toChain(Did.getFullDidUri(newDid.uri))
  )
  fullDid = Did.linkedInfoFromChain(fullDidLinkedInfo).document

  // Add a new service endpoint
  const newEndpoint: DidServiceEndpoint = {
    id: '#new-endpoint',
    type: ['new-type'],
    serviceEndpoint: ['x:new-url'],
  }
  const updateEndpointCall = api.tx.did.addServiceEndpoint(
    Did.serviceToChain(newEndpoint)
  )

  const tx3 = await Did.authorizeTx(
    fullDid.uri,
    updateEndpointCall,
    newKey.getSignCallback(fullDid),
    paymentAccount.address
  )
  await submitTx(tx3, paymentAccount)

  const encodedDid = Did.toChain(fullDid.uri)
  const linkedInfo = Did.linkedInfoFromChain(
    await api.call.did.query(encodedDid)
  )
  expect(Did.getService(linkedInfo.document, newEndpoint.id)).toStrictEqual(
    newEndpoint
  )

  // Delete the added service endpoint
  const removeEndpointCall = api.tx.did.removeServiceEndpoint(
    Did.resourceIdToChain(newEndpoint.id)
  )
  const tx4 = await Did.authorizeTx(
    fullDid.uri,
    removeEndpointCall,
    newKey.getSignCallback(fullDid),
    paymentAccount.address
  )
  await submitTx(tx4, paymentAccount)

  // There should not be any endpoint with the given ID now.
  const linkedInfo2 = Did.linkedInfoFromChain(
    await api.call.did.query(encodedDid)
  )
  expect(Did.getService(linkedInfo2.document, newEndpoint.id)).toBe(undefined)

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
    const { storeDidCallback, authentication } = makeSigningKeyTool('ed25519')
    const { keyAgreement } = makeEncryptionKeyTool(
      '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
    )
    const lightDid = Did.createLightDidDocument({
      authentication,
      keyAgreement,
    })

    const storeTx = await Did.getStoreTx(
      lightDid,
      paymentAccount.address,
      storeDidCallback
    )

    await submitTx(storeTx, paymentAccount)
    const migratedFullDidUri = Did.getFullDidUri(lightDid.uri)
    const migratedFullDidLinkedInfo = await api.call.did.query(
      Did.toChain(migratedFullDidUri)
    )
    const { document: migratedFullDid } = Did.linkedInfoFromChain(
      migratedFullDidLinkedInfo
    )

    expect(migratedFullDid).toMatchObject(<DidDocument>{
      uri: migratedFullDidUri,
      authentication: [
        expect.objectContaining({
          publicKey: lightDid.authentication[0].publicKey,
          type: 'ed25519',
        }),
      ],
      keyAgreement: [
        expect.objectContaining({
          publicKey: lightDid.keyAgreement?.[0].publicKey,
          type: 'x25519',
        }),
      ],
    })

    expect(
      (await api.call.did.query(Did.toChain(migratedFullDid.uri))).isSome
    ).toBe(true)

    const { metadata } = (await Did.resolve(
      lightDid.uri
    )) as DidResolutionResult

    expect(metadata.canonicalId).toStrictEqual(migratedFullDid.uri)
    expect(metadata.deactivated).toBe(false)
  })

  it('migrates light DID with sr25519 auth key', async () => {
    const { authentication, storeDidCallback } = makeSigningKeyTool()
    const lightDid = Did.createLightDidDocument({
      authentication,
    })

    const storeTx = await Did.getStoreTx(
      lightDid,
      paymentAccount.address,
      storeDidCallback
    )

    await submitTx(storeTx, paymentAccount)
    const migratedFullDidUri = Did.getFullDidUri(lightDid.uri)
    const migratedFullDidLinkedInfo = await api.call.did.query(
      Did.toChain(migratedFullDidUri)
    )
    const { document: migratedFullDid } = Did.linkedInfoFromChain(
      migratedFullDidLinkedInfo
    )

    expect(migratedFullDid).toMatchObject(<DidDocument>{
      uri: migratedFullDidUri,
      authentication: [
        expect.objectContaining({
          publicKey: lightDid.authentication[0].publicKey,
          type: 'sr25519',
        }),
      ],
    })

    expect(
      (await api.call.did.query(Did.toChain(migratedFullDid.uri))).isSome
    ).toBe(true)

    const { metadata } = (await Did.resolve(
      lightDid.uri
    )) as DidResolutionResult

    expect(metadata.canonicalId).toStrictEqual(migratedFullDid.uri)
    expect(metadata.deactivated).toBe(false)
  })

  it('migrates light DID with ed25519 auth key, encryption key, and service endpoints', async () => {
    const { storeDidCallback, authentication } = makeSigningKeyTool('ed25519')
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
    const lightDid = Did.createLightDidDocument({
      authentication,
      keyAgreement,
      service,
    })

    const storeTx = await Did.getStoreTx(
      lightDid,
      paymentAccount.address,
      storeDidCallback
    )

    await submitTx(storeTx, paymentAccount)
    const migratedFullDidUri = Did.getFullDidUri(lightDid.uri)
    const migratedFullDidLinkedInfo = await api.call.did.query(
      Did.toChain(migratedFullDidUri)
    )
    const { document: migratedFullDid } = Did.linkedInfoFromChain(
      migratedFullDidLinkedInfo
    )

    expect(migratedFullDid).toMatchObject(<DidDocument>{
      uri: migratedFullDidUri,
      authentication: [
        expect.objectContaining({
          publicKey: lightDid.authentication[0].publicKey,
          type: 'ed25519',
        }),
      ],
      keyAgreement: [
        expect.objectContaining({
          publicKey: lightDid.keyAgreement?.[0].publicKey,
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

    const encodedDid = Did.toChain(migratedFullDid.uri)
    expect((await api.call.did.query(encodedDid)).isSome).toBe(true)

    const { metadata } = (await Did.resolve(
      lightDid.uri
    )) as DidResolutionResult

    expect(metadata.canonicalId).toStrictEqual(migratedFullDid.uri)
    expect(metadata.deactivated).toBe(false)

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
  const { getSignCallback, storeDidCallback, authentication } =
    makeSigningKeyTool('ed25519')

  beforeAll(async () => {
    const createTx = await Did.getStoreTx(
      {
        authentication,
        assertionMethod: authentication,
        capabilityDelegation: authentication,
      },
      paymentAccount.address,
      storeDidCallback
    )
    await submitTx(createTx, paymentAccount)
    const didLinkedInfo = await api.call.did.query(
      Did.toChain(Did.getFullDidUriFromKey(authentication[0]))
    )
    did = Did.linkedInfoFromChain(didLinkedInfo).document
  }, 60_000)

  it('authorizes ctype creation with DID signature', async () => {
    const ctype = CType.fromProperties(UUID.generate(), {})
    const call = api.tx.ctype.add(CType.toChain(ctype))
    const tx = await Did.authorizeTx(
      did.uri,
      call,
      getSignCallback(did),
      paymentAccount.address
    )
    await submitTx(tx, paymentAccount)

    await expect(CType.verifyStored(ctype)).resolves.not.toThrow()
  }, 60_000)

  it('no longer authorizes ctype creation after DID deletion', async () => {
    const linkedInfo = Did.linkedInfoFromChain(
      await api.call.did.query(Did.toChain(did.uri))
    )
    const storedEndpointsCount = linkedInfo.document.service?.length ?? 0
    const deleteCall = api.tx.did.delete(storedEndpointsCount)
    const tx = await Did.authorizeTx(
      did.uri,
      deleteCall,
      getSignCallback(did),
      paymentAccount.address
    )
    await submitTx(tx, paymentAccount)

    const ctype = CType.fromProperties(UUID.generate(), {})
    const call = api.tx.ctype.add(CType.toChain(ctype))
    const tx2 = await Did.authorizeTx(
      did.uri,
      call,
      getSignCallback(did),
      paymentAccount.address
    )
    await expect(submitTx(tx2, paymentAccount)).rejects.toMatchObject({
      section: 'did',
      name: 'DidNotPresent',
    })

    await expect(CType.verifyStored(ctype)).rejects.toThrow()
  }, 60_000)
})

describe('DID management batching', () => {
  describe('FullDidCreationBuilder', () => {
    it('Build a complete full DID', async () => {
      const { keypair, storeDidCallback, authentication } = makeSigningKeyTool()
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
        storeDidCallback
      )
      await submitTx(extrinsic, paymentAccount)
      const fullDidLinkedInfo = await api.call.did.query(
        Did.toChain(Did.getFullDidUriFromKey(authentication[0]))
      )
      const { document: fullDid } = Did.linkedInfoFromChain(fullDidLinkedInfo)

      expect(fullDid).not.toBeNull()
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
      const { keypair, storeDidCallback } = makeSigningKeyTool('ecdsa')
      const didAuthKey: NewDidVerificationKey = {
        publicKey: keypair.publicKey,
        type: 'ecdsa',
      }

      const extrinsic = await Did.getStoreTx(
        { authentication: [didAuthKey] },
        paymentAccount.address,
        storeDidCallback
      )
      await submitTx(extrinsic, paymentAccount)

      const fullDidLinkedInfo = await api.call.did.query(
        Did.toChain(Did.getFullDidUriFromKey(didAuthKey))
      )
      const { document: fullDid } = Did.linkedInfoFromChain(fullDidLinkedInfo)

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
      const { keypair, getSignCallback, storeDidCallback, authentication } =
        makeSigningKeyTool()

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
        storeDidCallback
      )
      await submitTx(createTx, paymentAccount)

      const initialFullDidLinkedInfo = await api.call.did.query(
        Did.toChain(Did.getFullDidUriFromKey(authentication[0]))
      )
      const { document: initialFullDid } = Did.linkedInfoFromChain(
        initialFullDidLinkedInfo
      )

      const encryptionKeys = initialFullDid.keyAgreement
      if (!encryptionKeys) throw new Error('No key agreement keys')

      const extrinsic = await Did.authorizeBatch({
        batchFunction: api.tx.utility.batchAll,
        did: initialFullDid.uri,
        extrinsics: [
          api.tx.did.removeKeyAgreementKey(
            Did.resourceIdToChain(encryptionKeys[0].id)
          ),
          api.tx.did.removeKeyAgreementKey(
            Did.resourceIdToChain(encryptionKeys[1].id)
          ),
          api.tx.did.removeAttestationKey(),
          api.tx.did.removeDelegationKey(),
          api.tx.did.removeServiceEndpoint('id-1'),
          api.tx.did.removeServiceEndpoint('id-2'),
        ],
        sign: getSignCallback(initialFullDid),
        submitter: paymentAccount.address,
      })
      await submitTx(extrinsic, paymentAccount)

      const finalFullDidLinkedInfo = await api.call.did.query(
        Did.toChain(initialFullDid.uri)
      )
      const { document: finalFullDid } = Did.linkedInfoFromChain(
        finalFullDidLinkedInfo
      )

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
      const { authentication, getSignCallback, storeDidCallback } =
        makeSigningKeyTool()
      const {
        authentication: [newAuthKey],
      } = makeSigningKeyTool('ed25519')

      const createTx = await Did.getStoreTx(
        { authentication },
        paymentAccount.address,
        storeDidCallback
      )
      await submitTx(createTx, paymentAccount)

      const initialFullDidLinkedInfo = await api.call.did.query(
        Did.toChain(Did.getFullDidUriFromKey(authentication[0]))
      )
      const { document: initialFullDid } = Did.linkedInfoFromChain(
        initialFullDidLinkedInfo
      )

      const extrinsic = await Did.authorizeBatch({
        batchFunction: api.tx.utility.batchAll,
        did: initialFullDid.uri,
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
        sign: getSignCallback(initialFullDid),
        submitter: paymentAccount.address,
      })

      await submitTx(extrinsic, paymentAccount)

      const finalFullDidLinkedInfo = await api.call.did.query(
        Did.toChain(initialFullDid.uri)
      )
      const { document: finalFullDid } = Did.linkedInfoFromChain(
        finalFullDidLinkedInfo
      )

      expect(finalFullDid).not.toBeNull()

      expect(finalFullDid.authentication[0]).toMatchObject({
        publicKey: newAuthKey.publicKey,
        type: newAuthKey.type,
      })

      expect(finalFullDid.keyAgreement).toBeUndefined()
      expect(finalFullDid.assertionMethod).toBeUndefined()
      expect(finalFullDid.capabilityDelegation).toBeUndefined()
      expect(finalFullDid.service).toHaveLength(2)
    }, 40_000)

    it('simple `batch` succeeds despite failures of some extrinsics', async () => {
      const { authentication, getSignCallback, storeDidCallback } =
        makeSigningKeyTool()
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
        storeDidCallback
      )
      // Create the full DID with a service endpoint
      await submitTx(tx, paymentAccount)
      const fullDidLinkedInfo = await api.call.did.query(
        Did.toChain(Did.getFullDidUriFromKey(authentication[0]))
      )
      const { document: fullDid } = Did.linkedInfoFromChain(fullDidLinkedInfo)

      expect(fullDid.assertionMethod).toBeUndefined()

      // Try to set a new attestation key and a duplicate service endpoint
      const updateTx = await Did.authorizeBatch({
        batchFunction: api.tx.utility.batch,
        did: fullDid.uri,
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
        sign: getSignCallback(fullDid),
        submitter: paymentAccount.address,
      })
      // Now the second operation fails but the batch succeeds
      await submitTx(updateTx, paymentAccount)

      const updatedFullDidLinkedInfo = await api.call.did.query(
        Did.toChain(fullDid.uri)
      )
      const { document: updatedFullDid } = Did.linkedInfoFromChain(
        updatedFullDidLinkedInfo
      )

      // .setAttestationKey() extrinsic went through in the batch
      expect(updatedFullDid.assertionMethod?.[0]).toBeDefined()
      // The service endpoint will match the one manually added, and not the one set in the batch
      expect(
        Did.getService(updatedFullDid, '#id-1')
      ).toStrictEqual<DidServiceEndpoint>({
        id: '#id-1',
        type: ['type-1'],
        serviceEndpoint: ['x:url-1'],
      })
    }, 60_000)

    it('batchAll fails if any extrinsics fails', async () => {
      const { authentication, getSignCallback, storeDidCallback } =
        makeSigningKeyTool()
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
        storeDidCallback
      )
      await submitTx(createTx, paymentAccount)
      const fullDidLinkedInfo = await api.call.did.query(
        Did.toChain(Did.getFullDidUriFromKey(authentication[0]))
      )
      const { document: fullDid } = Did.linkedInfoFromChain(fullDidLinkedInfo)

      expect(fullDid.assertionMethod).toBeUndefined()

      // Use batchAll to set a new attestation key and a duplicate service endpoint
      const updateTx = await Did.authorizeBatch({
        batchFunction: api.tx.utility.batchAll,
        did: fullDid.uri,
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
        sign: getSignCallback(fullDid),
        submitter: paymentAccount.address,
      })

      // Now, submitting will result in the second operation to fail AND the batch to fail, so we can test the atomic flag.
      await expect(submitTx(updateTx, paymentAccount)).rejects.toMatchObject({
        section: 'did',
        name: 'ServiceAlreadyPresent',
      })

      const updatedFullDidLinkedInfo = await api.call.did.query(
        Did.toChain(fullDid.uri)
      )
      const { document: updatedFullDid } = Did.linkedInfoFromChain(
        updatedFullDidLinkedInfo
      )
      // .setAttestationKey() extrinsic went through but it was then reverted
      expect(updatedFullDid.assertionMethod).toBeUndefined()
      // The service endpoint will match the one manually added, and not the one set in the builder.
      expect(
        Did.getService(updatedFullDid, '#id-1')
      ).toStrictEqual<DidServiceEndpoint>({
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
    key = makeSigningKeyTool()
    fullDid = await createFullDidFromSeed(paymentAccount, key.keypair)
  }, 50_000)

  it('simple batch succeeds despite failures of some extrinsics', async () => {
    const ctype = CType.fromProperties(UUID.generate(), {})
    const ctypeStoreTx = api.tx.ctype.add(CType.toChain(ctype))
    const rootNode = DelegationNode.newRoot({
      account: fullDid.uri,
      permissions: [Permission.DELEGATE],
      cTypeHash: CType.idToHash(ctype.$id),
    })
    const delegationStoreTx = await rootNode.getStoreTx()
    const delegationRevocationTx = await rootNode.getRevokeTx(fullDid.uri)
    const tx = await Did.authorizeBatch({
      batchFunction: api.tx.utility.batch,
      did: fullDid.uri,
      extrinsics: [
        ctypeStoreTx,
        // Will fail since the delegation cannot be revoked before it is added
        delegationRevocationTx,
        delegationStoreTx,
      ],
      sign: key.getSignCallback(fullDid),
      submitter: paymentAccount.address,
    })

    // The entire submission promise is resolves and does not throw
    await submitTx(tx, paymentAccount)

    // The ctype has been created, even though the delegation operations failed.
    await expect(CType.verifyStored(ctype)).resolves.not.toThrow()
  })

  it('batchAll fails if any extrinsics fail', async () => {
    const ctype = CType.fromProperties(UUID.generate(), {})
    const ctypeStoreTx = api.tx.ctype.add(CType.toChain(ctype))
    const rootNode = DelegationNode.newRoot({
      account: fullDid.uri,
      permissions: [Permission.DELEGATE],
      cTypeHash: CType.idToHash(ctype.$id),
    })
    const delegationStoreTx = await rootNode.getStoreTx()
    const delegationRevocationTx = await rootNode.getRevokeTx(fullDid.uri)
    const tx = await Did.authorizeBatch({
      batchFunction: api.tx.utility.batchAll,
      did: fullDid.uri,
      extrinsics: [
        ctypeStoreTx,
        // Will fail since the delegation cannot be revoked before it is added
        delegationRevocationTx,
        delegationStoreTx,
      ],
      sign: key.getSignCallback(fullDid),
      submitter: paymentAccount.address,
    })

    // The entire submission promise is rejected and throws.
    await expect(submitTx(tx, paymentAccount)).rejects.toMatchObject({
      section: 'delegation',
      name: 'DelegationNotFound',
    })

    // The ctype has not been created, since atomicity ensures the whole batch is reverted in case of failure.
    await expect(CType.verifyStored(ctype)).rejects.toThrow()
  })

  it('can batch extrinsics for the same required key type', async () => {
    const web3NameClaimTx = api.tx.web3Names.claim('test-1')
    const authorizedTx = await Did.authorizeTx(
      fullDid.uri,
      web3NameClaimTx,
      key.getSignCallback(fullDid),
      paymentAccount.address
    )
    await submitTx(authorizedTx, paymentAccount)

    const web3Name1ReleaseExt = api.tx.web3Names.releaseByOwner()
    const web3Name2ClaimExt = api.tx.web3Names.claim('test-2')
    const tx = await Did.authorizeBatch({
      batchFunction: api.tx.utility.batch,
      did: fullDid.uri,
      extrinsics: [web3Name1ReleaseExt, web3Name2ClaimExt],
      sign: key.getSignCallback(fullDid),
      submitter: paymentAccount.address,
    })
    await submitTx(tx, paymentAccount)

    // Test for correct creation and deletion
    const encoded1 = await api.call.did.queryByWeb3Name('test-1')
    expect(encoded1.isSome).toBe(false)
    // Test for correct creation of second web3 name
    const encoded2 = await api.call.did.queryByWeb3Name('test-2')
    expect(Did.linkedInfoFromChain(encoded2).document.uri).toStrictEqual(
      fullDid.uri
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
      account: fullDid.uri,
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
    const delegationHierarchyRemoval = await rootNode.getRevokeTx(fullDid.uri)

    const batchedExtrinsics = await Did.authorizeBatch({
      batchFunction: api.tx.utility.batchAll,
      did: fullDid.uri,
      extrinsics: [
        web3NameReleaseExt,
        ctype1Creation,
        delegationHierarchyCreation,
        web3NameNewClaimExt,
        ctype2Creation,
        delegationHierarchyRemoval,
      ],
      sign: key.getSignCallback(fullDid),
      submitter: paymentAccount.address,
    })

    await submitTx(batchedExtrinsics, paymentAccount)

    // Test correct use of authentication keys
    const encoded = await api.call.did.queryByWeb3Name('test')
    expect(encoded.isSome).toBe(false)

    const {
      document: { uri },
    } = Did.linkedInfoFromChain(await api.call.did.queryByWeb3Name('test-2'))
    expect(uri).toStrictEqual(fullDid.uri)

    // Test correct use of attestation keys
    await expect(CType.verifyStored(ctype1)).resolves.not.toThrow()
    await expect(CType.verifyStored(ctype2)).resolves.not.toThrow()

    // Test correct use of delegation keys
    const node = await DelegationNode.fetch(rootNode.id)
    expect(node.revoked).toBe(true)
  })
})

describe('Runtime constraints', () => {
  let testAuthKey: NewDidVerificationKey
  const { keypair, storeDidCallback } = makeSigningKeyTool('ed25519')

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
      await Did.getStoreTx(
        {
          authentication: [testAuthKey],
          keyAgreement: newKeyAgreementKeys,
        },
        paymentAccount.address,
        storeDidCallback
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
          storeDidCallback
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
      await Did.getStoreTx(
        {
          authentication: [testAuthKey],
          service: newServiceEndpoints,
        },
        paymentAccount.address,
        storeDidCallback
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
          storeDidCallback
        )
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Cannot store more than 25 service endpoints per DID"`
      )
    }, 30_000)

    it('should not be possible to create a DID with a service endpoint that is too long', async () => {
      const serviceId = '#aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
      const limit = api.consts.did.maxServiceIdLength.toNumber()
      expect(serviceId.length).toBeGreaterThan(limit)
    })

    it('should not be possible to create a DID with a service endpoint that has too many types', async () => {
      const types = ['type-1', 'type-2']
      const limit = api.consts.did.maxNumberOfTypesPerService.toNumber()
      expect(types.length).toBeGreaterThan(limit)
    })

    it('should not be possible to create a DID with a service endpoint that has too many URIs', async () => {
      const uris = ['x:url-1', 'x:url-2']
      const limit = api.consts.did.maxNumberOfUrlsPerService.toNumber()
      expect(uris.length).toBeGreaterThan(limit)
    })

    it('should not be possible to create a DID with a service endpoint that has a type that is too long', async () => {
      const type = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
      const limit = api.consts.did.maxServiceTypeLength.toNumber()
      expect(type.length).toBeGreaterThan(limit)
    })

    it('should not be possible to create a DID with a service endpoint that has a URI that is too long', async () => {
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
