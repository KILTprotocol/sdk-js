/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group integration/errorhandler
 */

import { BN } from '@polkadot/util'
import type {
  DidDetails,
  IAttestation,
  KiltKeyringPair,
} from '@kiltprotocol/types'
import {
  createFullDidFromSeed,
  KeyTool,
  makeSigningKeyTool,
} from '@kiltprotocol/testing'
import * as Did from '@kiltprotocol/did'
import { Attestation } from '../index'
import { getTransferTx } from '../balance/Balance.chain'
import { disconnect } from '../kilt'
import {
  addressFromRandom,
  createEndowedTestAccount,
  initializeApi,
  submitExtrinsic,
} from './utils'

let paymentAccount: KiltKeyringPair
let someDid: DidDetails
let key: KeyTool

beforeAll(async () => {
  await initializeApi()
}, 30_000)

beforeAll(async () => {
  paymentAccount = await createEndowedTestAccount()
  key = makeSigningKeyTool()
  someDid = await createFullDidFromSeed(paymentAccount, key.keypair)
}, 60_000)

it('records an extrinsic error when transferring less than the existential amount to new identity', async () => {
  const transferTx = await getTransferTx(addressFromRandom(), new BN(1))
  await expect(
    submitExtrinsic(transferTx, paymentAccount)
  ).rejects.toMatchObject({ section: 'balances', name: 'ExistentialDeposit' })
}, 30_000)

it('records an extrinsic error when ctype does not exist', async () => {
  const attestation: IAttestation = {
    claimHash:
      '0xfea1357cdba9982ebe7a8a3bb2db975cbb7424acd503d4dc3a7339778e8bb752',
    cTypeHash:
      '0x103752ecd8e284b1c9677337ccc91ea255ac8e6651dc65d90f0504f31d7e54f0',
    delegationId: null,
    owner: someDid.uri,
    revoked: false,
  }
  const storeTx = await Attestation.getStoreTx(attestation)
  const tx = await Did.authorizeExtrinsic(
    someDid,
    storeTx,
    key.sign,
    paymentAccount.address
  )
  await expect(submitExtrinsic(tx, paymentAccount)).rejects.toMatchObject({
    section: 'ctype',
    name: 'CTypeNotFound',
  })
}, 30_000)

afterAll(async () => {
  await disconnect()
})
