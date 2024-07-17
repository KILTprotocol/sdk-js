/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { ApiPromise } from '@polkadot/api'

import { CType } from '@kiltprotocol/credentials'
import { DidHelpers, disconnect } from '@kiltprotocol/sdk-js'
import type {
  DidDocument,
  KeyringPair,
  KiltKeyringPair,
  Service,
} from '@kiltprotocol/types'
import { Crypto } from '@kiltprotocol/utils'

import { createEndowedTestAccount, initializeApi } from './utils.js'

let api: ApiPromise
beforeAll(async () => {
  api = await initializeApi()
}, 30_000)

let paymentAccount: KiltKeyringPair
beforeAll(async () => {
  paymentAccount = await createEndowedTestAccount()
}, 30_000)

// Create did on chain
describe('create and deactivate DID', () => {
  let kp: KeyringPair
  let didDocument: DidDocument
  beforeAll(() => {
    kp = Crypto.makeKeypairFromUri(
      'build hill second flame trigger simple rigid cabbage phrase evolve final eight',
      'sr25519'
    )
  })

  it('creates a DID', async () => {
    const result = await DidHelpers.createDid({
      api,
      signers: [kp],
      submitter: paymentAccount,
      fromPublicKey: kp,
    }).submit()

    expect(result.status).toBe('confirmed')
    didDocument = result.asConfirmed.didDocument
    expect(didDocument).toMatchObject({
      id: `did:kilt:${kp.address}`,
      verificationMethod: expect.any(Array),
      authentication: expect.any(Array),
    })
    expect(didDocument.verificationMethod).toHaveProperty('length', 1)
    expect(didDocument.authentication).toHaveProperty('length', 1)
  }, 30_000)

  it('deactivates the DID', async () => {
    const result = await DidHelpers.deactivateDid({
      api,
      signers: [kp],
      submitter: paymentAccount,
      didDocument,
    }).submit()

    expect(result.status).toBe('confirmed')
    const updatedDoc = result.asConfirmed.didDocument
    expect(updatedDoc.id).toStrictEqual(didDocument.id)
    expect(updatedDoc).not.toMatchObject(didDocument)
    expect(updatedDoc).not.toHaveProperty('authentication')
    expect(updatedDoc).not.toHaveProperty('verificationMethod')
  }, 30_000)
})

describe('w3ns', () => {
  let keypair: KeyringPair
  let didDocument: DidDocument
  beforeAll(async () => {
    keypair = Crypto.makeKeypairFromUri('//Blob')
    const result = await DidHelpers.createDid({
      api,
      signers: [keypair],
      submitter: paymentAccount,
      fromPublicKey: keypair,
    }).submit()
    didDocument = result.asConfirmed.didDocument
  })

  it('claims w3n', async () => {
    const result = await DidHelpers.claimWeb3Name({
      api,
      signers: [keypair],
      submitter: paymentAccount,
      didDocument,
      name: 'blob',
    }).submit()
    expect(result.status).toStrictEqual('confirmed')
    didDocument = result.asConfirmed.didDocument
    expect(didDocument).toHaveProperty(
      'alsoKnownAs',
      expect.arrayContaining(['w3n:blob'])
    )
  }, 30_000)

  it('fails when trying to claim a 2nd w3n', async () => {
    const result = await DidHelpers.claimWeb3Name({
      api,
      signers: [keypair],
      submitter: paymentAccount,
      didDocument,
      name: 'blarb',
    }).submit()

    expect(result.status).toStrictEqual('failed')
    expect(result.asFailed.error).toMatchInlineSnapshot(
      `[Error: web3Names.OwnerAlreadyExists: The specified owner already owns a name.]`
    )
    expect(result.asFailed.didDocument).toMatchObject(didDocument)
  }, 30_000)

  it('releases a w3n', async () => {
    const result = await DidHelpers.releaseWeb3Name({
      api,
      signers: [keypair],
      submitter: paymentAccount,
      didDocument,
    }).submit()

    expect(result.status).toStrictEqual('confirmed')
    didDocument = result.asConfirmed.didDocument
    expect(didDocument).not.toHaveProperty('alsoKnownAs')
  }, 30_000)
})

