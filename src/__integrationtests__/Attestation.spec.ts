/**
 * @group integration/attestation
 */

import {
  faucet,
  alice,
  bob,
  DriversLicense,
  CtypeOnChain,
  IsOfficialLicenseAuthority,
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

const UncleSam = faucet
const attester = alice
const claimer = bob

describe('handling attestations that do not exist', () => {
  it('Attestation.query', async () => {
    return expect(Attestation.query('0x012012012')).resolves.toBeNull()
  }, 30_000)

  it('Attestation.revoke', async () => {
    return expect(
      Attestation.revoke('0x012012012', Identity.buildFromURI('//Alice'))
    ).rejects.toThrow()
  }, 30_000)
})

describe('When there is an attester, claimer and ctype drivers license', () => {
  beforeAll(async () => {
    const ctypeExists = await CtypeOnChain(DriversLicense)
    // console.log(`ctype exists: ${ctypeExists}`)
    // console.log(`verify stored: ${await DriversLicense.verifyStored()}`)
    if (!ctypeExists) {
      await DriversLicense.store(attester)
    }
  }, 60_000)

  it('should be possible to make a claim', () => {
    const content = { name: 'Ralfi', age: 12 }
    const claim = Claim.fromCTypeAndClaimContents(
      DriversLicense,
      content,
      claimer.address
    )
    const request = RequestForAttestation.fromClaimAndIdentity(
      claim,
      claimer,
      [],
      null
    )
    expect(request.verifyData()).toBeTruthy()
    expect(request.claim.contents).toMatchObject(content)
  })

  it('should be possible to attest a claim', async () => {
    const content = { name: 'Ralfi', age: 12 }
    const claim = Claim.fromCTypeAndClaimContents(
      DriversLicense,
      content,
      claimer.address
    )
    const request = RequestForAttestation.fromClaimAndIdentity(
      claim,
      claimer,
      [],
      null
    )
    expect(request.verifyData()).toBeTruthy()
    expect(request.verifySignature()).toBeTruthy()
    const attestation = Attestation.fromRequestAndPublicIdentity(
      request,
      attester.getPublicIdentity()
    )
    const status = await attestation.store(attester)
    expect(status.type).toBe('Finalized')
    const aClaim = AttestedClaim.fromRequestAndAttestation(request, attestation)
    expect(aClaim.verifyData()).toBeTruthy()
    await expect(aClaim.verify()).resolves.toBeTruthy()
  }, 60_000)

  it('should not be possible to attest a claim w/o tokens', async () => {
    const content = { name: 'Ralfi', age: 10 }
    const claim = Claim.fromCTypeAndClaimContents(
      DriversLicense,
      content,
      claimer.address
    )
    const request = RequestForAttestation.fromClaimAndIdentity(
      claim,
      claimer,
      [],
      null
    )
    expect(request.verifyData()).toBeTruthy()
    expect(request.verifySignature()).toBeTruthy()
    const attestation = Attestation.fromRequestAndPublicIdentity(
      request,
      attester.getPublicIdentity()
    )

    const BobbyBroke = Identity.buildFromMnemonic(Identity.generateMnemonic())

    await expect(attestation.store(BobbyBroke)).rejects.toThrow()
    const aClaim = AttestedClaim.fromRequestAndAttestation(request, attestation)
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
      claimer.address
    )
    const request = RequestForAttestation.fromClaimAndIdentity(
      claim,
      claimer,
      [],
      null
    )
    const attestation = Attestation.fromRequestAndPublicIdentity(
      request,
      attester.getPublicIdentity()
    )
    await expect(attestation.store(attester)).rejects.toThrowError(
      'CTYPE not found'
    )
  }, 60_000)

  describe('when there is an attested claim on-chain', () => {
    let attClaim: AttestedClaim

    beforeAll(async () => {
      const content = { name: 'Rolfi', age: 18 }
      const claim = Claim.fromCTypeAndClaimContents(
        DriversLicense,
        content,
        claimer.address
      )
      const request = RequestForAttestation.fromClaimAndIdentity(
        claim,
        claimer,
        [],
        null
      )
      const attestation = Attestation.fromRequestAndPublicIdentity(
        request,
        attester.getPublicIdentity()
      )
      const status = await attestation.store(attester)
      expect(status.type).toBe('Finalized')
      attClaim = AttestedClaim.fromRequestAndAttestation(request, attestation)
      await expect(attClaim.verify()).resolves.toBeTruthy()
    }, 60_000)

    it('should not be possible to attest the same claim twice', async () => {
      await expect(attClaim.attestation.store(attester)).rejects.toThrowError(
        'already attested'
      )
    }, 30_000)

    it('should not be possible for the claimer to revoke an attestation', async () => {
      await expect(revoke(attClaim.getHash(), claimer)).rejects.toThrowError(
        'not permitted'
      )
      await expect(attClaim.verify()).resolves.toBeTruthy()
    }, 30_000)

    it('should be possible for the attester to revoke an attestation', async () => {
      await expect(attClaim.verify()).resolves.toBeTruthy()
      const status = await revoke(attClaim.getHash(), attester)
      expect(status.type).toBe('Finalized')
      await expect(attClaim.verify()).resolves.toBeFalsy()
    }, 30_000)
  })

  describe('when there is another Ctype that works as a legitimation', () => {
    beforeAll(async () => {
      if (!(await CtypeOnChain(IsOfficialLicenseAuthority))) {
        await IsOfficialLicenseAuthority.store(UncleSam)
      }
      await expect(
        CtypeOnChain(IsOfficialLicenseAuthority)
      ).resolves.toBeTruthy()
    }, 30_000)

    it('can be included in a claim as a legitimation', async () => {
      // make credential to be used as legitimation
      const LicenseAuthorization = Claim.fromCTypeAndClaimContents(
        IsOfficialLicenseAuthority,
        {
          LicenseType: "Driver's License",
          LicenseSubtypes: 'sportscars, tanks',
        },
        attester.address
      )
      const request1 = RequestForAttestation.fromClaimAndIdentity(
        LicenseAuthorization,
        attester,
        [],
        null
      )
      const LicenseAuthorizationGranted = Attestation.fromRequestAndPublicIdentity(
        request1,
        UncleSam.getPublicIdentity()
      )
      await LicenseAuthorizationGranted.store(UncleSam)
      // make request including legitimation
      const iBelieveIcanDrive = Claim.fromCTypeAndClaimContents(
        DriversLicense,
        { name: 'Dominic Toretto', age: 52 },
        claimer.address
      )
      const request2 = RequestForAttestation.fromClaimAndIdentity(
        iBelieveIcanDrive,
        claimer,
        [
          AttestedClaim.fromRequestAndAttestation(
            request1,
            LicenseAuthorizationGranted
          ),
        ],
        null
      )
      const LicenseGranted = Attestation.fromRequestAndPublicIdentity(
        request2,
        attester.getPublicIdentity()
      )
      await LicenseGranted.store(attester)
      const License = AttestedClaim.fromRequestAndAttestation(
        request2,
        LicenseGranted
      )
      await Promise.all([
        expect(License.verify()).resolves.toBeTruthy(),
        expect(LicenseAuthorizationGranted.verify()).resolves.toBeTruthy(),
      ])
    }, 60_000)
  })
})

afterAll(async () => {
  await getCached().then((bc) => bc.api.disconnect())
})
