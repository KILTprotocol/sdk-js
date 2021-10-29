/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group integration/did
 */

import { UUID } from '@kiltprotocol/utils'
import { encodeAddress } from '@polkadot/keyring'
import {
  DemoKeystore,
  DidChain,
  DidTypes,
  DidUtils,
  SigningAlgorithms,
  EncryptionAlgorithms,
  LightDidDetails,
  resolveDoc,
} from '@kiltprotocol/did'
import {
  BlockchainUtils,
  BlockchainApiConnection,
} from '@kiltprotocol/chain-helpers'
import {
  KeyRelationship,
  IDidServiceEndpoint,
  KeyringPair,
  KeystoreSigner,
} from '@kiltprotocol/types'
import { BN } from '@polkadot/util'
import { disconnect, init } from '../kilt'

import { CType } from '../ctype'
import { devAlice, devBob } from './utils'

let paymentAccount: KeyringPair
const keystore = new DemoKeystore()

beforeAll(async () => {
  await init({ address: 'ws://localhost:9944' })
  paymentAccount = devAlice
})

describe('write and didDeleteTx', () => {
  let didIdentifier: string
  let key: DidTypes.INewPublicKey
  beforeAll(async () => {
    const { publicKey, alg } = await keystore.generateKeypair({
      alg: SigningAlgorithms.Ed25519,
    })
    didIdentifier = encodeAddress(publicKey, 38)
    key = { publicKey, type: alg }
  })

  it('fails to create a new DID on chain with a different submitter than the one in the creation operation', async () => {
    const otherAccount = devBob
    const tx = await DidChain.generateCreateTx({
      didIdentifier,
      signer: keystore as KeystoreSigner<string>,
      // A different address than the one submitting the tx (paymentAccount) is specified
      submitter: otherAccount.address,
      signingPublicKey: key.publicKey,
      alg: key.type,
    })

    await expect(
      BlockchainUtils.signAndSubmitTx(tx, paymentAccount, {
        resolveOn: BlockchainUtils.IS_IN_BLOCK,
        reSign: true,
      })
    ).rejects.toThrow()
  }, 30_000)

  it('writes a new DID record to chain', async () => {
    const tx = await DidChain.generateCreateTx({
      didIdentifier,
      signer: keystore as KeystoreSigner<string>,
      submitter: paymentAccount.address,
      signingPublicKey: key.publicKey,
      alg: key.type,
      endpoints: [
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

    const did = DidUtils.getKiltDidFromIdentifier(didIdentifier, 'full')

    await expect(
      BlockchainUtils.signAndSubmitTx(tx, paymentAccount, {
        resolveOn: BlockchainUtils.IS_IN_BLOCK,
        reSign: true,
      })
    ).resolves.not.toThrow()

    await expect(DidChain.queryDidDetails(did)).resolves.toMatchObject<
      Partial<DidTypes.IDidChainRecordJSON>
    >({
      did,
    })
    await expect(DidChain.queryServiceEndpoints(did)).resolves.toMatchObject<
      IDidServiceEndpoint[]
    >([
      {
        id: `${did}#test-id-1`,
        types: ['test-type-1'],
        urls: ['test-url-1'],
      },
      {
        id: `${did}#test-id-2`,
        types: ['test-type-2'],
        urls: ['test-url-2'],
      },
    ])
    await expect(
      DidChain.queryServiceEndpoint(
        `${DidUtils.getKiltDidFromIdentifier(didIdentifier, 'full')}#test-id-1`
      )
    ).resolves.toMatchObject<IDidServiceEndpoint>({
      id: `${did}#test-id-1`,
      types: ['test-type-1'],
      urls: ['test-url-1'],
    })
    // Test that the negative results are also properly returned
    const emptyDid = DidUtils.getKiltDidFromIdentifier(
      paymentAccount.address,
      'full'
    )
    // Should be defined and have 0 elements
    await expect(
      DidChain.queryServiceEndpoints(emptyDid)
    ).resolves.toBeDefined()
    await expect(
      DidChain.queryServiceEndpoints(emptyDid)
    ).resolves.toHaveLength(0)
    // Should return null
    await expect(
      DidChain.queryServiceEndpoint(`${emptyDid}#non-existing-service-id`)
    ).resolves.toBeNull
  }, 30_000)

  it('fails to delete the DID using a different submitter than the one specified in the DID operation', async () => {
    const otherAccount = devBob

    // 10 is an example value. It is not used here since we are testing the error
    const call = await DidChain.getDeleteDidExtrinsic(10)

    const submittable = await DidChain.generateDidAuthenticatedTx({
      didIdentifier,
      txCounter: 1,
      call,
      signer: keystore as KeystoreSigner<string>,
      signingPublicKey: key.publicKey,
      alg: key.type,
      // Use a different account than the submitter one
      submitter: otherAccount.address,
    })

    await expect(
      BlockchainUtils.signAndSubmitTx(submittable, paymentAccount, {
        resolveOn: BlockchainUtils.IS_IN_BLOCK,
        reSign: true,
      })
    ).rejects.toThrow()
  })

  it('deletes DID from previous step', async () => {
    const did = DidUtils.getKiltDidFromIdentifier(didIdentifier, 'full')
    await expect(DidChain.queryById(didIdentifier)).resolves.toMatchObject<
      Partial<DidTypes.IDidChainRecordJSON>
    >({
      did: DidUtils.getKiltDidFromIdentifier(didIdentifier, 'full'),
    })

    const storedEndpointsCount = await DidChain.queryEndpointsCounts(did)
    const call = await DidChain.getDeleteDidExtrinsic(storedEndpointsCount)

    const submittable = await DidChain.generateDidAuthenticatedTx({
      didIdentifier,
      txCounter: 1,
      call,
      signer: keystore as KeystoreSigner<string>,
      signingPublicKey: key.publicKey,
      alg: key.type,
      submitter: paymentAccount.address,
    })

    await expect(
      BlockchainUtils.signAndSubmitTx(submittable, paymentAccount, {
        resolveOn: BlockchainUtils.IS_IN_BLOCK,
        reSign: true,
      })
    ).resolves.not.toThrow()

    await expect(DidChain.queryById(didIdentifier)).resolves.toBe(null)
  }, 30_000)
})

it('creates and updates DID, and then reclaims the deposit back', async () => {
  const { publicKey, alg } = await keystore.generateKeypair({
    alg: SigningAlgorithms.Ed25519,
  })
  const didIdentifier = encodeAddress(publicKey, 38)
  const did = DidUtils.getKiltDidFromIdentifier(didIdentifier, 'full')
  const key: DidTypes.INewPublicKey = { publicKey, type: alg }

  const tx = await DidChain.generateCreateTx({
    didIdentifier,
    signer: keystore as KeystoreSigner<string>,
    submitter: paymentAccount.address,
    signingPublicKey: key.publicKey,
    alg: key.type,
  })

  await expect(
    BlockchainUtils.signAndSubmitTx(tx, paymentAccount, {
      resolveOn: BlockchainUtils.IS_IN_BLOCK,
      reSign: true,
    })
  ).resolves.not.toThrow()

  await expect(DidChain.queryById(didIdentifier)).resolves.toMatchObject<
    Partial<DidTypes.IDidChainRecordJSON>
  >({
    did: DidUtils.getKiltDidFromIdentifier(didIdentifier, 'full'),
  })

  const newKeypair = await keystore.generateKeypair({
    alg: SigningAlgorithms.Ed25519,
  })
  const newKeyDetails: DidTypes.INewPublicKey = {
    publicKey: newKeypair.publicKey,
    type: newKeypair.alg,
  }

  const updateAuthenticationKeyCall = await DidChain.getSetKeyExtrinsic(
    KeyRelationship.authentication,
    newKeyDetails
  )

  const tx2 = await DidChain.generateDidAuthenticatedTx({
    didIdentifier,
    txCounter: 1,
    call: updateAuthenticationKeyCall,
    signer: keystore as KeystoreSigner<string>,
    signingPublicKey: key.publicKey,
    alg: key.type,
    submitter: paymentAccount.address,
  })

  await expect(
    BlockchainUtils.signAndSubmitTx(tx2, paymentAccount, {
      resolveOn: BlockchainUtils.IS_IN_BLOCK,
      reSign: true,
    })
  ).resolves.not.toThrow()

  await expect(DidChain.queryById(didIdentifier)).resolves.toMatchObject<
    Partial<DidTypes.IDidChainRecordJSON>
  >({
    did: DidUtils.getKiltDidFromIdentifier(didIdentifier, 'full'),
  })

  // Add a new service endpoint
  const newEndpoint: IDidServiceEndpoint = {
    id: 'new-endpoint',
    types: ['new-type'],
    urls: ['new-url'],
  }
  const updateEndpointCall = await DidChain.getAddEndpointExtrinsic(newEndpoint)

  const tx3 = await DidChain.generateDidAuthenticatedTx({
    didIdentifier,
    txCounter: 2,
    call: updateEndpointCall,
    signer: keystore as KeystoreSigner<string>,
    signingPublicKey: newKeyDetails.publicKey,
    alg: newKeyDetails.type,
    submitter: paymentAccount.address,
  })
  await expect(
    BlockchainUtils.signAndSubmitTx(tx3, paymentAccount, {
      resolveOn: BlockchainUtils.IS_IN_BLOCK,
      reSign: true,
    })
  ).resolves.not.toThrow()
  await expect(
    DidChain.queryServiceEndpoint(`${did}#new-endpoint`)
  ).resolves.toMatchObject<IDidServiceEndpoint>({
    ...newEndpoint,
    id: `${did}#${newEndpoint.id}`,
  })

  // Delete the added service endpoint
  const removeEndpointCall = await DidChain.getRemoveEndpointExtrinsic(
    newEndpoint.id
  )

  const tx4 = await DidChain.generateDidAuthenticatedTx({
    didIdentifier,
    txCounter: 3,
    call: removeEndpointCall,
    signer: keystore as KeystoreSigner<string>,
    signingPublicKey: newKeyDetails.publicKey,
    alg: newKeyDetails.type,
    submitter: paymentAccount.address,
  })

  await expect(
    BlockchainUtils.signAndSubmitTx(tx4, paymentAccount, {
      resolveOn: BlockchainUtils.IS_IN_BLOCK,
      reSign: true,
    })
  ).resolves.not.toThrow()

  // There should not be any endpoint with the given ID now.
  await expect(
    DidChain.queryServiceEndpoint(`${did}#new-endpoint`)
  ).resolves.toBeNull()

  // Claim the deposit back
  const storedEndpointsCount = await DidChain.queryEndpointsCounts(did)
  const reclaimDepositTx = await DidChain.getReclaimDepositExtrinsic(
    didIdentifier,
    storedEndpointsCount
  )
  await expect(
    BlockchainUtils.signAndSubmitTx(reclaimDepositTx, paymentAccount, {
      resolveOn: BlockchainUtils.IS_IN_BLOCK,
      reSign: true,
    })
  ).resolves.not.toThrow()
  // Verify that the DID has been deleted
  await expect(DidChain.queryById(didIdentifier)).resolves.toBeNull()
  await expect(DidChain.queryServiceEndpoints(did)).resolves.toHaveLength(0)
  await expect(DidChain.queryEndpointsCounts(did)).resolves.toBe(0)
}, 80_000)

describe('DID migration', () => {
  it('migrates light DID with ed25519 auth key and encryption key', async () => {
    const didEd25519AuthenticationKeyDetails = await keystore.generateKeypair({
      alg: SigningAlgorithms.Ed25519,
    })
    const didEncryptionKeyDetails = await keystore.generateKeypair({
      seed:
        '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      alg: EncryptionAlgorithms.NaclBox,
    })
    const lightDidDetails = new LightDidDetails({
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
    const { extrinsic, did } = await DidUtils.upgradeDid(
      lightDidDetails,
      paymentAccount.address,
      keystore
    )

    await expect(
      BlockchainUtils.signAndSubmitTx(extrinsic, paymentAccount, {
        resolveOn: BlockchainUtils.IS_IN_BLOCK,
        reSign: true,
      })
    ).resolves.not.toThrow()

    await expect(
      DidChain.queryById(DidUtils.getIdentifierFromKiltDid(did))
    ).resolves.not.toBeNull()

    const resolutionResult = await resolveDoc(lightDidDetails.did)

    expect(resolutionResult).not.toBeNull()

    expect(resolutionResult?.metadata).toBeDefined()
    expect(resolutionResult?.metadata?.canonicalId).toStrictEqual(did)

    expect(resolutionResult?.details.did).toStrictEqual(lightDidDetails.did)
  })

  it('migrates light DID with sr25519 auth key', async () => {
    const didSr25519AuthenticationKeyDetails = await keystore.generateKeypair({
      alg: SigningAlgorithms.Sr25519,
    })
    const lightDidDetails = new LightDidDetails({
      authenticationKey: {
        publicKey: didSr25519AuthenticationKeyDetails.publicKey,
        type: DemoKeystore.getKeypairTypeForAlg(
          didSr25519AuthenticationKeyDetails.alg
        ),
      },
    })
    const { extrinsic, did } = await DidUtils.upgradeDid(
      lightDidDetails,
      paymentAccount.address,
      keystore
    )

    await expect(
      BlockchainUtils.signAndSubmitTx(extrinsic, paymentAccount, {
        resolveOn: BlockchainUtils.IS_IN_BLOCK,
        reSign: true,
      })
    ).resolves.not.toThrow()

    await expect(
      DidChain.queryById(DidUtils.getIdentifierFromKiltDid(did))
    ).resolves.not.toBeNull()

    const resolutionResult = await resolveDoc(lightDidDetails.did)

    expect(resolutionResult).not.toBeNull()

    expect(resolutionResult?.metadata).toBeDefined()
    expect(resolutionResult?.metadata?.canonicalId).toStrictEqual(did)

    expect(resolutionResult?.details.did).toStrictEqual(lightDidDetails.did)
  })
})

describe('DID authorization', () => {
  let didIdentifier: string
  let key: DidTypes.INewPublicKey
  let lastTxIndex = new BN(0)
  beforeAll(async () => {
    const { publicKey, alg } = await keystore.generateKeypair({
      alg: SigningAlgorithms.Ed25519,
    })
    didIdentifier = encodeAddress(publicKey, 38)
    key = { publicKey, type: alg }
    const tx = await DidChain.generateCreateTx({
      didIdentifier,
      submitter: paymentAccount.address,
      keys: {
        [KeyRelationship.assertionMethod]: key,
        [KeyRelationship.capabilityDelegation]: key,
      },
      signer: keystore as KeystoreSigner<string>,
      signingPublicKey: key.publicKey,
      alg: key.type,
    })
    await expect(
      BlockchainUtils.signAndSubmitTx(tx, paymentAccount, {
        resolveOn: BlockchainUtils.IS_IN_BLOCK,
        reSign: true,
      })
    ).resolves.not.toThrow()

    await expect(DidChain.queryById(didIdentifier)).resolves.toMatchObject<
      Partial<DidTypes.IDidChainRecordJSON>
    >({
      did: DidUtils.getKiltDidFromIdentifier(didIdentifier, 'full'),
    })
  }, 30_000)

  beforeEach(async () => {
    lastTxIndex = await DidChain.queryLastTxIndex(
      DidUtils.getKiltDidFromIdentifier(didIdentifier, 'full')
    )
  })

  it('authorizes ctype creation with DID signature', async () => {
    const ctype = CType.fromSchema({
      title: UUID.generate(),
      properties: {},
      type: 'object',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
    })
    const call = await ctype.store()
    const tx = await DidChain.generateDidAuthenticatedTx({
      didIdentifier,
      txCounter: lastTxIndex.addn(1),
      call,
      signer: keystore as KeystoreSigner<string>,
      signingPublicKey: key.publicKey,
      alg: key.type,
      submitter: paymentAccount.address,
    })
    await expect(
      BlockchainUtils.signAndSubmitTx(tx, paymentAccount, {
        resolveOn: BlockchainUtils.IS_IN_BLOCK,
        reSign: true,
      })
    ).resolves.not.toThrow()

    await expect(ctype.verifyStored()).resolves.toEqual(true)
  }, 30_000)

  it.skip('authorizes batch with DID signature', async () => {
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
    const calls = await Promise.all([ctype1, ctype2].map((c) => c.store()))
    const batch = await BlockchainApiConnection.getConnectionOrConnect().then(
      ({ api }) => api.tx.utility.batch(calls)
    )
    const tx = await DidChain.generateDidAuthenticatedTx({
      didIdentifier,
      txCounter: lastTxIndex.addn(1),
      call: batch,
      signer: keystore as KeystoreSigner<string>,
      signingPublicKey: key.publicKey,
      alg: key.type,
      submitter: paymentAccount.address,
    })
    await expect(
      BlockchainUtils.signAndSubmitTx(tx, paymentAccount, {
        resolveOn: BlockchainUtils.IS_IN_BLOCK,
        reSign: true,
      })
    ).resolves.not.toThrow()

    await expect(ctype1.verifyStored()).resolves.toEqual(true)
    await expect(ctype2.verifyStored()).resolves.toEqual(true)
  }, 30_000)

  it('no longer authorizes ctype creation after DID deletion', async () => {
    const did = DidUtils.getKiltDidFromIdentifier(didIdentifier, 'full')
    const storedEndpointsCount = await DidChain.queryEndpointsCounts(did)
    const deleteCall = await DidChain.getDeleteDidExtrinsic(
      storedEndpointsCount
    )
    const tx = await DidChain.generateDidAuthenticatedTx({
      didIdentifier,
      txCounter: lastTxIndex.addn(1),
      call: deleteCall,
      signer: keystore as KeystoreSigner<string>,
      signingPublicKey: key.publicKey,
      alg: key.type,
      submitter: paymentAccount.address,
    })

    await expect(
      BlockchainUtils.signAndSubmitTx(tx, paymentAccount, {
        resolveOn: BlockchainUtils.IS_IN_BLOCK,
        reSign: true,
      })
    ).resolves.not.toThrow()

    const ctype = CType.fromSchema({
      title: UUID.generate(),
      properties: {},
      type: 'object',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
    })
    const call = await ctype.store()
    const tx2 = await DidChain.generateDidAuthenticatedTx({
      didIdentifier,
      txCounter: lastTxIndex.addn(2),
      call,
      signer: keystore as KeystoreSigner<string>,
      signingPublicKey: key.publicKey,
      alg: key.type,
      submitter: paymentAccount.address,
    })
    await expect(
      BlockchainUtils.signAndSubmitTx(tx2, paymentAccount, {
        resolveOn: BlockchainUtils.IS_IN_BLOCK,
        reSign: true,
      })
    ).rejects.toThrow()

    await expect(ctype.verifyStored()).resolves.toEqual(false)
  }, 40_000)
})

afterAll(async () => disconnect())
