/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { ApiPromise } from '@polkadot/api'

import { DidHelpers, disconnect } from '@kiltprotocol/sdk-js'
import type {
  DidDocument,
  KeyringPair,
  KiltKeyringPair,
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
describe('createDid', () => {
  it('works', async () => {
    const kp = Crypto.makeKeypairFromUri(
      'build hill second flame trigger simple rigid cabbage phrase evolve final eight',
      'sr25519'
    )

    const result = await DidHelpers.createDid({
      api,
      signers: [kp],
      submitter: paymentAccount,
      fromPublicKey: kp,
    }).submit()

    expect(result.status).toBe('confirmed')
    expect(result.asConfirmed.didDocument).toMatchObject({
      id: `did:kilt:${kp.address}`,
    })
  }, 60000)
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

afterAll(async () => {
  await disconnect()
})
