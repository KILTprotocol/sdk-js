/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group integration/attestation
 */

import type {
  DidDetails,
  IAttestation,
  ICredential,
  KiltKeyringPair,
} from '@kiltprotocol/types'
import {
  createFullDidFromSeed,
  KeyTool,
  makeSigningKeyTool,
} from '@kiltprotocol/testing'
import * as Did from '@kiltprotocol/did'
import { Crypto } from '@kiltprotocol/utils'
import { BlockchainApiConnection } from '@kiltprotocol/chain-helpers'
import { ApiPromise } from '@polkadot/api'
import * as Attestation from '../attestation'
import { getRemoveTx, getRevokeTx } from '../attestation/Attestation.chain'
import * as Credential from '../credential'
import { disconnect } from '../kilt'
import * as Claim from '../claim'
import * as CType from '../ctype'
import {
  createEndowedTestAccount,
  driversLicenseCType,
  initializeApi,
  isCtypeOnChain,
  submitExtrinsic,
} from './utils'

let tokenHolder: KiltKeyringPair
let attester: DidDetails
let attesterKey: KeyTool

let anotherAttester: DidDetails
let anotherAttesterKey: KeyTool

let claimer: DidDetails
let claimerKey: KeyTool

let api: ApiPromise
beforeAll(async () => {
  await initializeApi()
  api = await BlockchainApiConnection.getConnectionOrConnect()
}, 30_000)

beforeAll(async () => {
  tokenHolder = await createEndowedTestAccount()
  attesterKey = makeSigningKeyTool()
  anotherAttesterKey = makeSigningKeyTool()
  claimerKey = makeSigningKeyTool()
  attester = await createFullDidFromSeed(tokenHolder, attesterKey.keypair)
  anotherAttester = await createFullDidFromSeed(
    tokenHolder,
    anotherAttesterKey.keypair
  )
  claimer = await createFullDidFromSeed(tokenHolder, claimerKey.keypair)
}, 60_000)

it('fetches the correct deposit amount', async () => {
  const depositAmount = await Attestation.queryDepositAmount()
  expect(['120950000000000', '120900000000000']).toContain(
    depositAmount.toString()
  )
})

describe('handling attestations that do not exist', () => {
  const claimHash = Crypto.hashStr('abcde')
  it('Attestation.query', async () => {
    expect(await Attestation.query(claimHash)).toBeNull()
  }, 30_000)

  it('Attestation.getRevokeTx', async () => {
    const draft = await Attestation.getRevokeTx(claimHash, 0)
    const authorized = await Did.authorizeExtrinsic(
      attester,
      draft,
      attesterKey.sign,
      tokenHolder.address
    )
    await expect(
      submitExtrinsic(authorized, tokenHolder)
    ).rejects.toMatchObject({
      section: 'attestation',
      name: 'AttestationNotFound',
    })
  }, 30_000)

  it('Attestation.getRemoveTx', async () => {
    const draft = await Attestation.getRemoveTx(claimHash, 0)
    const authorized = await Did.authorizeExtrinsic(
      attester,
      draft,
      attesterKey.sign,
      tokenHolder.address
    )
    await expect(
      submitExtrinsic(authorized, tokenHolder)
    ).rejects.toMatchObject({
      section: 'attestation',
      name: 'AttestationNotFound',
    })
  }, 30_000)
})

