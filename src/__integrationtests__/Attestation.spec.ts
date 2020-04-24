/**
 * @group integration/attestation
 */

import {
  wannabeFaucet,
  wannabeAlice,
  wannabeBob,
  DriversLicense,
  CtypeOnChain,
  isOfficialLicenseAuthority,
} from './utils'
import Claim from '../claim/Claim'
import getCached from '../blockchainApiConnection'
import RequestForAttestation from '../requestforattestation/RequestForAttestation'
import Attestation from '../attestation/Attestation'
import AttestedClaim from '../attestedclaim/AttestedClaim'
import { revoke } from '../attestation/Attestation.chain'
import CType from '../ctype/CType'
import ICType from '../types/CType'
import { Identity } from '..'

describe('handling attestations that do not exist', () => {
  it('Attestation.query', () => {
    return expect(Attestation.query('0x012012012')).resolves.toBeNull()
  }, 30_000)

  it('Attestation.revoke', async () => {
    return expect(
      Attestation.revoke('0x012012012', await Identity.buildFromURI('//Alice'))
    ).rejects.toThrow()
  }, 30_000)
})

describe('When there is an attester, claimer and ctype drivers license', async () => {
  let uncleSam: Identity
  let attester: Identity
  let claimer: Identity

  beforeAll(async () => {
    uncleSam = await wannabeFaucet
    attester = await wannabeAlice
    claimer = await wannabeBob

    const ctypeExists = await CtypeOnChain(DriversLicense)
    // console.log(`ctype exists: ${ctypeExists}`)
    // console.log(`verify stored: ${await DriversLicense.verifyStored()}`)
    if (!ctypeExists) {
      await DriversLicense.store(attester)
    }
  }, 60_000)

  it('should be possible to make a claim', async () => {
    const content = { name: 'Ralfi', age: 12 }
    const claim = Claim.fromCTypeAndClaimContents(
      DriversLicense,
      content,
      claimer.getAddress()
    )
    const [request] = await RequestForAttestation.fromClaimAndIdentity({
      claim,
      identity: claimer,
    })
    expect(request.verifyData()).toBeTruthy()
    expect(request.claim.contents).toMatchObject(content)
  })

  it('should be possible to attest a claim', async () => {
    const content = { name: 'Ralfi', age: 12 }
    const claim = Claim.fromCTypeAndClaimContents(
      DriversLicense,
      content,
      claimer.getAddress()
    )
    const [request] = await RequestForAttestation.fromClaimAndIdentity({
      claim,
      identity: claimer,
    })
    expect(request.verifyData()).toBeTruthy()
    expect(request.verifySignature()).toBeTruthy()
    const attestation = Attestation.fromRequestAndPublicIdentity(
      request,
      attester.getPublicIdentity()
    )
    const status = await attestation.store(attester)
    expect(status.type).toBe('Finalized')
    const aClaim = await AttestedClaim.fromRequestAndAttestation(
      claimer,
      request,
      attestation
    )
    expect(aClaim.verifyData()).toBeTruthy()
    await expect(aClaim.verify()).resolves.toBeTruthy()
  }, 60_000)

  it('should not be possible to attest a claim w/o tokens', async () => {
    const content = { name: 'Ralfi', age: 10 }
    const claim = Claim.fromCTypeAndClaimContents(
      DriversLicense,
      content,
      claimer.getAddress()
    )
    const [request] = await RequestForAttestation.fromClaimAndIdentity({
      claim,
      identity: claimer,
    })
    expect(request.verifyData()).toBeTruthy()
    expect(request.verifySignature()).toBeTruthy()
    const attestation = Attestation.fromRequestAndPublicIdentity(
      request,
      attester.getPublicIdentity()
    )

    const bobbyBroke = await Identity.buildFromMnemonic()

    await expect(attestation.store(bobbyBroke)).rejects.toThrow()
    const aClaim = await AttestedClaim.fromRequestAndAttestation(
      bobbyBroke,
      request,
      attestation
    )
    await expect(aClaim.verify()).resolves.toBeFalsy()
  }, 60_000)

  it('should not be possible to attest a claim on a Ctype that is not on chain', async () => {
    const badCtype = CType.fromCType({
      schema: {
        $id: 'badDriversLicense',
        $schema: 'http://kilt-protocol.org/draft-01/ctype#',
        properties: {
          name: {
            type: 'string',
          },
          weight: {
            type: 'integer',
          },
        },
        type: 'object',
      } as ICType['schema'],
    } as ICType)

    const content = { name: 'Ralfi', weight: 120 }
    const claim = Claim.fromCTypeAndClaimContents(
      badCtype,
      content,
      claimer.getAddress()
    )
    const [request] = await RequestForAttestation.fromClaimAndIdentity({
      claim,
      identity: claimer,
    })
    const attestation = await Attestation.fromRequestAndPublicIdentity(
      request,
      attester.getPublicIdentity()
    )
    await expect(attestation.store(attester)).rejects.toThrowError(
      'CTYPE not found'
    )
  }, 60_000)

  describe('when there is an attested claim on-chain', async () => {
    let attClaim: AttestedClaim

    beforeAll(async () => {
      const content = { name: 'Rolfi', age: 18 }
      const claim = Claim.fromCTypeAndClaimContents(
        DriversLicense,
        content,
        claimer.getAddress()
      )
      const [request] = await RequestForAttestation.fromClaimAndIdentity({
        claim,
        identity: claimer,
      })
      const attestation = Attestation.fromRequestAndPublicIdentity(
        request,
        attester.getPublicIdentity()
      )
      const status = await attestation.store(attester)
      expect(status.type).toBe('Finalized')
      attClaim = await AttestedClaim.fromRequestAndAttestation(
        claimer,
        request,
        attestation
      )
      await expect(attClaim.verify()).resolves.toBeTruthy()
    }, 60_000)

    it('should not be possible to attest the same claim twice', async () => {
      await expect(attClaim.attestation.store(attester)).rejects.toThrowError(
        'already attested'
      )
    }, 15000)

    it('should not be possible for the claimer to revoke an attestation', async () => {
      await expect(revoke(attClaim.getHash(), claimer)).rejects.toThrowError(
        'not permitted'
      )
      await expect(attClaim.verify()).resolves.toBeTruthy()
    }, 30000)

    it('should be possible for the attester to revoke an attestation', async () => {
      await expect(attClaim.verify()).resolves.toBeTruthy()
      const status = await revoke(attClaim.getHash(), attester)
      expect(status.type).toBe('Finalized')
      await expect(attClaim.verify()).resolves.toBeFalsy()
    }, 15000)
  })

  describe('when there is another Ctype that works as a legitimation', async () => {
    beforeAll(async () => {
      if (!(await CtypeOnChain(isOfficialLicenseAuthority))) {
        await isOfficialLicenseAuthority.store(uncleSam)
      }
      await expect(
        CtypeOnChain(isOfficialLicenseAuthority)
      ).resolves.toBeTruthy()
    }, 30_000)

    it('can be included in a claim as a legitimation', async () => {
      // make credential to be used as legitimation
      const licenseAuthorization = Claim.fromCTypeAndClaimContents(
        isOfficialLicenseAuthority,
        {
          LicenseType: "Driver's License",
          LicenseSubtypes: 'sportscars, tanks',
        },
        attester.getAddress()
      )
      const [request1] = await RequestForAttestation.fromClaimAndIdentity({
        claim: licenseAuthorization,
        identity: attester,
      })
      const licenseAuthorizationGranted = Attestation.fromRequestAndPublicIdentity(
        request1,
        uncleSam.getPublicIdentity()
      )
      await licenseAuthorizationGranted.store(uncleSam)
      // make request including legitimation
      const iBelieveIcanDrive = Claim.fromCTypeAndClaimContents(
        DriversLicense,
        { name: 'Dominic Toretto', age: 52 },
        claimer.getAddress()
      )
      const [request2] = await RequestForAttestation.fromClaimAndIdentity({
        claim: iBelieveIcanDrive,
        identity: claimer,
        legitimations: [
          await AttestedClaim.fromRequestAndAttestation(
            attester,
            request1,
            licenseAuthorizationGranted
          ),
        ],
      })
      const LicenseGranted = Attestation.fromRequestAndPublicIdentity(
        request2,
        attester.getPublicIdentity()
      )
      await LicenseGranted.store(attester)
      const license = await AttestedClaim.fromRequestAndAttestation(
        claimer,
        request2,
        LicenseGranted
      )
      await Promise.all([
        expect(license.verify()).resolves.toBeTruthy(),
        expect(licenseAuthorizationGranted.verify()).resolves.toBeTruthy(),
      ])
    }, 60_000)
  })
})

afterAll(async () => {
  await getCached().then(bc => bc.api.disconnect())
})
