/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group integration/publicCredentials
 */

import type { ApiPromise } from '@polkadot/api'
import type {
  AssetDidUri,
  DidDocument,
  INewPublicCredential,
  KiltKeyringPair,
} from '@kiltprotocol/types'

import { randomAsHex } from '@polkadot/util-crypto'
import * as Did from '@kiltprotocol/did'
import {
  createFullDidFromSeed,
  KeyTool,
  makeSigningKeyTool,
} from '@kiltprotocol/testing'
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
import { disconnect } from '../kilt'

let tokenHolder: KiltKeyringPair
let attester: DidDocument
let attesterKey: KeyTool

let api: ApiPromise
// Generate a random asset ID
const assetId: AssetDidUri = `did:asset:eip155:1.erc20:${randomAsHex(20)}`
let latestCredential: INewPublicCredential

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
    latestCredential = {
      claims: {
        name: `Certified NFT collection with id ${UUID.generate()}`,
      },
      cTypeHash: CType.getHashForSchema(nftNameCType),
      delegationId: null,
      subject: assetId,
    }
    const encodedPublicCredential = PublicCredential.toChain(latestCredential)
    const storeTx = api.tx.publicCredentials.add(encodedPublicCredential)
    const authorizedStoreTx = await Did.authorizeTx(
      attester.uri,
      storeTx,
      attesterKey.getSignCallback(attester),
      tokenHolder.address
    )
    await submitTx(authorizedStoreTx, tokenHolder)
    const credentialId = PublicCredential.computeId(
      latestCredential,
      attester.uri
    )

    const publicCredentialEntry =
      await api.call.publicCredentials.getCredential(credentialId)
    expect(publicCredentialEntry.isSome).toBe(true)

    const completeCredential = await PublicCredential.credentialFromChain(
      credentialId,
      publicCredentialEntry
    )

    // Verify that the retrieved credential matches the input one, plus the generated ID and the attester DID.
    expect(completeCredential).toEqual(
      expect.objectContaining({
        ...latestCredential,
        id: credentialId,
        attester: attester.uri,
        revoked: false,
      })
    )
  })

  it('should be possible to issue a second credential to the same asset and retrieve both of them', async () => {
    latestCredential = {
      claims: {
        name: `Certified NFT collection with id ${UUID.generate()}`,
      },
      cTypeHash: CType.getHashForSchema(nftNameCType),
      delegationId: null,
      subject: assetId,
    }
    const encodedPublicCredential = PublicCredential.toChain(latestCredential)
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
    const assetCredentials = await PublicCredential.credentialsFromChain(
      encodedAssetCredentials
    )

    // We only check that we return two credentials back.
    // We don't check the content of each credential.
    expect(assetCredentials).toHaveLength(2)
  })

  it('should be possible to retrieve 100 credentials for the same asset', async () => {
    // Issue 98 more credentials
    const credentialCreationTxs = [...Array(98)].map(() => {
      latestCredential = {
        claims: {
          name: `Certified NFT collection with id ${UUID.generate()}`,
        },
        cTypeHash: CType.getHashForSchema(nftNameCType),
        delegationId: null,
        subject: assetId,
      }
      const encodedPublicCredential = PublicCredential.toChain(latestCredential)
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
    const assetCredentials = await PublicCredential.credentialsFromChain(
      encodedAssetCredentials
    )

    // We only check that we return all the twenty credentials back.
    // We don't check the content of each credential.
    expect(assetCredentials).toHaveLength(100)
  })

  it('should be possible to revoke a credential', async () => {
    const credentialId = PublicCredential.computeId(
      latestCredential,
      attester.uri
    )
    let encodedAssetCredential = await api.call.publicCredentials.getCredential(
      credentialId
    )
    let assetCredential = await PublicCredential.credentialFromChain(
      credentialId,
      encodedAssetCredential
    )
    let encodedAllAssetCredentials =
      await api.call.publicCredentials.getCredentials(assetId, null)
    const allAssetCredentialsBeforeRevocation =
      await PublicCredential.credentialsFromChain(encodedAllAssetCredentials)
    // Verify that credential was not revoked before revocation
    expect(assetCredential.revoked).toBe(false)
    const revocationTx = api.tx.publicCredentials.revoke(credentialId, null)
    const authorizedTx = await Did.authorizeTx(
      attester.uri,
      revocationTx,
      attesterKey.getSignCallback(attester),
      tokenHolder.address
    )
    await submitTx(authorizedTx, tokenHolder)

    encodedAssetCredential = await api.call.publicCredentials.getCredential(
      credentialId
    )
    assetCredential = await PublicCredential.credentialFromChain(
      credentialId,
      encodedAssetCredential
    )
    encodedAllAssetCredentials =
      await api.call.publicCredentials.getCredentials(assetId, null)
    const allAssetCredentialsAfterRevocation =
      await PublicCredential.credentialsFromChain(encodedAllAssetCredentials)

    expect(assetCredential.revoked).toBe(true)
    // Verify the number of credentials has not changed after revocation
    expect(allAssetCredentialsBeforeRevocation.length).toEqual(
      allAssetCredentialsAfterRevocation.length
    )
  })

  it('should be possible to unrevoke a credential', async () => {
    const credentialId = PublicCredential.computeId(
      latestCredential,
      attester.uri
    )
    let encodedAssetCredential = await api.call.publicCredentials.getCredential(
      credentialId
    )
    let assetCredential = await PublicCredential.credentialFromChain(
      credentialId,
      encodedAssetCredential
    )
    let encodedAllAssetCredentials =
      await api.call.publicCredentials.getCredentials(assetId, null)
    const allAssetCredentialsBeforeRevocation =
      await PublicCredential.credentialsFromChain(encodedAllAssetCredentials)
    // Verify that credential was revoked before un-revocation
    expect(assetCredential.revoked).toBe(true)

    const unrevocationTx = api.tx.publicCredentials.unrevoke(credentialId, null)
    const authorizedTx = await Did.authorizeTx(
      attester.uri,
      unrevocationTx,
      attesterKey.getSignCallback(attester),
      tokenHolder.address
    )
    await submitTx(authorizedTx, tokenHolder)

    encodedAssetCredential = await api.call.publicCredentials.getCredential(
      credentialId
    )
    assetCredential = await PublicCredential.credentialFromChain(
      credentialId,
      encodedAssetCredential
    )
    encodedAllAssetCredentials =
      await api.call.publicCredentials.getCredentials(assetId, null)
    const allAssetCredentialsAfterRevocation =
      await PublicCredential.credentialsFromChain(encodedAllAssetCredentials)

    // Verify it is now not revoked anymore
    expect(assetCredential.revoked).toBe(false)
    // Verify the number of credentials has not changed after revocation
    expect(allAssetCredentialsBeforeRevocation.length).toEqual(
      allAssetCredentialsAfterRevocation.length
    )
  })

  it('should be possible to remove a credential', async () => {
    const credentialId = PublicCredential.computeId(
      latestCredential,
      attester.uri
    )
    let encodedAssetCredential = await api.call.publicCredentials.getCredential(
      credentialId
    )
    let encodedAllAssetCredentials =
      await api.call.publicCredentials.getCredentials(assetId, null)
    const allAssetCredentialsBeforeRevocation =
      await PublicCredential.credentialsFromChain(encodedAllAssetCredentials)
    // Verify that credential existed before removal
    expect(encodedAssetCredential.isNone).toBe(false)

    const removalTx = api.tx.publicCredentials.remove(credentialId, null)
    const authorizedTx = await Did.authorizeTx(
      attester.uri,
      removalTx,
      attesterKey.getSignCallback(attester),
      tokenHolder.address
    )
    await submitTx(authorizedTx, tokenHolder)

    encodedAssetCredential = await api.call.publicCredentials.getCredential(
      credentialId
    )
    encodedAllAssetCredentials =
      await api.call.publicCredentials.getCredentials(assetId, null)
    const allAssetCredentialsAfterRevocation =
      await PublicCredential.credentialsFromChain(encodedAllAssetCredentials)

    // Verify it is now removed
    expect(encodedAssetCredential.isNone).toBe(true)
    // Verify the number of credentials has decreased by one
    expect(allAssetCredentialsBeforeRevocation.length).toEqual(
      allAssetCredentialsAfterRevocation.length + 1
    )
  })
})

afterAll(async () => {
  await disconnect()
})
