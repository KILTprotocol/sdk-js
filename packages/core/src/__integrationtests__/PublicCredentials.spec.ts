/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group integration/publicCredentials
 */

import type { DidDocument, KiltKeyringPair } from '@kiltprotocol/types'

import {
  createFullDidFromSeed,
  KeyTool,
  makeSigningKeyTool,
} from '@kiltprotocol/testing'
import * as Did from '@kiltprotocol/did'
import { ApiPromise } from '@polkadot/api'
import * as CType from '../ctype'
import * as PublicCredential from '../publicCredential'
import {
  createEndowedTestAccount,
  initializeApi,
  isCtypeOnChain,
  nftNameCType,
  submitTx,
} from './utils'

let tokenHolder: KiltKeyringPair
let attester: DidDocument
let attesterKey: KeyTool

let api: ApiPromise
beforeAll(async () => {
  api = await initializeApi()
}, 30_000)

beforeAll(async () => {
  tokenHolder = await createEndowedTestAccount()
  attesterKey = makeSigningKeyTool()
  attester = await createFullDidFromSeed(tokenHolder, attesterKey.keypair)
}, 60_000)

describe('When there is an attester and ctype NFT name', () => {
  beforeAll(async () => {
    const ctypeExists = await isCtypeOnChain(nftNameCType)
    if (ctypeExists) return
    const tx = await Did.authorizeTx(
      attester.uri,
      api.tx.ctype.add(CType.toChain(nftNameCType)),
      attesterKey.getSignCallback(attester),
      tokenHolder.address
    )
    await submitTx(tx, tokenHolder)
  }, 60_000)

  it('should be possible to issue a public credential', async () => {
    const content = { name: 'Certified NFT collection' }
    const encodedPublicCredential = PublicCredential.toChain({
      claims: content,
      cTypeHash: CType.getHashForSchema(nftNameCType),
      delegationId: null,
      subject:
        'did:asset:eip155:1.erc20:0x6b175474e89094c44da98b954eedeac495271d0f',
    })
    const storeTx = api.tx.publicCredentials.add(encodedPublicCredential)
    const authorizedStoreTx = await Did.authorizeTx(
      attester.uri,
      storeTx,
      attesterKey.getSignCallback(attester),
      tokenHolder.address
    )
    await submitTx(authorizedStoreTx, tokenHolder)
  })
})
