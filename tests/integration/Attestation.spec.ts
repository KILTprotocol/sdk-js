/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { ApiPromise } from '@polkadot/api'

import { Attestation, CType } from '@kiltprotocol/credentials'
import { disconnect } from '@kiltprotocol/chain-helpers'
import { Claim, Credential } from '@kiltprotocol/legacy-credentials'
import * as Did from '@kiltprotocol/did'
import type {
  DidDocument,
  IAttestation,
  ICredential,
  KiltKeyringPair,
} from '@kiltprotocol/types'
import { Crypto } from '@kiltprotocol/utils'

import {
  createFullDidFromSeed,
  KeyTool,
  makeSigningKeyTool,
} from '../testUtils/index.js'
import {
  createEndowedTestAccount,
  driversLicenseCType,
  initializeApi,
  isCtypeOnChain,
  submitTx,
} from './utils.js'

let tokenHolder: KiltKeyringPair
let attester: DidDocument
let attesterKey: KeyTool

let anotherAttester: DidDocument
let anotherAttesterKey: KeyTool

let claimer: DidDocument
let claimerKey: KeyTool

let api: ApiPromise
beforeAll(async () => {
  api = await initializeApi()
}, 30_000)

beforeAll(async () => {
  tokenHolder = await createEndowedTestAccount()
  attesterKey = await makeSigningKeyTool()
  anotherAttesterKey = await makeSigningKeyTool()
  claimerKey = await makeSigningKeyTool()
  attester = await createFullDidFromSeed(tokenHolder, attesterKey.keypair)
  anotherAttester = await createFullDidFromSeed(
    tokenHolder,
    anotherAttesterKey.keypair
  )
  claimer = await createFullDidFromSeed(tokenHolder, claimerKey.keypair)
}, 60_000)

it('fetches the correct deposit amount', async () => {
  const depositAmount = api.consts.attestation.deposit.toBn()
  expect(['120950000000000', '120900000000000']).toContain(
    depositAmount.toString()
  )
})

describe('handling attestations that do not exist', () => {
  const claimHash = Crypto.hashStr('abcde')
  it('Attestation.query', async () => {
    expect((await api.query.attestation.attestations(claimHash)).isNone).toBe(
      true
    )
  }, 30_000)

  it('Attestation.getRevokeTx', async () => {
    const draft = api.tx.attestation.revoke(claimHash, null)
    const authorized = await Did.authorizeTx(
      attester.id,
      draft,
      await attesterKey.getSigners(attester),
      tokenHolder.address
    )
    await expect(submitTx(authorized, tokenHolder)).rejects.toMatchObject({
      section: 'attestation',
      name: expect.stringMatching(/^(Attestation)?NotFound$/),
    })
  }, 30_000)

  it('Attestation.getRemoveTx', async () => {
    const draft = api.tx.attestation.remove(claimHash, null)
    const authorized = await Did.authorizeTx(
      attester.id,
      draft,
      await attesterKey.getSigners(attester),
      tokenHolder.address
    )
    await expect(submitTx(authorized, tokenHolder)).rejects.toMatchObject({
      section: 'attestation',
      name: expect.stringMatching(/^(Attestation)?NotFound$/),
    })
  }, 30_000)
})