describe('When there is an attester, claimer and ctype drivers license', () => {
  beforeAll(async () => {
    const ctypeExists = await isCtypeOnChain(driversLicenseCType)
    if (ctypeExists) return
    const tx = await Did.authorizeExtrinsic(
      attester,
      api.tx.ctype.add(CType.encodeCType(driversLicenseCType)),
      attesterKey.sign,
      tokenHolder.address
    )
    await submitExtrinsic(tx, tokenHolder)
  }, 60_000)

  it('should be possible to make a claim', async () => {
    const content = { name: 'Ralph', age: 12 }
    const claim = Claim.fromCTypeAndClaimContents(
      driversLicenseCType,
      content,
      claimer.uri
    )
    const credential = Credential.fromClaim(claim)
    await Credential.sign(
      credential,
      claimerKey.sign,
      claimer,
      claimer.authentication[0].id
    )
    expect(Credential.verifyDataIntegrity(credential)).toBe(true)
    expect(await Credential.verifySignature(credential)).toBe(true)
    expect(credential.claim.contents).toMatchObject(content)
  })

  it('should be possible to attest a claim and then claim the attestation deposit back', async () => {
    const content = { name: 'Ralph', age: 12 }

    const claim = Claim.fromCTypeAndClaimContents(
      driversLicenseCType,
      content,
      claimer.uri
    )
    const credential = Credential.fromClaim(claim)
    expect(Credential.verifyDataIntegrity(credential)).toBe(true)

    await Credential.sign(
      credential,
      claimerKey.sign,
      claimer,
      claimer.authentication[0].id
    )
    expect(await Credential.verifySignature(credential)).toBe(true)
    await Credential.verify(credential)

    const attestation = Attestation.fromCredentialAndDid(
      credential,
      attester.uri
    )
    const storeTx = await Attestation.getStoreTx(attestation)
    const authorizedStoreTx = await Did.authorizeExtrinsic(
      attester,
      storeTx,
      attesterKey.sign,
      tokenHolder.address
    )
    await submitExtrinsic(authorizedStoreTx, tokenHolder)
    expect(await Attestation.checkValidity(attestation.claimHash)).toBe(true)

    // Claim the deposit back by submitting the reclaimDeposit extrinsic with the deposit payer's account.
    const reclaimTx = await Attestation.getReclaimDepositTx(
      attestation.claimHash
    )
    await submitExtrinsic(reclaimTx, tokenHolder)

    // Test that the attestation has been deleted.
    expect(await Attestation.query(attestation.claimHash)).toBeNull()
    expect(await Attestation.checkValidity(attestation.claimHash)).toBe(false)
  }, 60_000)

  it('should not be possible to attest a claim without enough tokens', async () => {
    const content = { name: 'Ralph', age: 12 }

    const claim = Claim.fromCTypeAndClaimContents(
      driversLicenseCType,
      content,
      claimer.uri
    )
    const credential = Credential.fromClaim(claim)
    expect(Credential.verifyDataIntegrity(credential)).toBe(true)

    await Credential.sign(
      credential,
      claimerKey.sign,
      claimer,
      claimer.authentication[0].id
    )
    expect(await Credential.verifySignature(credential)).toBe(true)

    const attestation = Attestation.fromCredentialAndDid(
      credential,
      attester.uri
    )
    const { keypair, sign } = makeSigningKeyTool()

    const storeTx = await Attestation.getStoreTx(attestation)
    const authorizedStoreTx = await Did.authorizeExtrinsic(
      attester,
      storeTx,
      sign,
      keypair.address
    )
    await expect(
      submitExtrinsic(authorizedStoreTx, keypair)
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"1010: Invalid Transaction: Inability to pay some fees , e.g. account balance too low"`
    )

    expect(await Attestation.checkValidity(attestation.claimHash)).toBe(false)
  }, 60_000)

  it('should not be possible to attest a claim on a Ctype that is not on chain', async () => {
    const badCtype = CType.fromSchema({
      $id: 'kilt:ctype:0x1',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
      title: 'badDriversLicense',
      properties: {
        name: {
          type: 'string',
        },
        weight: {
          type: 'integer',
        },
      },
      type: 'object',
    })

    const content = { name: 'Ralph', weight: 120 }
    const claim = Claim.fromCTypeAndClaimContents(
      badCtype,
      content,
      claimer.uri
    )
    const credential = Credential.fromClaim(claim)
    const attestation = Attestation.fromCredentialAndDid(
      credential,
      attester.uri
    )
    const storeTx = await Attestation.getStoreTx(attestation)
    const authorizedStoreTx = await Did.authorizeExtrinsic(
      attester,
      storeTx,
      attesterKey.sign,
      tokenHolder.address
    )

    await expect(
      submitExtrinsic(authorizedStoreTx, tokenHolder)
    ).rejects.toMatchObject({ section: 'ctype', name: 'CTypeNotFound' })
  }, 60_000)

  describe('when there is a credential on-chain', () => {
    let credential: ICredential
    let attestation: IAttestation

    beforeAll(async () => {
      const content = { name: 'Rolfi', age: 18 }
      const claim = Claim.fromCTypeAndClaimContents(
        driversLicenseCType,
        content,
        claimer.uri
      )
      credential = Credential.fromClaim(claim)
      await Credential.sign(
        credential,
        claimerKey.sign,
        claimer,
        claimer.authentication[0].id
      )
      attestation = Attestation.fromCredentialAndDid(credential, attester.uri)
      const storeTx = await Attestation.getStoreTx(attestation)
      const authorizedStoreTx = await Did.authorizeExtrinsic(
        attester,
        storeTx,
        attesterKey.sign,
        tokenHolder.address
      )
      await submitExtrinsic(authorizedStoreTx, tokenHolder)

      await Credential.verify(credential)
      expect(await Attestation.checkValidity(attestation.claimHash)).toBe(true)
    }, 60_000)

    it('should not be possible to attest the same claim twice', async () => {
      const storeTx = await Attestation.getStoreTx(attestation)
      const authorizedStoreTx = await Did.authorizeExtrinsic(
        attester,
        storeTx,
        attesterKey.sign,
        tokenHolder.address
      )

      await expect(
        submitExtrinsic(authorizedStoreTx, tokenHolder)
      ).rejects.toMatchObject({
        section: 'attestation',
        name: 'AlreadyAttested',
      })
    }, 15_000)

    it('should not be possible to use attestation for different claim', async () => {
      const content = { name: 'Rolfi', age: 19 }
      const claim = Claim.fromCTypeAndClaimContents(
        driversLicenseCType,
        content,
        claimer.uri
      )
      const fakeCredential = Credential.fromClaim(claim)
      await Credential.sign(
        credential,
        claimerKey.sign,
        claimer,
        claimer.authentication[0].id
      )

      expect(
        Attestation.verifyAgainstCredential(attestation, fakeCredential)
      ).toBe(false)
    }, 15_000)

    it('should not be possible for the claimer to revoke an attestation', async () => {
      const revokeTx = await getRevokeTx(attestation.claimHash, 0)
      const authorizedRevokeTx = await Did.authorizeExtrinsic(
        claimer,
        revokeTx,
        claimerKey.sign,
        tokenHolder.address
      )

      await expect(
        submitExtrinsic(authorizedRevokeTx, tokenHolder)
      ).rejects.toMatchObject({ section: 'attestation', name: 'Unauthorized' })
      expect(await Attestation.checkValidity(attestation.claimHash)).toBe(true)
    }, 45_000)

    it('should be possible for the attester to revoke an attestation', async () => {
      expect(await Attestation.checkValidity(attestation.claimHash)).toBe(true)

      const revokeTx = await getRevokeTx(attestation.claimHash, 0)
      const authorizedRevokeTx = await Did.authorizeExtrinsic(
        attester,
        revokeTx,
        attesterKey.sign,
        tokenHolder.address
      )
      await submitExtrinsic(authorizedRevokeTx, tokenHolder)

      expect(await Attestation.checkValidity(credential.rootHash)).toBe(false)
    }, 40_000)

    it('should be possible for the deposit payer to remove an attestation', async () => {
      const removeTx = await getRemoveTx(attestation.claimHash, 0)
      const authorizedRemoveTx = await Did.authorizeExtrinsic(
        attester,
        removeTx,
        attesterKey.sign,
        tokenHolder.address
      )
      await submitExtrinsic(authorizedRemoveTx, tokenHolder)
    }, 40_000)
  })

  describe('when there is another Ctype that works as a legitimation', () => {
    const officialLicenseAuthorityCType = CType.fromSchema({
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
      title: 'License Authority',
      properties: {
        LicenseType: {
          type: 'string',
        },
        LicenseSubtypes: {
          type: 'string',
        },
      },
      type: 'object',
    })

    beforeAll(async () => {
      if (await isCtypeOnChain(officialLicenseAuthorityCType)) return

      const storeTx = api.tx.ctype.add(
        CType.encodeCType(officialLicenseAuthorityCType)
      )
      const authorizedStoreTx = await Did.authorizeExtrinsic(
        attester,
        storeTx,
        attesterKey.sign,
        tokenHolder.address
      )
      await submitExtrinsic(authorizedStoreTx, tokenHolder)

      expect(await isCtypeOnChain(officialLicenseAuthorityCType)).toBe(true)
    }, 45_000)

    it('can be included in a claim as a legitimation', async () => {
      // make credential to be used as legitimation
      const licenseAuthorization = Claim.fromCTypeAndClaimContents(
        officialLicenseAuthorityCType,
        {
          LicenseType: "Driver's License",
          LicenseSubtypes: 'sports cars, tanks',
        },
        attester.uri
      )
      const credential1 = Credential.fromClaim(licenseAuthorization)
      await Credential.sign(
        credential1,
        claimerKey.sign,
        claimer,
        claimer.authentication[0].id
      )
      const licenseAuthorizationGranted = Attestation.fromCredentialAndDid(
        credential1,
        anotherAttester.uri
      )
      const storeTx = await Attestation.getStoreTx(licenseAuthorizationGranted)
      const authorizedStoreTx = await Did.authorizeExtrinsic(
        anotherAttester,
        storeTx,
        anotherAttesterKey.sign,
        tokenHolder.address
      )
      await submitExtrinsic(authorizedStoreTx, tokenHolder)

      // make credential including legitimation
      const iBelieveICanDrive = Claim.fromCTypeAndClaimContents(
        driversLicenseCType,
        { name: 'Dominic Toretto', age: 52 },
        claimer.uri
      )
      const credential2 = Credential.fromClaim(iBelieveICanDrive, {
        legitimations: [credential1],
      })
      await Credential.sign(
        credential2,
        claimerKey.sign,
        claimer,
        claimer.authentication[0].id
      )
      const licenseGranted = Attestation.fromCredentialAndDid(
        credential2,
        attester.uri
      )
      const storeTx2 = await Attestation.getStoreTx(licenseGranted)
      const authorizedStoreTx2 = await Did.authorizeExtrinsic(
        attester,
        storeTx2,
        attesterKey.sign,
        tokenHolder.address
      )
      await submitExtrinsic(authorizedStoreTx2, tokenHolder)

      expect(await Attestation.checkValidity(licenseGranted.claimHash)).toBe(
        true
      )
      expect(
        await Attestation.checkValidity(licenseAuthorizationGranted.claimHash)
      ).toBe(true)
      expect(
        Attestation.verifyAgainstCredential(licenseGranted, credential2)
      ).toBe(true)
      expect(
        Attestation.verifyAgainstCredential(
          licenseAuthorizationGranted,
          credential1
        )
      ).toBe(true)
    }, 70_000)
  })
})

afterAll(async () => {
  await disconnect()
})