describe('services', () => {
  let keypair: KeyringPair
  let didDocument: DidDocument
  beforeAll(async () => {
    keypair = Crypto.makeKeypairFromUri('//Services')
    const result = await DidHelpers.createDid({
      api,
      signers: [keypair],
      submitter: paymentAccount,
      fromPublicKey: keypair,
    }).submit()
    didDocument = result.asConfirmed.didDocument
  })

  it('adds a service', async () => {
    const result = await DidHelpers.addService({
      api,
      signers: [keypair],
      submitter: paymentAccount,
      didDocument,
      service: {
        id: '#my_service',
        type: ['http://schema.org/EmailService'],
        serviceEndpoint: ['mailto:info@kilt.io'],
      },
    }).submit()
    expect(result.status).toStrictEqual('confirmed')
    didDocument = result.asConfirmed.didDocument
    expect(didDocument).toHaveProperty(
      'service',
      expect.arrayContaining<Service>([
        {
          id: `${didDocument.id}#my_service`,
          type: ['http://schema.org/EmailService'],
          serviceEndpoint: ['mailto:info@kilt.io'],
        },
      ])
    )
    expect(didDocument.service).toHaveLength(1)
  }, 30_000)

  it('removes a service', async () => {
    const result = await DidHelpers.removeService({
      api,
      signers: [keypair],
      submitter: paymentAccount,
      didDocument,
      id: '#my_service',
    }).submit()

    expect(result.status).toStrictEqual('confirmed')
    didDocument = result.asConfirmed.didDocument
    expect(didDocument).not.toHaveProperty('service')
  }, 30_000)
})

