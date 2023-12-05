/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { ApiPromise } from '@polkadot/api'

import { Did, disconnect } from '@kiltprotocol/sdk-js'
import type {
  DidDocument,
  IAttestation,
  KiltKeyringPair,
} from '@kiltprotocol/types'

import {
  KeyTool,
  createFullDidFromSeed,
  makeSigningKeyTool,
} from '../testUtils/index.js'

import {
  addressFromRandom,
  createEndowedTestAccount,
  initializeApi,
  submitTx,
} from './utils.js'

let paymentAccount: KiltKeyringPair
let someDid: DidDocument
let key: KeyTool
let api: ApiPromise

beforeAll(async () => {
  api = await initializeApi()
}, 30_000)

beforeAll(async () => {
  paymentAccount = await createEndowedTestAccount()
  key = await makeSigningKeyTool()
  someDid = await createFullDidFromSeed(paymentAccount, key.keypair)
}, 60_000)

it('records an extrinsic error when transferring less than the existential amount to new identity', async () => {
  const transferTx = api.tx.balances.transfer(addressFromRandom(), 1)
  const promise = submitTx(transferTx, paymentAccount)
  if (api.runtimeVersion.specVersion.toBigInt() >= 11_200n) {
    await expect(promise).rejects.toMatchInlineSnapshot(`
      {
        "token": "BelowMinimum",
      }
    `)
  } else {
    await expect(promise).rejects.toMatchInlineSnapshot(`
      {
        "args": [],
        "docs": [
          "Value too low to create account due to existential deposit",
        ],
        "fields": [],
        "index": 3,
        "method": "ExistentialDeposit",
        "name": "ExistentialDeposit",
        "section": "balances",
      }
    `)
  }
}, 30_000)

it('records an extrinsic error when ctype does not exist', async () => {
  const attestation: IAttestation = {
    claimHash:
      '0xfea1357cdba9982ebe7a8a3bb2db975cbb7424acd503d4dc3a7339778e8bb752',
    cTypeHash:
      '0x103752ecd8e284b1c9677337ccc91ea255ac8e6651dc65d90f0504f31d7e54f0',
    delegationId: null,
    owner: someDid.id,
    revoked: false,
  }
  const storeTx = api.tx.attestation.add(
    attestation.claimHash,
    attestation.cTypeHash,
    null
  )
  const tx = await Did.authorizeTx(
    someDid.id,
    storeTx,
    await key.getSigners(someDid),
    paymentAccount.address
  )
  await expect(submitTx(tx, paymentAccount)).rejects.toMatchObject({
    section: 'ctype',
    name: expect.stringMatching(/^(CType)?NotFound$/),
  })
}, 30_000)

afterAll(async () => {
  await disconnect()
})
