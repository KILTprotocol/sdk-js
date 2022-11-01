/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group integration/publicCredentials
 */

import type {
  DidDocument,
  INewPublicCredential,
  KiltKeyringPair,
} from '@kiltprotocol/types'

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
import { fromChain } from '../publicCredential'

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
    const credential1: INewPublicCredential = {
      claims: { name: 'Certified NFT collection' },
      cTypeHash: CType.getHashForSchema(nftNameCType),
      delegationId: null,
      subject:
        'did:asset:eip155:1.erc20:0x6b175474e89094c44da98b954eedeac495271d0f',
    }
    const credential2: INewPublicCredential = {
      claims: { name: 'Certified NFT collection 2' },
      cTypeHash: CType.getHashForSchema(nftNameCType),
      delegationId: null,
      subject:
        'did:asset:eip155:1.erc20:0x6b175474e89094c44da98b954eedeac495271d0f',
    }
    const encodedPublicCredential1 = PublicCredential.toChain(credential1)
    const storeTx1 = api.tx.publicCredentials.add(encodedPublicCredential1)
    const encodedPublicCredential2 = PublicCredential.toChain(credential2)
    const storeTx2 = api.tx.publicCredentials.add(encodedPublicCredential2)
    let batchTx = api.tx.utility.batchAll([storeTx1, storeTx2])
    batchTx = api.tx.utility.batch([batchTx])
    batchTx = api.tx.utility.forceBatch([batchTx])
    const authorizedStoreTx = await Did.authorizeTx(
      attester.uri,
      batchTx,
      attesterKey.getSignCallback(attester),
      tokenHolder.address
    )
    await submitTx(authorizedStoreTx, tokenHolder)
    const credentialId1 = PublicCredential.getIdForPublicCredentialAndAttester(
      credential1,
      attester.uri
    )
    console.log('+++ Credential1 input +++')
    console.log(JSON.stringify(credential1, null, 2))
    console.log(attester.uri)

    const publicCredentialEntry1 =
      await api.call.publicCredentials.getCredential(credentialId1)
    expect(publicCredentialEntry1.isSome).toBe(true)

    const completeCredential1 = await fromChain(
      credentialId1,
      publicCredentialEntry1
    )
    console.log(JSON.stringify(completeCredential1, null, 2))

    // const credentialId2 = PublicCredential.getIdForPublicCredentialAndAttester(
    //   credential2,
    //   attester.uri
    // )
    // const publicCredentialEntry2 =
    //   await api.call.publicCredentials.getCredential(credentialId2)
    // expect(publicCredentialEntry1.isSome).toBe(true)

    // const completeCredential2 = await fromChain(
    //   credentialId2,
    //   publicCredentialEntry2
    // )
    // console.log(completeCredential2)
  })
})