describe('verification methods', () => {
  let keypair: KeyringPair
  let didDocument: DidDocument
  beforeAll(async () => {
    keypair = Crypto.makeKeypairFromUri('//Vms')
    const result = await DidHelpers.createDid({
      api,
      signers: [keypair],
      submitter: paymentAccount,
      fromPublicKey: keypair,
    }).submit()
    didDocument = result.asConfirmed.didDocument
  })

  it('sets an assertion method', async () => {
    expect(didDocument).not.toHaveProperty('assertionMethod')
    const result = await DidHelpers.setVerificationMethod({
      api,
      signers: [keypair],
      submitter: paymentAccount,
      didDocument,
      publicKey: keypair,
      relationship: 'assertionMethod',
    }).submit()
    expect(result.status).toStrictEqual('confirmed')
    didDocument = result.asConfirmed.didDocument
    expect(didDocument).toHaveProperty(
      'assertionMethod',
      didDocument.authentication
    )

    const result2 = await DidHelpers.setVerificationMethod({
      api,
      signers: [keypair],
      submitter: paymentAccount,
      didDocument,
      publicKey: { publicKey: new Uint8Array(32).fill(1), type: 'ed25519' },
      relationship: 'assertionMethod',
    }).submit()

    expect(result2.status).toStrictEqual('confirmed')
    didDocument = result2.asConfirmed.didDocument
    expect(didDocument.assertionMethod).toHaveLength(1)
    expect(didDocument.assertionMethod![0]).not.toEqual(
      didDocument.authentication![0]
    )
  }, 60_000)

  it('sets a key agreement method', async () => {
    expect(didDocument).not.toHaveProperty('keyAgreement')
    const result = await DidHelpers.setVerificationMethod({
      api,
      signers: [keypair],
      submitter: paymentAccount,
      didDocument,
      publicKey: { publicKey: new Uint8Array(32).fill(0), type: 'x25519' },
      relationship: 'keyAgreement',
    }).submit()
    expect(result.status).toStrictEqual('confirmed')
    didDocument = result.asConfirmed.didDocument
    expect(didDocument).toHaveProperty('keyAgreement', expect.any(Array))
    expect(didDocument.keyAgreement).toHaveLength(1)

    const [oldKey] = didDocument.keyAgreement!

    const result2 = await DidHelpers.setVerificationMethod({
      api,
      signers: [keypair],
      submitter: paymentAccount,
      didDocument,
      publicKey: { publicKey: new Uint8Array(32).fill(1), type: 'x25519' },
      relationship: 'keyAgreement',
    }).submit()

    expect(result2.status).toStrictEqual('confirmed')
    didDocument = result2.asConfirmed.didDocument
    expect(didDocument.keyAgreement).toHaveLength(1)
    expect(didDocument.keyAgreement![0]).not.toEqual(oldKey)
  }, 60_000)

  it('removes an assertion method', async () => {
    expect(didDocument.assertionMethod).toHaveLength(1)

    const result = await DidHelpers.removeVerificationMethod({
      api,
      signers: [keypair],
      submitter: paymentAccount,
      didDocument,
      verificationMethodId: didDocument.assertionMethod![0],
      relationship: 'assertionMethod',
    }).submit()

    expect(result.status).toStrictEqual('confirmed')
    didDocument = result.asConfirmed.didDocument
    expect(didDocument).not.toHaveProperty('assertionMethod')
  }, 30_000)

  it('removes a key agreement method', async () => {
    expect(didDocument.keyAgreement).toHaveLength(1)

    const result = await DidHelpers.removeVerificationMethod({
      api,
      signers: [keypair],
      submitter: paymentAccount,
      didDocument,
      verificationMethodId: didDocument.keyAgreement![0],
      relationship: 'keyAgreement',
    }).submit()

    expect(result.status).toStrictEqual('confirmed')
    didDocument = result.asConfirmed.didDocument
    expect(didDocument).not.toHaveProperty('keyAgreement')
  }, 30_000)

  it('fails to remove authentication method', async () => {
    await expect(
      Promise.resolve()
        .then(() =>
          DidHelpers.removeVerificationMethod({
            api,
            signers: [keypair],
            submitter: paymentAccount,
            didDocument,
            verificationMethodId: didDocument.authentication![0],
            relationship: 'authentication',
          }).submit()
        )
        .then(({ asConfirmed }) => asConfirmed)
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"authentication verification methods can not be removed"`
    )
  }, 30_000)
})

describe('transact', () => {
  let keypair: KeyringPair
  let didDocument: DidDocument
  beforeAll(async () => {
    keypair = Crypto.makeKeypairFromUri('//Transact')
    didDocument = (
      await DidHelpers.createDid({
        api,
        signers: [keypair],
        submitter: paymentAccount,
        fromPublicKey: keypair,
      }).submit()
    ).asConfirmed.didDocument

    didDocument = (
      await DidHelpers.setVerificationMethod({
        api,
        signers: [keypair],
        submitter: paymentAccount,
        didDocument,
        publicKey: keypair,
        relationship: 'assertionMethod',
      }).submit()
    ).asConfirmed.didDocument
  })

  it('creates a ctype', async () => {
    const ctype = CType.fromProperties('thing', { thang: { type: 'string' } })
    const serialized = CType.toChain(ctype)
    const call = api.tx.ctype.add(serialized)

    const result = await DidHelpers.transact({
      api,
      signers: [keypair],
      submitter: paymentAccount,
      didDocument,
      call,
      expectedEvents: [{ section: 'ctype', method: 'CTypeCreated' }],
    }).submit()

    expect(result.status).toStrictEqual('confirmed')
    expect(result.asConfirmed.didDocument).toMatchObject(didDocument)
    await expect(CType.verifyStored(ctype)).resolves.not.toThrow()
  }, 30_000)
})

afterAll(async () => {
  await disconnect()
})
