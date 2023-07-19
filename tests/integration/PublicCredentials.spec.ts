/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
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
  IPublicCredential,
  IPublicCredentialInput,
  KiltKeyringPair,
  HexString,
} from '@kiltprotocol/types'

import { BN } from '@polkadot/util'
import { randomAsHex } from '@polkadot/util-crypto'
import * as Did from '@kiltprotocol/did'
import {
  createFullDidFromSeed,
  KeyTool,
  makeSigningKeyTool,
} from '@kiltprotocol/testing'
import { UUID } from '@kiltprotocol/utils'
import { CType, disconnect, PublicCredential } from '@kiltprotocol/core'

import {
  createEndowedTestAccount,
  devAlice,
  initializeApi,
  isCtypeOnChain,
  nftNameCType,
  submitTx,
} from './utils.js'

let tokenHolder: KiltKeyringPair
let attester: DidDocument
let attesterKey: KeyTool

let api: ApiPromise
// Generate a random asset ID
let assetId: AssetDidUri = `did:asset:eip155:1.erc20:${randomAsHex(20)}`
let latestCredential: IPublicCredentialInput

async function issueCredential(
  credential: IPublicCredentialInput
): Promise<void> {
  const authorizedStoreTx = await Did.authorizeTx(
    attester.uri,
    api.tx.publicCredentials.add(PublicCredential.toChain(credential)),
    attesterKey.getSignCallback(attester),
    tokenHolder.address
  )
  await submitTx(authorizedStoreTx, tokenHolder)
}

beforeAll(async () => {
  api = await initializeApi()
  tokenHolder = await createEndowedTestAccount()
  attesterKey = makeSigningKeyTool()
  attester = await createFullDidFromSeed(tokenHolder, attesterKey.keypair)

  const ctypeExists = await isCtypeOnChain(nftNameCType)
  if (ctypeExists) return
  const tx = await Did.authorizeTx(
    attester.uri,
    api.tx.ctype.add(CType.toChain(nftNameCType)),
    attesterKey.getSignCallback(attester),
    tokenHolder.address
  )
  await submitTx(tx, tokenHolder)
}, 30_000)