describe('When there is an attester, claimer and ctype drivers license', () => {
  beforeAll(async () => {
    const ctypeExists = await isCtypeOnChain(driversLicenseCType)
    if (ctypeExists) return
    const tx = await Did.authorizeTx(
      attester.id,
      api.tx.ctype.add(CType.toChain(driversLicenseCType)),
      await attesterKey.getSigners(attester),
      tokenHolder.address
    )
    await submitTx(tx, tokenHolder)
  }, 60_000)

  it('should be possible to make a claim', async () => {
    const content = { name: 'Ralph', age: 12 }
    const claim = Claim.fromCTypeAndClaimContents(
      driversLicenseCType,
      content,
      claimer.id
    )
    const credential = Credential.fromClaim(claim)
    const presentation = await Credential.createPresentation({
      credential,
      signers: await claimerKey.getSigners(claimer),
    })
    expect(() => Credential.verifyDataIntegrity(presentation)).not.toThrow()
    await expect(
      Credential.verifySignature(presentation)
    ).resolves.not.toThrow()
    expect(credential.claim.contents).toMatchObject(content)
  })

  it('should be possible to attest a claim and then claim the attestation deposit back', async () => {
    const content = { name: 'Ralph', age: 12 }

    const claim = Claim.fromCTypeAndClaimContents(
      driversLicenseCType,
      content,
      claimer.id
    )
    const credential = Credential.fromClaim(claim)
    expect(() => Credential.verifyDataIntegrity(credential)).not.toThrow()

    const presentation = await Credential.createPresentation({
      credential,
      signers: await claimerKey.getSigners(claimer),
    })
    await expect(
      Credential.verifySignature(presentation)
    ).resolves.not.toThrow()
    Credential.verifyWellFormed(presentation, { ctype: driversLicenseCType })

    const attestation = Attestation.fromCredentialAndDid(
      presentation,
      attester.id
    )
    const storeTx = api.tx.attestation.add(
      attestation.claimHash,
      attestation.cTypeHash,
      null
    )
    const authorizedStoreTx = await Did.authorizeTx(
      attester.id,
      storeTx,
      await attesterKey.getSigners(attester),
      tokenHolder.address
    )
    await submitTx(authorizedStoreTx, tokenHolder)
    const storedAttestation = Attestation.fromChain(
      await api.query.attestation.attestations(attestation.claimHash),
      attestation.claimHash
    )
    expect(storedAttestation).not.toBeNull()
    expect(storedAttestation?.revoked).toBe(false)

    await expect(
      Credential.verifyPresentation(presentation)
    ).resolves.toMatchObject({ attester: attester.id, revoked: false })

    // Claim the deposit back by submitting the reclaimDeposit extrinsic with the deposit payer's account.
    const reclaimTx = api.tx.attestation.reclaimDeposit(attestation.claimHash)
    await submitTx(reclaimTx, tokenHolder)

    // Test that the attestation has been deleted.
    expect(
      (await api.query.attestation.attestations(attestation.claimHash)).isNone
    ).toBe(true)

    await expect(
      Credential.verifyPresentation(presentation)
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"Attestation not found"`)
  }, 60_000)

  it('should not be possible to attest a claim without enough tokens', async () => {
    const content = { name: 'Ralph', age: 12 }

    const claim = Claim.fromCTypeAndClaimContents(
      driversLicenseCType,
      content,
      claimer.id
    )
    const credential = Credential.fromClaim(claim)
    expect(() => Credential.verifyDataIntegrity(credential)).not.toThrow()

    const presentation = await Credential.createPresentation({
      credential,
      signers: await claimerKey.getSigners(claimer),
    })
    await expect(
      Credential.verifySignature(presentation)
    ).resolves.not.toThrow()

    const attestation = Attestation.fromCredentialAndDid(
      presentation,
      attester.id
    )
    const { keypair, getSigners } = await makeSigningKeyTool()

    const storeTx = api.tx.attestation.add(
      attestation.claimHash,
      attestation.cTypeHash,
      null
    )
    const authorizedStoreTx = await Did.authorizeTx(
      attester.id,
      storeTx,
      await getSigners(attester),
      keypair.address
    )
    await expect(
      submitTx(authorizedStoreTx, keypair)
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"1010: Invalid Transaction: Inability to pay some fees , e.g. account balance too low"`
    )

    expect(
      (await api.query.attestation.attestations(attestation.claimHash)).isNone
    ).toBe(true)
  }, 60_000)

  it('should not be possible to attest a claim on a Ctype that is not on chain', async () => {
    const badCtype = CType.fromProperties('badDriversLicense', {
      name: {
        type: 'string',
      },
      weight: {
        type: 'integer',
      },
    })

    const content = { name: 'Ralph', weight: 120 }
    const claim = Claim.fromCTypeAndClaimContents(badCtype, content, claimer.id)
    const credential = Credential.fromClaim(claim)
    const attestation = Attestation.fromCredentialAndDid(
      credential,
      attester.id
    )
    const storeTx = api.tx.attestation.add(
      attestation.claimHash,
      attestation.cTypeHash,
      null
    )
    const authorizedStoreTx = await Did.authorizeTx(
      attester.id,
      storeTx,
      await attesterKey.getSigners(attester),
      tokenHolder.address
    )

    await expect(
      submitTx(authorizedStoreTx, tokenHolder)
    ).rejects.toMatchObject({
      section: 'ctype',
      name: expect.stringMatching(/^(CType)?NotFound$/),
    })
  }, 60_000)

  describe('when there is a credential on-chain', () => {
    let credential: ICredential
    let attestation: IAttestation

    beforeAll(async () => {
      const content = { name: 'Rolfi', age: 18 }
      const claim = Claim.fromCTypeAndClaimContents(
        driversLicenseCType,
        content,
        claimer.id
      )
      credential = Credential.fromClaim(claim)
      const presentation = await Credential.createPresentation({
        credential,
        signers: await claimerKey.getSigners(claimer),
      })
      attestation = Attestation.fromCredentialAndDid(credential, attester.id)
      const storeTx = api.tx.attestation.add(
        attestation.claimHash,
        attestation.cTypeHash,
        null
      )
      const authorizedStoreTx = await Did.authorizeTx(
        attester.id,
        storeTx,
        await attesterKey.getSigners(attester),
        tokenHolder.address
      )
      await submitTx(authorizedStoreTx, tokenHolder)

      await Credential.verifyPresentation(presentation)
      const storedAttestation = Attestation.fromChain(
        await api.query.attestation.attestations(attestation.claimHash),
        attestation.claimHash
      )
      expect(storedAttestation).not.toBeNull()
      expect(storedAttestation?.revoked).toBe(false)
    }, 60_000)

    it('should not be possible to attest the same claim twice', async () => {
      const storeTx = api.tx.attestation.add(
        attestation.claimHash,
        attestation.cTypeHash,
        null
      )
      const authorizedStoreTx = await Did.authorizeTx(
        attester.id,
        storeTx,
        await attesterKey.getSigners(attester),
        tokenHolder.address
      )

      await expect(
        submitTx(authorizedStoreTx, tokenHolder)
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
        claimer.id
      )
      const fakeCredential = Credential.fromClaim(claim)

      expect(() =>
        Credential.verifyAgainstAttestation(attestation, fakeCredential)
      ).toThrow()
    }, 15_000)

    it('should not be possible for the claimer to revoke an attestation', async () => {
      const revokeTx = api.tx.attestation.revoke(attestation.claimHash, null)
      const authorizedRevokeTx = await Did.authorizeTx(
        claimer.id,
        revokeTx,
        await claimerKey.getSigners(claimer),
        tokenHolder.address
      )

      await expect(
        submitTx(authorizedRevokeTx, tokenHolder)
      ).rejects.toMatchObject({
        section: 'attestation',
        name: expect.stringMatching(/^(Unauthorized|NotAuthorized)$/),
      })
      const storedAttestation = Attestation.fromChain(
        await api.query.attestation.attestations(attestation.claimHash),
        attestation.claimHash
      )
      expect(storedAttestation).not.toBeNull()
      expect(storedAttestation?.revoked).toBe(false)
    }, 45_000)

    it('should be possible for the attester to revoke an attestation', async () => {
      const storedAttestation = Attestation.fromChain(
        await api.query.attestation.attestations(attestation.claimHash),
        attestation.claimHash
      )
      expect(storedAttestation).not.toBeNull()
      expect(storedAttestation?.revoked).toBe(false)

      const revokeTx = api.tx.attestation.revoke(attestation.claimHash, null)
      const authorizedRevokeTx = await Did.authorizeTx(
        attester.id,
        revokeTx,
        await attesterKey.getSigners(attester),
        tokenHolder.address
      )
      await submitTx(authorizedRevokeTx, tokenHolder)

      const storedAttestationAfter = Attestation.fromChain(
        await api.query.attestation.attestations(attestation.claimHash),
        attestation.claimHash
      )
      expect(storedAttestationAfter).not.toBeNull()
      expect(storedAttestationAfter?.revoked).toBe(true)

      await expect(
        Credential.verifyCredential(credential)
      ).resolves.toMatchObject({ attester: attester.id, revoked: true })
    }, 40_000)

    it('should be possible for the deposit payer to remove an attestation', async () => {
      const removeTx = api.tx.attestation.remove(attestation.claimHash, null)
      const authorizedRemoveTx = await Did.authorizeTx(
        attester.id,
        removeTx,
        await attesterKey.getSigners(attester),
        tokenHolder.address
      )
      await submitTx(authorizedRemoveTx, tokenHolder)
    }, 40_000)
  })

  describe('when there is another Ctype that works as a legitimation', () => {
    const officialLicenseAuthorityCType = CType.fromProperties(
      'License Authority',
      {
        LicenseType: {
          type: 'string',
        },
        LicenseSubtypes: {
          type: 'string',
        },
      }
    )

    beforeAll(async () => {
      if (await isCtypeOnChain(officialLicenseAuthorityCType)) return

      const storeTx = api.tx.ctype.add(
        CType.toChain(officialLicenseAuthorityCType)
      )
      const authorizedStoreTx = await Did.authorizeTx(
        attester.id,
        storeTx,
        await attesterKey.getSigners(attester),
        tokenHolder.address
      )
      await submitTx(authorizedStoreTx, tokenHolder)

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
        attester.id
      )
      const credential1 = Credential.fromClaim(licenseAuthorization)
      const licenseAuthorizationGranted = Attestation.fromCredentialAndDid(
        credential1,
        anotherAttester.id
      )
      const storeTx = api.tx.attestation.add(
        licenseAuthorizationGranted.claimHash,
        licenseAuthorizationGranted.cTypeHash,
        null
      )
      const authorizedStoreTx = await Did.authorizeTx(
        anotherAttester.id,
        storeTx,
        await anotherAttesterKey.getSigners(anotherAttester),
        tokenHolder.address
      )
      await submitTx(authorizedStoreTx, tokenHolder)

      // make credential including legitimation
      const iBelieveICanDrive = Claim.fromCTypeAndClaimContents(
        driversLicenseCType,
        { name: 'Dominic Toretto', age: 52 },
        claimer.id
      )
      const credential2 = Credential.fromClaim(iBelieveICanDrive, {
        legitimations: [credential1],
      })

      const licenseGranted = Attestation.fromCredentialAndDid(
        credential2,
        attester.id
      )
      const storeTx2 = api.tx.attestation.add(
        licenseGranted.claimHash,
        licenseGranted.cTypeHash,
        null
      )
      const authorizedStoreTx2 = await Did.authorizeTx(
        attester.id,
        storeTx2,
        await attesterKey.getSigners(attester),
        tokenHolder.address
      )
      await submitTx(authorizedStoreTx2, tokenHolder)

      const storedAttLicense = Attestation.fromChain(
        await api.query.attestation.attestations(licenseGranted.claimHash),
        licenseGranted.claimHash
      )
      expect(storedAttLicense).not.toBeNull()
      expect(storedAttLicense?.revoked).toBe(false)

      const queried = await api.query.attestation.attestations(
        licenseAuthorizationGranted.claimHash
      )
      expect(queried.isSome).toBe(true)
      const storedAttAuthorized = Attestation.fromChain(
        queried,
        licenseAuthorizationGranted.claimHash
      )
      expect(storedAttAuthorized.revoked).toBe(false)

      expect(() =>
        Credential.verifyAgainstAttestation(licenseGranted, credential2)
      ).not.toThrow()
      expect(() =>
        Credential.verifyAgainstAttestation(
          licenseAuthorizationGranted,
          credential1
        )
      ).not.toThrow()

      const presentation = await Credential.createPresentation({
        credential: credential2,
        signers: await claimerKey.getSigners(claimer),
      })

      await expect(
        Credential.verifyPresentation(presentation)
      ).resolves.toMatchObject({ revoked: false })
    }, 70_000)
  })
})

afterAll(async () => {
  await disconnect()
})
