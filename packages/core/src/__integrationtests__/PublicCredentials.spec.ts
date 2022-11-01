/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group integration/publicCredentials
 */

import {
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
import { credentialFromChain, } from '../publicCredential'
import { disconnect } from '../kilt'

let tokenHolder: KiltKeyringPair
let attester: DidDocument
let attesterKey: KeyTool

let api: ApiPromise
const assetId =
  'did:asset:eip155:1.erc20:0x6b175474e89094c44da98b954eedeac495271d0f'

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

  it('should be possible to issue a credential', async () => {
    const credential: INewPublicCredential = {
      claims: { name: 'Certified NFT collection' },
      cTypeHash: CType.getHashForSchema(nftNameCType),
      delegationId: null,
      subject: assetId,
    }
    const encodedPublicCredential = PublicCredential.toChain(credential)
    const storeTx = api.tx.publicCredentials.add(encodedPublicCredential)
    const authorizedStoreTx = await Did.authorizeTx(
      attester.uri,
      storeTx,
      attesterKey.getSignCallback(attester),
      tokenHolder.address
    )
    await submitTx(authorizedStoreTx, tokenHolder)
    const credentialId = PublicCredential.getIdForCredentialAndAttester(
      credential,
      attester.uri
    )

    const publicCredentialEntry1 =
      await api.call.publicCredentials.getCredential(credentialId)
    expect(publicCredentialEntry1.isSome).toBe(true)

    const completeCredential = await credentialFromChain(
      credentialId,
      publicCredentialEntry1
    )

    // Verify that the retrieved credential matches the input one, plus the generated ID and the attester DID.
    expect(completeCredential).toEqual(
      expect.objectContaining({
        ...credential,
        id: credentialId,
        attester: attester.uri,
      })
    )
  })

  it('should be possible to issue a second credential to the same asset and retrieve both of them', async () => {
    const credential: INewPublicCredential = {
      claims: { name: 'Certified NFT collection 2' },
      cTypeHash: CType.getHashForSchema(nftNameCType),
      delegationId: null,
      subject: assetId,
    }
    const encodedPublicCredential = PublicCredential.toChain(credential)
    const storeTx = api.tx.publicCredentials.add(encodedPublicCredential)
    const authorizedStoreTx = await Did.authorizeTx(
      attester.uri,
      storeTx,
      attesterKey.getSignCallback(attester),
      tokenHolder.address
    )
    await submitTx(authorizedStoreTx, tokenHolder)

    // const encodedAssetCredentials =
      await api.call.publicCredentials.getCredentials(assetId, null)
    // const assetCredentials = await credentialsFromChain(encodedAssetCredentials)

    // expect(assetCredentials).toHaveLength(2)
  })
})

afterAll(async () => {
  await disconnect()
})
