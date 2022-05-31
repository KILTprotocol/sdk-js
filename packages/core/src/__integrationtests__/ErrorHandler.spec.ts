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
import type { KeyringPair } from '@kiltprotocol/types'
import { DemoKeystore, FullDidDetails } from '@kiltprotocol/did'
import { Attestation } from '../index'
import { getTransferTx } from '../balance/Balance.chain'
import { disconnect } from '../kilt'
import {
  addressFromRandom,
  createEndowedTestAccount,
  createFullDidFromSeed,
  initializeApi,
  submitExtrinsicWithResign,
} from './utils'

let paymentAccount: KeyringPair
let someDid: FullDidDetails
const keystore = new DemoKeystore()

beforeAll(async () => {
  await initializeApi()
}, 30_000)

beforeAll(async () => {
  paymentAccount = await createEndowedTestAccount()
  someDid = await createFullDidFromSeed(paymentAccount, keystore)
}, 60_000)

it('records an extrinsic error when transferring less than the existential amount to new identity', async () => {
  await expect(
    getTransferTx(addressFromRandom(), new BN(1)).then((tx) =>
      submitExtrinsicWithResign(tx, paymentAccount)
    )
  ).rejects.toMatchObject({ section: 'balances', name: 'ExistentialDeposit' })
}, 30_000)

it('records an extrinsic error when ctype does not exist', async () => {
  const attestation = Attestation.fromAttestation({
    claimHash:
      '0xfea1357cdba9982ebe7a8a3bb2db975cbb7424acd503d4dc3a7339778e8bb752',
    cTypeHash:
      '0x103752ecd8e284b1c9677337ccc91ea255ac8e6651dc65d90f0504f31d7e54f0',
    delegationId: null,
    owner: someDid.uri,
    revoked: false,
  })
  const tx = await attestation
    .getStoreTx()
    .then((ex) =>
      someDid.authorizeExtrinsic(ex, keystore, paymentAccount.address)
    )
  await expect(
    submitExtrinsicWithResign(tx, paymentAccount)
  ).rejects.toMatchObject({ section: 'ctype', name: 'CTypeNotFound' })
}, 30_000)

afterAll(() => {
  disconnect()
})
