/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { disconnect } from '@kiltprotocol/sdk-js'
import * as SDK from '@kiltprotocol/sdk-js'
import { KiltKeyringPair } from '@kiltprotocol/types'
import { Crypto } from '@kiltprotocol/utils'
import type { ApiPromise } from '@polkadot/api'
import {
  AcceptedPublicKeyEncodings,
  SharedArguments,
} from 'sdk-js/src/DidHelpers/interfaces'
import { createEndowedTestAccount, initializeApi } from './utils'

// Create did on chain
describe('createDid', () => {
  let paymentAccount: KiltKeyringPair
  let api: ApiPromise

  beforeAll(async () => {
    api = await initializeApi()
  }, 30_000)

  beforeAll(async () => {
    paymentAccount = await createEndowedTestAccount()
  }, 30_000)

  it('works', async () => {
    const kp = Crypto.makeKeypairFromUri(
      'build hill second flame trigger simple rigid cabbage phrase evolve final eight',
      'sr25519'
    )
    console.log(kp.address)
    const options: Omit<SharedArguments, 'didDocument'> & {
      fromPublicKey: AcceptedPublicKeyEncodings
    } = {
      api,
      signers: [kp],
      submitter: paymentAccount,
      fromPublicKey: kp,
    }

    // const did = await (await createDid(options)).submit()
    const did = await SDK.DidHelpers.createDid(options)
    const did2 = await did.submit()

    expect(did2.status).toBe('confirmed')
    expect(did2.asConfirmed.didDocument).toMatchObject({
      id: `did:kilt:${kp.address}`,
    })

    // const did2 = await did.getSubmittable({ signSubmittable: false })
  }, 60000)

  afterAll(async () => {
    disconnect()
  })
})
