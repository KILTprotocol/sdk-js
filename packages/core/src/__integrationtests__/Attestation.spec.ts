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
  IAttestation,
  IClaim,
  ICredential,
  KeyringPair,
} from '@kiltprotocol/types'
import {
  createFullDidFromSeed,
  KeyTool,
  makeSigningKeyTool,
} from '@kiltprotocol/testing'
import { FullDidDetails } from '@kiltprotocol/did'
import { Crypto } from '@kiltprotocol/utils'
import * as Attestation from '../attestation'
import { getRemoveTx, getRevokeTx } from '../attestation/Attestation.chain'
import * as Credential from '../requestforattestation'
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

let tokenHolder: KeyringPair
let attester: FullDidDetails
let attesterKey: KeyTool

let anotherAttester: FullDidDetails
let anotherAttesterKey: KeyTool

let claimer: FullDidDetails
let claimerKey: KeyTool

beforeAll(async () => {
  await initializeApi()
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
    const authorized = await attester.authorizeExtrinsic(
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
    const authorized = await attester.authorizeExtrinsic(
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
    const tx = await attester.authorizeExtrinsic(
      await CType.getStoreTx(driversLicenseCType),
      attesterKey.sign,
      tokenHolder.address
    )
    await submitExtrinsic(tx, tokenHolder)
  }, 60_000)

  it('should be possible to make a claim', async () => {
    const content: IClaim['contents'] = { name: 'Ralph', age: 12 }
    const claim = Claim.fromCTypeAndClaimContents(
      driversLicenseCType,
      content,
      claimer.uri
    )
    const credential = Credential.fromClaim(claim)
    await Credential.signWithDidKey(
      credential,
      claimerKey.sign,
      claimer,
      claimer.authenticationKey.id
    )
    expect(Credential.verifyDataIntegrity(credential)).toBe(true)
    await expect(Credential.verifySignature(credential)).resolves.toBe(true)
    expect(credential.claim.contents).toMatchObject(content)
  })

  it('should be possible to attest a claim and then claim the attestation deposit back', async () => {
    const content: IClaim['contents'] = { name: 'Ralph', age: 12 }

    const claim = Claim.fromCTypeAndClaimContents(
      driversLicenseCType,
      content,
      claimer.uri
    )
    const credential = Credential.fromClaim(claim)
    expect(Credential.verifyDataIntegrity(credential)).toBe(true)

    await Credential.signWithDidKey(
      credential,
      claimerKey.sign,
      claimer,
      claimer.authenticationKey.id
    )
    expect(await Credential.verifySignature(credential)).toBe(true)
    await Credential.verify(credential)

    const attestation = Attestation.fromCredentialAndDid(
      credential,
      attester.uri
    )
    const storeTx = await Attestation.getStoreTx(attestation)
    const authorizedStoreTx = await attester.authorizeExtrinsic(
      storeTx,
      attesterKey.sign,
      tokenHolder.address
    )
    await submitExtrinsic(authorizedStoreTx, tokenHolder)
    expect(await Attestation.checkValidity(attestation.claimHash)).toBeTruthy()

    // Claim the deposit back by submitting the reclaimDeposit extrinsic with the deposit payer's account.
    const reclaimTx = await Attestation.getReclaimDepositTx(
      attestation.claimHash
    )
    await submitExtrinsic(reclaimTx, tokenHolder)

    // Test that the attestation has been deleted.
    expect(await Attestation.query(attestation.claimHash)).toBeNull()
    expect(await Attestation.checkValidity(attestation.claimHash)).toBeFalsy()
  }, 60_000)

  it('should not be possible to attest a claim without enough tokens', async () => {
    const content: IClaim['contents'] = { name: 'Ralph', age: 12 }

    const claim = Claim.fromCTypeAndClaimContents(
      driversLicenseCType,
      content,
      claimer.uri
    )
    const credential = Credential.fromClaim(claim)
    expect(Credential.verifyDataIntegrity(credential)).toBe(true)

    await Credential.signWithDidKey(
      credential,
      claimerKey.sign,
      claimer,
      claimer.authenticationKey.id
    )
    expect(await Credential.verifySignature(credential)).toBe(true)

    const attestation = Attestation.fromCredentialAndDid(
      credential,
      attester.uri
    )
    const { keypair, sign } = makeSigningKeyTool()

    const storeTx = await Attestation.getStoreTx(attestation)
    const authorizedStoreTx = await attester.authorizeExtrinsic(
      storeTx,
      sign,
      keypair.address
    )
    await expect(
      submitExtrinsic(authorizedStoreTx, keypair)
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"1010: Invalid Transaction: Inability to pay some fees , e.g. account balance too low"`
    )

    expect(await Attestation.checkValidity(attestation.claimHash)).toBeFalsy()
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

    const content: IClaim['contents'] = { name: 'Ralph', weight: 120 }
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
    const authorizedStoreTx = await attester.authorizeExtrinsic(
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
      const content: IClaim['contents'] = { name: 'Rolfi', age: 18 }
      const claim = Claim.fromCTypeAndClaimContents(
        driversLicenseCType,
        content,
        claimer.uri
      )
      credential = Credential.fromClaim(claim)
      await Credential.signWithDidKey(
        credential,
        claimerKey.sign,
        claimer,
        claimer.authenticationKey.id
      )
      attestation = Attestation.fromCredentialAndDid(credential, attester.uri)
      const storeTx = await Attestation.getStoreTx(attestation)
      const authorizedStoreTx = await attester.authorizeExtrinsic(
        storeTx,
        attesterKey.sign,
        tokenHolder.address
      )
      await submitExtrinsic(authorizedStoreTx, tokenHolder)

      await Credential.verify(credential)
      expect(
        await Attestation.checkValidity(attestation.claimHash)
      ).toBeTruthy()
    }, 60_000)

    it('should not be possible to attest the same claim twice', async () => {
      const storeTx = await Attestation.getStoreTx(attestation)
      const authorizedStoreTx = await attester.authorizeExtrinsic(
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
      const fakecredential = Credential.fromClaim(claim)
      await Credential.signWithDidKey(
        credential,
        claimerKey.sign,
        claimer,
        claimer.authenticationKey.id
      )

      expect(
        Attestation.verifyAgainstCredential(attestation, fakecredential)
      ).toBeFalsy()
    }, 15_000)

    it('should not be possible for the claimer to revoke an attestation', async () => {
      const revokeTx = await getRevokeTx(attestation.claimHash, 0)
      const authorizedRevokeTx = await claimer.authorizeExtrinsic(
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
      const authorizedRevokeTx = await attester.authorizeExtrinsic(
        revokeTx,
        attesterKey.sign,
        tokenHolder.address
      )
      await submitExtrinsic(authorizedRevokeTx, tokenHolder)

      expect(await Credential.verify(credential)).toBeFalsy()
    }, 40_000)

    it('should be possible for the deposit payer to remove an attestation', async () => {
      const removeTx = await getRemoveTx(attestation.claimHash, 0)
      const authorizedRemoveTx = await attester.authorizeExtrinsic(
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

      const storeTx = await CType.getStoreTx(officialLicenseAuthorityCType)
      const authorizedStoreTx = await attester.authorizeExtrinsic(
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
          LicenseSubtypes: 'sportscars, tanks',
        },
        attester.uri
      )
      const credential1 = Credential.fromClaim(licenseAuthorization)
      await Credential.signWithDidKey(
        credential1,
        claimerKey.sign,
        claimer,
        claimer.authenticationKey.id
      )
      const licenseAuthorizationGranted = Attestation.fromCredentialAndDid(
        credential1,
        anotherAttester.uri
      )
      const storeTx = await Attestation.getStoreTx(licenseAuthorizationGranted)
      const authorizedStoreTx = await anotherAttester.authorizeExtrinsic(
        storeTx,
        anotherAttesterKey.sign,
        tokenHolder.address
      )
      await submitExtrinsic(authorizedStoreTx, tokenHolder)

      // make request including legitimation
      const iBelieveICanDrive = Claim.fromCTypeAndClaimContents(
        driversLicenseCType,
        { name: 'Dominic Toretto', age: 52 },
        claimer.uri
      )
      const credential2 = Credential.fromClaim(iBelieveICanDrive, {
        legitimations: [credential1],
      })
      await Credential.signWithDidKey(
        credential2,
        claimerKey.sign,
        claimer,
        claimer.authenticationKey.id
      )
      const licenseGranted = Attestation.fromCredentialAndDid(
        credential2,
        attester.uri
      )
      const storeTx2 = await Attestation.getStoreTx(licenseGranted)
      const authorizedStoreTx2 = await attester.authorizeExtrinsic(
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
      ).toBeTruthy()
      expect(
        Attestation.verifyAgainstCredential(
          licenseAuthorizationGranted,
          credential1
        )
      ).toBeTruthy()
    }, 70_000)
  })
})

afterAll(() => {
  disconnect()
})