describe('When there is an attester and ctype NFT name', () => {
  it('should be possible to issue a credential', async () => {
    latestCredential = {
      claims: {
        name: `Certified NFT collection with id ${UUID.generate()}`,
      },
      cTypeHash: CType.getHashForSchema(nftNameCType),
      delegationId: null,
      subject: assetId,
    }
    await issueCredential(latestCredential)
    const credentialId = PublicCredential.getIdForCredential(
      latestCredential,
      attester.uri
    )

    const publicCredentialEntry = await api.call.publicCredentials.getById(
      credentialId
    )
    expect(publicCredentialEntry.isSome).toBe(true)

    const completeCredential = await PublicCredential.fetchCredentialFromChain(
      credentialId
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
    await issueCredential(latestCredential)

    const assetCredentials = await PublicCredential.fetchCredentialsFromChain(
      assetId
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

    const assetCredentials = await PublicCredential.fetchCredentialsFromChain(
      assetId
    )

    // We don't check the content of each credential but only the number of credentials that is returned.
    expect(assetCredentials).toHaveLength(100)
  })

  it('should be possible to revoke a credential', async () => {
    const credentialId = PublicCredential.getIdForCredential(
      latestCredential,
      attester.uri
    )
    let assetCredential = await PublicCredential.fetchCredentialFromChain(
      credentialId
    )
    const allAssetCredentialsBeforeRevocation =
      await PublicCredential.fetchCredentialsFromChain(assetId)
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

    assetCredential = await PublicCredential.fetchCredentialFromChain(
      credentialId
    )
    const allAssetCredentialsAfterRevocation =
      await PublicCredential.fetchCredentialsFromChain(assetId)

    expect(assetCredential.revoked).toBe(true)
    // Verify the number of credentials has not changed after revocation
    expect(allAssetCredentialsBeforeRevocation.length).toEqual(
      allAssetCredentialsAfterRevocation.length
    )
  }, 60_000)

  it('should be possible to unrevoke a credential', async () => {
    const credentialId = PublicCredential.getIdForCredential(
      latestCredential,
      attester.uri
    )
    let assetCredential = await PublicCredential.fetchCredentialFromChain(
      credentialId
    )
    const allAssetCredentialsBeforeRevocation =
      await PublicCredential.fetchCredentialsFromChain(assetId)
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
    assetCredential = await PublicCredential.fetchCredentialFromChain(
      credentialId
    )
    const allAssetCredentialsAfterRevocation =
      await PublicCredential.fetchCredentialsFromChain(assetId)

    // Verify it is now not revoked anymore
    expect(assetCredential.revoked).toBe(false)
    // Verify the number of credentials has not changed after revocation
    expect(allAssetCredentialsBeforeRevocation.length).toEqual(
      allAssetCredentialsAfterRevocation.length
    )
  }, 60_000)

  it('should be possible to remove a credential', async () => {
    const credentialId = PublicCredential.getIdForCredential(
      latestCredential,
      attester.uri
    )
    let encodedAssetCredential = await api.call.publicCredentials.getById(
      credentialId
    )
    const allAssetCredentialsBeforeRevocation =
      await PublicCredential.fetchCredentialsFromChain(assetId)
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

    encodedAssetCredential = await api.call.publicCredentials.getById(
      credentialId
    )
    const allAssetCredentialsAfterRevocation =
      await PublicCredential.fetchCredentialsFromChain(assetId)

    // Verify it is now removed
    expect(encodedAssetCredential.isNone).toBe(true)
    // Verify the number of credentials has decreased by one
    expect(allAssetCredentialsAfterRevocation.length).toEqual(
      allAssetCredentialsBeforeRevocation.length - 1
    )
  }, 60_000)
})

describe('When there is an issued public credential', () => {
  let credential: IPublicCredential

  beforeAll(async () => {
    latestCredential = {
      claims: {
        name: `Certified NFT collection with id ${UUID.generate()}`,
      },
      cTypeHash: CType.getHashForSchema(nftNameCType),
      delegationId: null,
      subject: assetId,
    }

    await issueCredential(latestCredential)
    const credentialId = PublicCredential.getIdForCredential(
      latestCredential,
      attester.uri
    )
    credential = await PublicCredential.fetchCredentialFromChain(credentialId)
  })

  it('should be successfully verified when another party receives it', async () => {
    await expect(
      PublicCredential.verifyCredential(credential)
    ).resolves.not.toThrow()
  })

  it('should not be verified when another party receives it if it does not have an ID', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...credentialWithoutId } = credential
    await expect(
      PublicCredential.verifyCredential(credentialWithoutId as any)
    ).rejects.toThrow()
  })

  it('should not be verified when another party receives it if it does not have a ctype hash', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { cTypeHash, ...credentialWithoutCTypeHash } = credential
    await expect(
      PublicCredential.verifyCredential(credentialWithoutCTypeHash as any)
    ).rejects.toThrow()
  })

  it('should not be verified when another party receives it if it has a different ctype hash', async () => {
    const credentialWithDifferentCTypeHash = {
      ...credential,
      cTypeHash:
        '0x1122334455667788112233445566778811223344556677881122334455667788' as HexString,
    }
    await expect(
      PublicCredential.verifyCredential(credentialWithDifferentCTypeHash)
    ).rejects.toThrow()
  })

  it('should not be verified when another party receives it if it has different delegation info', async () => {
    const credentialWithDifferentDelegationId = {
      ...credential,
      delegationId:
        '0x1122334455667788112233445566778811223344556677881122334455667788' as HexString,
    }
    await expect(
      PublicCredential.verifyCredential(credentialWithDifferentDelegationId)
    ).rejects.toThrow()
  })

  it('should not be verified when another party receives it if it does not have a subject', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { subject, ...credentialWithoutSubject } = credential
    await expect(
      PublicCredential.verifyCredential(credentialWithoutSubject as any)
    ).rejects.toThrow()
  })

  it('should not be verified when another party receives it if it has a different subject', async () => {
    const credentialWithDifferentSubject = {
      ...credential,
      subject:
        'did:asset:eip155:1.erc721:0x6d19295A5E47199D823D8793942b21a256ef1A4d' as AssetDidUri,
    }
    await expect(
      PublicCredential.verifyCredential(credentialWithDifferentSubject)
    ).rejects.toThrow()
  })

  it('should not be verified when another party receives it if it does not have claims', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { claims, ...credentialWithoutClaims } = credential
    await expect(
      PublicCredential.verifyCredential(credentialWithoutClaims as any)
    ).rejects.toThrow()
  })

  it('should not be verified when another party receives it if it has different claims', async () => {
    const credentialWithDifferentSubject = {
      ...credential,
      claims: {
        name: 'Just a different name',
      },
    }
    await expect(
      PublicCredential.verifyCredential(credentialWithDifferentSubject)
    ).rejects.toThrow()
  })

  it('should not be verified when another party receives it if it does not have attester info', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { attester: att, ...credentialWithoutAttester } = credential
    await expect(
      PublicCredential.verifyCredential(credentialWithoutAttester as any)
    ).rejects.toThrow()
  })

  it('should not be verified when another party receives it if it has different attester info', async () => {
    const credentialWithDifferentAttester = {
      ...credential,
      attester: Did.getFullDidUri(devAlice.address),
    }
    await expect(
      PublicCredential.verifyCredential(credentialWithDifferentAttester)
    ).rejects.toThrow()
  })

  // CType verification is actually broken
  it.skip('should not be verified when another party receives it if it does not match a provided ctype', async () => {
    await expect(
      PublicCredential.verifyCredential(credential, {
        cType: CType.fromProperties('Test CType', {
          name: {
            type: 'string',
          },
        }),
      })
    ).rejects.toThrow()
  })

  it('should not be verified when another party receives it if it does not have a block number', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { blockNumber, ...credentialWithoutBlockNumber } = credential
    await expect(
      PublicCredential.verifyCredential(credentialWithoutBlockNumber as any)
    ).rejects.toThrow()
  })

  it('should not be verified when another party receives it if it has a different block number', async () => {
    const credentialWithDifferentBlockNumber = {
      ...credential,
      blockNumber: new BN(99999),
    }
    await expect(
      PublicCredential.verifyCredential(credentialWithDifferentBlockNumber)
    ).rejects.toThrow()
  })

  it('should not be verified when another party receives it if it does not have revocation info', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { revoked, ...credentialWithoutRevocationInfo } = credential
    await expect(
      PublicCredential.verifyCredential(credentialWithoutRevocationInfo as any)
    ).rejects.toThrow()
  })

  it('should not be verified when another party receives it if it has a different revocation info', async () => {
    // Revoke first
    const revocationTx = api.tx.publicCredentials.revoke(credential.id, null)
    const authorizedTx = await Did.authorizeTx(
      attester.uri,
      revocationTx,
      attesterKey.getSignCallback(attester),
      tokenHolder.address
    )
    await submitTx(authorizedTx, tokenHolder)

    // credential has revoked: false, but it is now true
    await expect(
      PublicCredential.verifyCredential(credential)
    ).rejects.toThrow()
  })

  it('should be successfully verified if the credential content is authentic even if the credential has been revoked', async () => {
    await expect(
      PublicCredential.verifyCredential({
        ...credential,
        revoked: true,
      })
    ).resolves.not.toThrow()
  })
})

