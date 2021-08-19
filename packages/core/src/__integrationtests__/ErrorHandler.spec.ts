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
import { KeyringPair } from '@polkadot/keyring/types'
import {
  createOnChainDidFromSeed,
  DemoKeystore,
  DidDetails,
} from '@kiltprotocol/did'
import { randomAsHex } from '@polkadot/util-crypto'
import { Attestation } from '..'
import { makeTransfer } from '../balance/Balance.chain'
import { config, disconnect } from '../kilt'
import { addressFromRandom, devAlice, WS_ADDRESS } from './utils'

import '../../../../testingTools/jestErrorCodeMatcher'

let paymentAccount: KeyringPair
let someDid: DidDetails
const keystore = new DemoKeystore()

beforeAll(async () => {
  config({ address: WS_ADDRESS })
  paymentAccount = devAlice
  someDid = await createOnChainDidFromSeed(
    paymentAccount,
    keystore,
    randomAsHex(32)
  )
})

it('records an unknown extrinsic error when transferring less than the existential amount to new identity', async () => {
  await expect(
    makeTransfer(addressFromRandom(), new BN(1)).then((tx) =>
      BlockchainUtils.signAndSubmitTx(tx, paymentAccount, {
        resolveOn: BlockchainUtils.IS_IN_BLOCK,
        reSign: true,
      })
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
  const tx = await attestation
    .store()
    .then((ex) => someDid.authorizeExtrinsic(ex, keystore))
  await expect(
    BlockchainUtils.signAndSubmitTx(tx, paymentAccount, {
      resolveOn: BlockchainUtils.IS_IN_BLOCK,
      reSign: true,
    })
  ).rejects.toThrowErrorWithCode(
    ExtrinsicErrors.CType.ERROR_CTYPE_NOT_FOUND.code
  )
}, 30_000)

afterAll(() => {
  disconnect()
})
