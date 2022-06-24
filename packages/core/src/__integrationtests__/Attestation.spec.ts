/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group integration/attestation
 */

import type { IClaim, ICredential, KeyringPair } from '@kiltprotocol/types'
import {
  createFullDidFromSeed,
  KeyTool,
  makeSigningKeyTool,
} from '@kiltprotocol/testing'
import { FullDidDetails } from '@kiltprotocol/did'
import { Crypto } from '@kiltprotocol/utils'
import * as Attestation from '../attestation'
import { getRemoveTx, getRevokeTx } from '../attestation/Attestation.chain'
import * as Credential from '../credential'
import { disconnect } from '../kilt'
import * as Claim from '../claim'
import * as CType from '../ctype'
import * as RequestForAttestation from '../requestforattestation'
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
    await expect(Attestation.query(claimHash)).resolves.toBeNull()
  }, 30_000)

  it('Attestation.revoke', async () => {
    await expect(
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
    await expect(
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
    const request = RequestForAttestation.fromClaim(claim)
    await RequestForAttestation.signWithDidKey(
      request,
      claimerKey.sign,
      claimer,
      claimer.authenticationKey.id
    )
    expect(RequestForAttestation.verifyDataIntegrity(request)).toBe(true)
    await expect(RequestForAttestation.verifySignature(request)).resolves.toBe(
      true
    )
    expect(request.claim.contents).toMatchObject(content)
  })

  it('should be possible to attest a claim and then claim the attestation deposit back', async () => {
    const content: IClaim['contents'] = { name: 'Ralph', age: 12 }

    const claim = Claim.fromCTypeAndClaimContents(
      driversLicenseCType,
      content,
      claimer.uri
    )
    const request = RequestForAttestation.fromClaim(claim)
    expect(RequestForAttestation.verifyDataIntegrity(request)).toBe(true)
    await RequestForAttestation.signWithDidKey(
      request,
      claimerKey.sign,
      claimer,
      claimer.authenticationKey.id
    )
    await expect(RequestForAttestation.verifySignature(request)).resolves.toBe(
      true
    )
    const attestation = Attestation.fromRequestAndDid(request, attester.uri)
    await Attestation.getStoreTx(attestation)
      .then((call) =>
        attester.authorizeExtrinsic(call, attesterKey.sign, tokenHolder.address)
      )
      .then((tx) => submitExtrinsic(tx, tokenHolder))
    const credential = Credential.fromRequestAndAttestation(
      request,
      attestation
    )
    expect(Credential.verifyDataIntegrity(credential)).toBe(true)
    await expect(Credential.verify(credential)).resolves.toBe(true)

    // Claim the deposit back by submitting the reclaimDeposit extrinsic with the deposit payer's account.
    await Attestation.getReclaimDepositTx(attestation.claimHash).then((tx) =>
      submitExtrinsic(tx, tokenHolder)
    )

    // Test that the attestation has been deleted.
    await expect(Attestation.query(attestation.claimHash)).resolves.toBeNull()
    await expect(Attestation.checkValidity(attestation)).resolves.toBeFalsy()
  }, 60_000)

  it('should not be possible to attest a claim without enough tokens', async () => {
    const content: IClaim['contents'] = { name: 'Ralph', age: 12 }

    const claim = Claim.fromCTypeAndClaimContents(
      driversLicenseCType,
      content,
      claimer.uri
    )
    const request = RequestForAttestation.fromClaim(claim)
    expect(RequestForAttestation.verifyDataIntegrity(request)).toBe(true)
    await RequestForAttestation.signWithDidKey(
      request,
      claimerKey.sign,
      claimer,
      claimer.authenticationKey.id
    )
    await expect(RequestForAttestation.verifySignature(request)).resolves.toBe(
      true
    )
    const attestation = Attestation.fromRequestAndDid(request, attester.uri)

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
    const credential = Credential.fromRequestAndAttestation(
      request,
      attestation
    )

    await expect(Credential.verify(credential)).resolves.toBeFalsy()
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
    const request = RequestForAttestation.fromClaim(claim)
    const attestation = Attestation.fromRequestAndDid(request, attester.uri)
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
    let credential: ICredential

    beforeAll(async () => {
      const content: IClaim['contents'] = { name: 'Rolfi', age: 18 }
      const claim = Claim.fromCTypeAndClaimContents(
        driversLicenseCType,
        content,
        claimer.uri
      )
      const request = RequestForAttestation.fromClaim(claim)
      await RequestForAttestation.signWithDidKey(
        request,
        claimerKey.sign,
        claimer,
        claimer.authenticationKey.id
      )
      const attestation = Attestation.fromRequestAndDid(request, attester.uri)
      await Attestation.getStoreTx(attestation)
        .then((call) =>
          attester.authorizeExtrinsic(
            call,
            attesterKey.sign,
            tokenHolder.address
          )
        )
        .then((tx) => submitExtrinsic(tx, tokenHolder))
      credential = Credential.fromRequestAndAttestation(request, attestation)
      await expect(Credential.verify(credential)).resolves.toBe(true)
    }, 60_000)

    it('should not be possible to attest the same claim twice', async () => {
      await expect(
        Attestation.getStoreTx(credential.attestation)
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
      const request = RequestForAttestation.fromClaim(claim)
      await RequestForAttestation.signWithDidKey(
        request,
        claimerKey.sign,
        claimer,
        claimer.authenticationKey.id
      )
      const fakecredential: ICredential = {
        request,
        attestation: credential.attestation,
      }

      await expect(Credential.verify(fakecredential)).resolves.toBeFalsy()
    }, 15_000)

    it('should not be possible for the claimer to revoke an attestation', async () => {
      await expect(
        getRevokeTx(Credential.getHash(credential), 0)
          .then((call) =>
            claimer.authorizeExtrinsic(
              call,
              claimerKey.sign,
              tokenHolder.address
            )
          )
          .then((tx) => submitExtrinsic(tx, tokenHolder))
      ).rejects.toMatchObject({ section: 'attestation', name: 'Unauthorized' })
      await expect(Credential.verify(credential)).resolves.toBe(true)
    }, 45_000)

    it('should be possible for the attester to revoke an attestation', async () => {
      await expect(Credential.verify(credential)).resolves.toBe(true)
      await getRevokeTx(Credential.getHash(credential), 0)
        .then((call) =>
          attester.authorizeExtrinsic(
            call,
            attesterKey.sign,
            tokenHolder.address
          )
        )
        .then((tx) => submitExtrinsic(tx, tokenHolder))
      await expect(Credential.verify(credential)).resolves.toBeFalsy()
    }, 40_000)

    it('should be possible for the deposit payer to remove an attestation', async () => {
      await getRemoveTx(Credential.getHash(credential), 0)
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
      const request1 = RequestForAttestation.fromClaim(licenseAuthorization)
      await RequestForAttestation.signWithDidKey(
        request1,
        claimerKey.sign,
        claimer,
        claimer.authenticationKey.id
      )
      const licenseAuthorizationGranted = Attestation.fromRequestAndDid(
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
      const request2 = RequestForAttestation.fromClaim(iBelieveICanDrive, {
        legitimations: [
          Credential.fromRequestAndAttestation(
            request1,
            licenseAuthorizationGranted
          ),
        ],
      })
      await RequestForAttestation.signWithDidKey(
        request2,
        claimerKey.sign,
        claimer,
        claimer.authenticationKey.id
      )
      const LicenseGranted = Attestation.fromRequestAndDid(
        request2,
        attester.uri
      )
      await Attestation.getStoreTx(LicenseGranted)
        .then((call) =>
          attester.authorizeExtrinsic(
            call,
            attesterKey.sign,
            tokenHolder.address
          )
        )
        .then((tx) => submitExtrinsic(tx, tokenHolder))
      const license = Credential.fromRequestAndAttestation(
        request2,
        LicenseGranted
      )
      await Promise.all([
        expect(Credential.verify(license)).resolves.toBe(true),
        expect(
          Attestation.checkValidity(licenseAuthorizationGranted)
        ).resolves.toBe(true),
      ])
    }, 70_000)
  })
})

afterAll(() => {
  disconnect()
})
