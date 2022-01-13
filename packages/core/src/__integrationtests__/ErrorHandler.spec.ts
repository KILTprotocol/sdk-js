/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group integration/errorhandler
 */

import { BN } from '@polkadot/util'
import { BlockchainUtils, ExtrinsicErrors } from '@kiltprotocol/chain-helpers'
import type { KeyringPair } from '@kiltprotocol/types'
import { DemoKeystore, FullDidDetails } from '@kiltprotocol/did'
import { randomAsHex } from '@polkadot/util-crypto'
import { Attestation } from '..'
import { makeTransfer } from '../balance/Balance.chain'
import { config, disconnect } from '../kilt'
import {
  addressFromRandom,
  createEndowedTestAccount,
  createFullDidFromSeed,
  initializeApi,
  submitExtrinsicWithResign,
} from './utils'

import '../../../../testingTools/jestErrorCodeMatcher'

let paymentAccount: KeyringPair
let someDid: FullDidDetails
const keystore = new DemoKeystore()

beforeAll(async () => {
  await initializeApi()
  paymentAccount = await createEndowedTestAccount()
  someDid = await createFullDidFromSeed(paymentAccount, keystore)
})

it('records an unknown extrinsic error when transferring less than the existential amount to new identity', async () => {
  await expect(
    makeTransfer(addressFromRandom(), new BN(1)).then((tx) =>
      submitExtrinsicWithResign(tx, paymentAccount)
    )
  ).rejects.toThrowErrorWithCode(ExtrinsicErrors.UNKNOWN_ERROR.code)
}, 30_000)

it('records an extrinsic error when ctype does not exist', async () => {
  const attestation = Attestation.fromAttestation({
    claimHash:
      '0xfea1357cdba9982ebe7a8a3bb2db975cbb7424acd503d4dc3a7339778e8bb752',
    cTypeHash:
      '0x103752ecd8e284b1c9677337ccc91ea255ac8e6651dc65d90f0504f31d7e54f0',
    delegationId: null,
    owner: someDid.did,
    revoked: false,
  })
  const tx = await attestation.store().then((ex) =>
    someDid.authorizeExtrinsic(ex, {
      signer: keystore,
      submitterAccount: paymentAccount.address,
    })
  )
  await expect(
    submitExtrinsicWithResign(tx, paymentAccount)
  ).rejects.toThrowErrorWithCode(
    ExtrinsicErrors.CType.ERROR_CTYPE_NOT_FOUND.code
  )
}, 30_000)

afterAll(() => {
  disconnect()
})