describe('When there is a batch which contains a credential creation', () => {
  beforeAll(async () => {
    assetId = `did:asset:eip155:1.erc20:${randomAsHex(20)}`
    const credential1 = {
      claims: {
        name: `Certified NFT collection with id ${UUID.generate()}`,
      },
      cTypeHash: CType.getHashForSchema(nftNameCType),
      delegationId: null,
      subject: assetId,
    }
    const credential2 = {
      claims: {
        name: `Certified NFT collection with id ${UUID.generate()}`,
      },
      cTypeHash: CType.getHashForSchema(nftNameCType),
      delegationId: null,
      subject: assetId,
    }
    const credential3 = {
      claims: {
        name: `Certified NFT collection with id ${UUID.generate()}`,
      },
      cTypeHash: CType.getHashForSchema(nftNameCType),
      delegationId: null,
      subject: assetId,
    }
    // A batchAll with a DID call, and a nested batch with a second DID call and a nested forceBatch batch with a third DID call.
    const currentAttesterNonce = Did.documentFromChain(
      await api.query.did.did(Did.toChain(attester.uri))
    ).lastTxCounter
    const batchTx = api.tx.utility.batchAll([
      await Did.authorizeTx(
        attester.uri,
        api.tx.publicCredentials.add(PublicCredential.toChain(credential1)),
        attesterKey.getSignCallback(attester),
        tokenHolder.address,
        { txCounter: currentAttesterNonce.addn(1) }
      ),
      api.tx.utility.batch([
        await Did.authorizeTx(
          attester.uri,
          api.tx.publicCredentials.add(PublicCredential.toChain(credential2)),
          attesterKey.getSignCallback(attester),
          tokenHolder.address,
          { txCounter: currentAttesterNonce.addn(2) }
        ),
        api.tx.utility.forceBatch([
          await Did.authorizeTx(
            attester.uri,
            api.tx.publicCredentials.add(PublicCredential.toChain(credential3)),
            attesterKey.getSignCallback(attester),
            tokenHolder.address,
            { txCounter: currentAttesterNonce.addn(3) }
          ),
        ]),
      ]),
    ])
    await submitTx(batchTx, tokenHolder)
  })

  it('should correctly parse the block and retrieve the original credentials', async () => {
    const retrievedCredentials =
      await PublicCredential.fetchCredentialsFromChain(assetId)
    expect(retrievedCredentials.length).toEqual(3)
    await expect(
      PublicCredential.verifyCredential(retrievedCredentials[0])
    ).resolves.not.toThrow()
    await expect(
      PublicCredential.verifyCredential(retrievedCredentials[1])
    ).resolves.not.toThrow()
    await expect(
      PublicCredential.verifyCredential(retrievedCredentials[2])
    ).resolves.not.toThrow()
  })
})

afterAll(async () => {
  await disconnect()
})
