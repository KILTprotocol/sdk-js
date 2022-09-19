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
  DidDocument,
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
import { ApiPromise } from '@polkadot/api'
import * as Attestation from '../attestation'
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
    const authorized = await Did.authorizeExtrinsic(
      attester.uri,
      draft,
      attesterKey.sign(attester),
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
    const draft = api.tx.attestation.remove(claimHash, null)
    const authorized = await Did.authorizeExtrinsic(
      attester.uri,
      draft,
      attesterKey.sign(attester),
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
      attester.uri,
      api.tx.ctype.add(CType.toChain(driversLicenseCType)),
      attesterKey.sign(attester),
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
    const presentation = await Credential.createPresentation({
      credential,
      signCallback: claimerKey.sign(claimer),
    })
    expect(Credential.verifyDataIntegrity(presentation)).toBe(true)
    expect(await Credential.verifySignature(presentation)).toBe(true)
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

    const presentation = await Credential.createPresentation({
      credential,
      signCallback: claimerKey.sign(claimer),
    })
    expect(await Credential.verifySignature(presentation)).toBe(true)
    await Credential.verifyPresentation(presentation)

    const attestation = Attestation.fromCredentialAndDid(
      presentation,
      attester.uri
    )
    const storeTx = api.tx.attestation.add(
      attestation.claimHash,
      attestation.cTypeHash,
      null
    )
    const authorizedStoreTx = await Did.authorizeExtrinsic(
      attester.uri,
      storeTx,
      attesterKey.sign(attester),
      tokenHolder.address
    )
    await submitExtrinsic(authorizedStoreTx, tokenHolder)
    const storedAttestation = Attestation.fromChain(
      await api.query.attestation.attestations(attestation.claimHash),
      attestation.claimHash
    )
    expect(storedAttestation).not.toBeNull()
    expect(storedAttestation?.revoked).toBe(false)

    // Claim the deposit back by submitting the reclaimDeposit extrinsic with the deposit payer's account.
    const reclaimTx = api.tx.attestation.reclaimDeposit(attestation.claimHash)
    await submitExtrinsic(reclaimTx, tokenHolder)

    // Test that the attestation has been deleted.
    expect(
      (await api.query.attestation.attestations(attestation.claimHash)).isNone
    ).toBe(true)
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

    const presentation = await Credential.createPresentation({
      credential,
      signCallback: claimerKey.sign(claimer),
    })
    expect(await Credential.verifySignature(presentation)).toBe(true)

    const attestation = Attestation.fromCredentialAndDid(
      presentation,
      attester.uri
    )
    const { keypair, sign } = makeSigningKeyTool()

    const storeTx = api.tx.attestation.add(
      attestation.claimHash,
      attestation.cTypeHash,
      null
    )
    const authorizedStoreTx = await Did.authorizeExtrinsic(
      attester.uri,
      storeTx,
      sign(attester),
      keypair.address
    )
    await expect(
      submitExtrinsic(authorizedStoreTx, keypair)
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"1010: Invalid Transaction: Inability to pay some fees , e.g. account balance too low"`
    )

    expect(
      (await api.query.attestation.attestations(attestation.claimHash)).isNone
    ).toBe(true)
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
    const storeTx = api.tx.attestation.add(
      attestation.claimHash,
      attestation.cTypeHash,
      null
    )
    const authorizedStoreTx = await Did.authorizeExtrinsic(
      attester.uri,
      storeTx,
      attesterKey.sign(attester),
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
      const presentation = await Credential.createPresentation({
        credential,
        signCallback: claimerKey.sign(claimer),
      })
      attestation = Attestation.fromCredentialAndDid(credential, attester.uri)
      const storeTx = api.tx.attestation.add(
        attestation.claimHash,
        attestation.cTypeHash,
        null
      )
      const authorizedStoreTx = await Did.authorizeExtrinsic(
        attester.uri,
        storeTx,
        attesterKey.sign(attester),
        tokenHolder.address
      )
      await submitExtrinsic(authorizedStoreTx, tokenHolder)

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
      const authorizedStoreTx = await Did.authorizeExtrinsic(
        attester.uri,
        storeTx,
        attesterKey.sign(attester),
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
      await Credential.createPresentation({
        credential,
        signCallback: claimerKey.sign(claimer),
      })

      expect(
        Attestation.verifyAgainstCredential(attestation, fakeCredential)
      ).toBe(false)
    }, 15_000)

    it('should not be possible for the claimer to revoke an attestation', async () => {
      const revokeTx = api.tx.attestation.revoke(attestation.claimHash, null)
      const authorizedRevokeTx = await Did.authorizeExtrinsic(
        claimer.uri,
        revokeTx,
        claimerKey.sign(claimer),
        tokenHolder.address
      )

      await expect(
        submitExtrinsic(authorizedRevokeTx, tokenHolder)
      ).rejects.toMatchObject({ section: 'attestation', name: 'Unauthorized' })
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
      const authorizedRevokeTx = await Did.authorizeExtrinsic(
        attester.uri,
        revokeTx,
        attesterKey.sign(attester),
        tokenHolder.address
      )
      await submitExtrinsic(authorizedRevokeTx, tokenHolder)

      const storedAttestationAfter = Attestation.fromChain(
        await api.query.attestation.attestations(attestation.claimHash),
        attestation.claimHash
      )
      expect(storedAttestationAfter).not.toBeNull()
      expect(storedAttestationAfter?.revoked).toBe(true)
    }, 40_000)

    it('should be possible for the deposit payer to remove an attestation', async () => {
      const removeTx = api.tx.attestation.remove(attestation.claimHash, null)
      const authorizedRemoveTx = await Did.authorizeExtrinsic(
        attester.uri,
        removeTx,
        attesterKey.sign(attester),
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
        CType.toChain(officialLicenseAuthorityCType)
      )
      const authorizedStoreTx = await Did.authorizeExtrinsic(
        attester.uri,
        storeTx,
        attesterKey.sign(attester),
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
      await Credential.createPresentation({
        credential: credential1,
        signCallback: claimerKey.sign(claimer),
      })
      const licenseAuthorizationGranted = Attestation.fromCredentialAndDid(
        credential1,
        anotherAttester.uri
      )
      const storeTx = api.tx.attestation.add(
        licenseAuthorizationGranted.claimHash,
        licenseAuthorizationGranted.cTypeHash,
        null
      )
      const authorizedStoreTx = await Did.authorizeExtrinsic(
        anotherAttester.uri,
        storeTx,
        anotherAttesterKey.sign(anotherAttester),
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
      await Credential.createPresentation({
        credential: credential2,
        signCallback: claimerKey.sign(claimer),
      })
      const licenseGranted = Attestation.fromCredentialAndDid(
        credential2,
        attester.uri
      )
      const storeTx2 = api.tx.attestation.add(
        licenseGranted.claimHash,
        licenseGranted.cTypeHash,
        null
      )
      const authorizedStoreTx2 = await Did.authorizeExtrinsic(
        attester.uri,
        storeTx2,
        attesterKey.sign(attester),
        tokenHolder.address
      )
      await submitExtrinsic(authorizedStoreTx2, tokenHolder)

      const storedAttLicense = Attestation.fromChain(
        await api.query.attestation.attestations(licenseGranted.claimHash),
        licenseGranted.claimHash
      )
      expect(storedAttLicense).not.toBeNull()
      expect(storedAttLicense?.revoked).toBe(false)

      const storedAttAuthorized = Attestation.fromChain(
        await api.query.attestation.attestations(
          licenseAuthorizationGranted.claimHash
        ),
        licenseAuthorizationGranted.claimHash
      )
      expect(storedAttAuthorized).not.toBeNull()
      expect(storedAttAuthorized?.revoked).toBe(false)

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
