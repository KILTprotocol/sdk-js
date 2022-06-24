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
    return expect(Attestation.query(claimHash)).resolves.toBeNull()
  }, 30_000)

  it('Attestation.revoke', async () => {
    return expect(
      Attestation.getRemoveTx(claimHash, 0)
        .then((tx) =>
          attester.authorizeExtrinsic(tx, attesterKey.sign, tokenHolder.address)
        )
        .then((tx) => submitExtrinsic(tx, tokenHolder))
    ).rejects.toMatchObject({
      section: 'attestation',
      name: 'AttestationNotFound',
    })
  }, 30_000)

  it('Attestation.remove', async () => {
    return expect(
      Attestation.getRemoveTx(claimHash, 0)
        .then((tx) =>
          attester.authorizeExtrinsic(tx, attesterKey.sign, tokenHolder.address)
        )
        .then((tx) => submitExtrinsic(tx, tokenHolder))
    ).rejects.toMatchObject({
      section: 'attestation',
      name: 'AttestationNotFound',
    })
  }, 30_000)
})

describe('When there is an attester, claimer and ctype drivers license', () => {
  beforeAll(async () => {
    const ctypeExists = await isCtypeOnChain(driversLicenseCType)
    if (!ctypeExists) {
      await attester
        .authorizeExtrinsic(
          await CType.getStoreTx(driversLicenseCType),
          attesterKey.sign,
          tokenHolder.address
        )
        .then((tx) => submitExtrinsic(tx, tokenHolder))
    }
  }, 60_000)

  it('should be possible to make a claim', async () => {
    const content: IClaim['contents'] = { name: 'Ralph', age: 12 }
    const claim = Claim.fromCTypeAndClaimContents(
      driversLicenseCType,
      content,
      claimer.uri
    )
    const request = Credential.fromClaim(claim)
    await Credential.signWithDidKey(
      request,
      claimerKey.sign,
      claimer,
      claimer.authenticationKey.id
    )
    expect(Credential.verifyDataIntegrity(request)).toBe(true)
    await expect(Credential.verifySignature(request)).resolves.toBe(true)
    expect(request.claim.contents).toMatchObject(content)
  })

  it('should be possible to attest a claim and then claim the attestation deposit back', async () => {
    const content: IClaim['contents'] = { name: 'Ralph', age: 12 }

    const claim = Claim.fromCTypeAndClaimContents(
      driversLicenseCType,
      content,
      claimer.uri
    )
    const request = Credential.fromClaim(claim)
    expect(Credential.verifyDataIntegrity(request)).toBe(true)
    await Credential.signWithDidKey(
      request,
      claimerKey.sign,
      claimer,
      claimer.authenticationKey.id
    )
    await expect(Credential.verifySignature(request)).resolves.toBe(true)
    await expect(Credential.verify(request)).resolves.not.toThrow()
    const attestation = Attestation.fromCredentialAndDid(request, attester.uri)
    await Attestation.getStoreTx(attestation)
      .then((call) =>
        attester.authorizeExtrinsic(call, attesterKey.sign, tokenHolder.address)
      )
      .then((tx) => submitExtrinsic(tx, tokenHolder))

    // Claim the deposit back by submitting the reclaimDeposit extrinsic with the deposit payer's account.
    await Attestation.getReclaimDepositTx(attestation.claimHash).then((tx) =>
      submitExtrinsic(tx, tokenHolder)
    )

    // Test that the attestation has been deleted.
    await expect(Attestation.query(attestation.claimHash)).resolves.toBeNull()
    await expect(
      Attestation.checkValidity(attestation.claimHash)
    ).resolves.toBeFalsy()
  }, 60_000)

  it('should not be possible to attest a claim without enough tokens', async () => {
    const content: IClaim['contents'] = { name: 'Ralph', age: 12 }

    const claim = Claim.fromCTypeAndClaimContents(
      driversLicenseCType,
      content,
      claimer.uri
    )
    const request = Credential.fromClaim(claim)
    expect(Credential.verifyDataIntegrity(request)).toBe(true)
    await Credential.signWithDidKey(
      request,
      claimerKey.sign,
      claimer,
      claimer.authenticationKey.id
    )
    await expect(Credential.verifySignature(request)).resolves.toBe(true)
    const attestation = Attestation.fromCredentialAndDid(request, attester.uri)

    const { keypair, sign } = makeSigningKeyTool()

    await expect(
      Attestation.getStoreTx(attestation)
        .then((call) =>
          attester.authorizeExtrinsic(call, sign, keypair.address)
        )
        .then((tx) => submitExtrinsic(tx, keypair))
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"1010: Invalid Transaction: Inability to pay some fees , e.g. account balance too low"`
    )

    await expect(
      Attestation.checkValidity(attestation.claimHash)
    ).resolves.toBeFalsy()
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
    const request = Credential.fromClaim(claim)
    const attestation = Attestation.fromCredentialAndDid(request, attester.uri)
    await expect(
      Attestation.getStoreTx(attestation)
        .then((call) =>
          attester.authorizeExtrinsic(
            call,
            attesterKey.sign,
            tokenHolder.address
          )
        )
        .then((tx) => submitExtrinsic(tx, tokenHolder))
    ).rejects.toMatchObject({ section: 'ctype', name: 'CTypeNotFound' })
  }, 60_000)

  describe('when there is a credential on-chain', () => {
    let request: ICredential
    let attestation: IAttestation

    beforeAll(async () => {
      const content: IClaim['contents'] = { name: 'Rolfi', age: 18 }
      const claim = Claim.fromCTypeAndClaimContents(
        driversLicenseCType,
        content,
        claimer.uri
      )
      request = Credential.fromClaim(claim)
      await Credential.signWithDidKey(
        request,
        claimerKey.sign,
        claimer,
        claimer.authenticationKey.id
      )
      attestation = Attestation.fromCredentialAndDid(request, attester.uri)
      await Attestation.getStoreTx(attestation)
        .then((call) =>
          attester.authorizeExtrinsic(
            call,
            attesterKey.sign,
            tokenHolder.address
          )
        )
        .then((tx) => submitExtrinsic(tx, tokenHolder))
      await expect(Credential.verify(request)).resolves.not.toThrow()
      await expect(
        Attestation.checkValidity(attestation.claimHash)
      ).resolves.toBeTruthy()
    }, 60_000)

    it('should not be possible to attest the same claim twice', async () => {
      await expect(
        Attestation.getStoreTx(attestation)
          .then((call) =>
            attester.authorizeExtrinsic(
              call,
              attesterKey.sign,
              tokenHolder.address
            )
          )
          .then((tx) => submitExtrinsic(tx, tokenHolder))
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
        request,
        claimerKey.sign,
        claimer,
        claimer.authenticationKey.id
      )

      expect(
        Attestation.verifyAgainstCredential(attestation, fakecredential)
      ).toBeFalsy()
    }, 15_000)

    it('should not be possible for the claimer to revoke an attestation', async () => {
      await expect(
        getRevokeTx(attestation.claimHash, 0)
          .then((call) =>
            claimer.authorizeExtrinsic(
              call,
              claimerKey.sign,
              tokenHolder.address
            )
          )
          .then((tx) => submitExtrinsic(tx, tokenHolder))
      ).rejects.toMatchObject({ section: 'attestation', name: 'Unauthorized' })
      await expect(
        Attestation.checkValidity(attestation.claimHash)
      ).resolves.toBe(true)
    }, 45_000)

    it('should be possible for the attester to revoke an attestation', async () => {
      await expect(
        Attestation.checkValidity(attestation.claimHash)
      ).resolves.toBe(true)
      await getRevokeTx(Credential.getHash(request), 0)
        .then((call) =>
          attester.authorizeExtrinsic(
            call,
            attesterKey.sign,
            tokenHolder.address
          )
        )
        .then((tx) => submitExtrinsic(tx, tokenHolder))
      await expect(
        Attestation.checkValidity(attestation.claimHash)
      ).resolves.toBeFalsy()
    }, 40_000)

    it('should be possible for the deposit payer to remove an attestation', async () => {
      await getRemoveTx(attestation.claimHash, 0)
        .then((call) =>
          attester.authorizeExtrinsic(
            call,
            attesterKey.sign,
            tokenHolder.address
          )
        )
        .then((tx) => submitExtrinsic(tx, tokenHolder))
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
      if (!(await isCtypeOnChain(officialLicenseAuthorityCType))) {
        await CType.getStoreTx(officialLicenseAuthorityCType)
          .then((call) =>
            attester.authorizeExtrinsic(
              call,
              attesterKey.sign,
              tokenHolder.address
            )
          )
          .then((tx) => submitExtrinsic(tx, tokenHolder))
      }
      await expect(isCtypeOnChain(officialLicenseAuthorityCType)).resolves.toBe(
        true
      )
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
      const request1 = Credential.fromClaim(licenseAuthorization)
      await Credential.signWithDidKey(
        request1,
        claimerKey.sign,
        claimer,
        claimer.authenticationKey.id
      )
      const licenseAuthorizationGranted = Attestation.fromCredentialAndDid(
        request1,
        anotherAttester.uri
      )
      await Attestation.getStoreTx(licenseAuthorizationGranted)
        .then((call) =>
          anotherAttester.authorizeExtrinsic(
            call,
            anotherAttesterKey.sign,
            tokenHolder.address
          )
        )
        .then((tx) => submitExtrinsic(tx, tokenHolder))
      // make request including legitimation
      const iBelieveICanDrive = Claim.fromCTypeAndClaimContents(
        driversLicenseCType,
        { name: 'Dominic Toretto', age: 52 },
        claimer.uri
      )
      const request2 = Credential.fromClaim(iBelieveICanDrive, {
        legitimations: [request1],
      })
      await Credential.signWithDidKey(
        request2,
        claimerKey.sign,
        claimer,
        claimer.authenticationKey.id
      )
      const licenseGranted = Attestation.fromCredentialAndDid(
        request2,
        attester.uri
      )
      await Attestation.getStoreTx(licenseGranted)
        .then((call) =>
          attester.authorizeExtrinsic(
            call,
            attesterKey.sign,
            tokenHolder.address
          )
        )
        .then((tx) => submitExtrinsic(tx, tokenHolder))
      await Promise.all([
        expect(
          Attestation.checkValidity(licenseGranted.claimHash)
        ).resolves.toBe(true),
        expect(
          Attestation.checkValidity(licenseAuthorizationGranted.claimHash)
        ).resolves.toBe(true),
      ])
      expect(
        Attestation.verifyAgainstCredential(licenseGranted, request2)
      ).toBeTruthy()
      expect(
        Attestation.verifyAgainstCredential(
          licenseAuthorizationGranted,
          request1
        )
      ).toBeTruthy()
    }, 70_000)
  })
})

afterAll(() => {
  disconnect()
})
