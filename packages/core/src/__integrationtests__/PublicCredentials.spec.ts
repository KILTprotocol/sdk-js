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
import { ApiPromise } from '@polkadot/api'
import { randomAsHex } from '@polkadot/util-crypto'

import {
  createFullDidFromSeed,
  KeyTool,
  makeSigningKeyTool,
} from '@kiltprotocol/testing'
import * as Did from '@kiltprotocol/did'
import { UUID } from '@kiltprotocol/utils'
import * as CType from '../ctype'
import * as PublicCredential from '../publicCredential'
import {
  createEndowedTestAccount,
  initializeApi,
  isCtypeOnChain,
  nftNameCType,
  submitTx,
} from './utils'
import { credentialFromChain, credentialsFromChain } from '../publicCredential'
import { disconnect } from '../kilt'

let tokenHolder: KiltKeyringPair
let attester: DidDocument
let attesterKey: KeyTool

let api: ApiPromise
// Generate a random asset ID
const assetId = `did:asset:eip155:1.erc20:${randomAsHex(20)}`

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
      claims: {
        name: `Certified NFT collection with id ${UUID.generate()}`,
      },
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
      claims: {
        name: `Certified NFT collection with id ${UUID.generate()}`,
      },
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

    const encodedAssetCredentials =
      await api.call.publicCredentials.getCredentials(assetId, null)
    const assetCredentials = await credentialsFromChain(encodedAssetCredentials)

    // We only check that we return two credentials back.
    // We don't check the content of each credential.
    expect(assetCredentials).toHaveLength(2)
  })

  it('should be possible to retrieve 100 credentials for the same asset', async () => {
    const credentialCreationTxs = [...Array(98)].map(() => {
      const credential: INewPublicCredential = {
        // Start from 3 since 0 and 2 have already been issued in tests above.
        claims: {
          name: `Certified NFT collection with id ${UUID.generate()}`,
        },
        cTypeHash: CType.getHashForSchema(nftNameCType),
        delegationId: null,
        subject: assetId,
      }
      const encodedPublicCredential = PublicCredential.toChain(credential)
      return api.tx.publicCredentials.add(encodedPublicCredential)
    })
    const authorizedBatch = await Did.authorizeBatch({
      batchFunction: api.tx.utility.batchAll,
      did: attester.uri,
      extrinsics: credentialCreationTxs,
      sign: attesterKey.getSignCallback(attester),
      submitter: tokenHolder.address,
    })
    await submitTx(authorizedBatch, tokenHolder)

    const encodedAssetCredentials =
      await api.call.publicCredentials.getCredentials(assetId, null)
    const before = Date.now()
    const assetCredentials = await credentialsFromChain(encodedAssetCredentials)
    const after = Date.now()
    console.log(after - before)

    // We only check that we return all the twenty credentials back.
    // We don't check the content of each credential.
    expect(assetCredentials).toHaveLength(100)
  })
})

afterAll(async () => {
  await disconnect()
})
