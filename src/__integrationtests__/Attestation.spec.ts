/**
 * @group integration/attestation
 * @ignore
 * @packageDocumentation
 */

import {
  wannabeFaucet,
  wannabeAlice,
  wannabeBob,
  DriversLicense,
  CtypeOnChain,
  IsOfficialLicenseAuthority,
} from './utils'
import Claim from '../claim/Claim'
import getCached, { DEFAULT_WS_ADDRESS } from '../blockchainApiConnection'
import RequestForAttestation from '../requestforattestation/RequestForAttestation'
import Attestation from '../attestation/Attestation'
import AttestedClaim from '../attestedclaim/AttestedClaim'
import { revoke } from '../attestation/Attestation.chain'
import CType from '../ctype/CType'
import ICType from '../types/CType'
import Identity from '../identity/Identity'
import Credential from '../credential/Credential'
import { IBlockchainApi } from '../blockchain/Blockchain'
import { IClaim } from '..'

let blockchain: IBlockchainApi
beforeAll(async () => {
  blockchain = await getCached(DEFAULT_WS_ADDRESS)
})

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

describe('When there is an attester, claimer and ctype drivers license', () => {
  let faucet: Identity
  let attester: Identity
  let claimer: Identity

  beforeAll(async () => {
    faucet = await wannabeFaucet
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
    const content: IClaim['contents'] = { name: 'Ralph', age: 12 }
    const claim = Claim.fromCTypeAndClaimContents(
      DriversLicense,
      content,
      claimer.getAddress()
    )
    const request = (await RequestForAttestation.fromClaimAndIdentity(
      claim,
      claimer
    )).message
    expect(request.verifyData()).toBeTruthy()
    expect(request.claim.contents).toMatchObject(content)
  })

  it('should be possible to attest a claim', async () => {
    const content: IClaim['contents'] = { name: 'Ralph', age: 12 }

    const claim = Claim.fromCTypeAndClaimContents(
      DriversLicense,
      content,
      claimer.getAddress()
    )
    const request = (await RequestForAttestation.fromClaimAndIdentity(
      claim,
      claimer
    )).message
    expect(request.verifyData()).toBeTruthy()
    expect(request.verifySignature()).toBeTruthy()
    const attestation = Attestation.fromRequestAndPublicIdentity(
      request,
      attester.getPublicIdentity()
    )
    const result = await attestation.store(attester)
    expect(result.status.type).toBe('Finalized')
    const cred = await Credential.fromRequestAndAttestation(
      claimer,
      request,
      attestation
    )
    const aClaim = cred.createPresentation([], false)
    expect(aClaim.verifyData()).toBeTruthy()
    await expect(aClaim.verify()).resolves.toBeTruthy()
  }, 60_000)

  it('should not be possible to attest a claim w/o tokens', async () => {
    const content: IClaim['contents'] = { name: 'Ralph', age: 10 }

    const claim = Claim.fromCTypeAndClaimContents(
      DriversLicense,
      content,
      claimer.getAddress()
    )
    const request = (await RequestForAttestation.fromClaimAndIdentity(
      claim,
      claimer
    )).message
    expect(request.verifyData()).toBeTruthy()
    expect(request.verifySignature()).toBeTruthy()
    const attestation = Attestation.fromRequestAndPublicIdentity(
      request,
      attester.getPublicIdentity()
    )

    const bobbyBroke = await Identity.buildFromMnemonic()

    await expect(attestation.store(bobbyBroke)).rejects.toThrow()
    const cred = await Credential.fromRequestAndAttestation(
      bobbyBroke,
      request,
      attestation
    )
    const aClaim = cred.createPresentation([], false)

    await expect(aClaim.verify()).resolves.toBeFalsy()
  }, 60_000)

  it('should not be possible to attest a claim on a Ctype that is not on chain', async () => {
    const badCtype = CType.fromSchema({
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
    } as ICType['schema'])

    const content: IClaim['contents'] = { name: 'Ralph', weight: 120 }
    const claim = Claim.fromCTypeAndClaimContents(
      badCtype,
      content,
      claimer.getAddress()
    )
    const request = (await RequestForAttestation.fromClaimAndIdentity(
      claim,
      claimer
    )).message
    const attestation = await Attestation.fromRequestAndPublicIdentity(
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
      const content: IClaim['contents'] = { name: 'Rolfi', age: 18 }
      const claim = Claim.fromCTypeAndClaimContents(
        DriversLicense,
        content,
        claimer.getAddress()
      )
      const request = (await RequestForAttestation.fromClaimAndIdentity(
        claim,
        claimer
      )).message
      const attestation = Attestation.fromRequestAndPublicIdentity(
        request,
        attester.getPublicIdentity()
      )
      const result = await attestation.store(attester)
      expect(result.status.type).toBe('Finalized')
      const cred = await Credential.fromRequestAndAttestation(
        claimer,
        request,
        attestation
      )
      attClaim = cred.createPresentation([], false)
      await expect(attClaim.verify()).resolves.toBeTruthy()
    }, 60_000)

    it('should not be possible to attest the same claim twice', async () => {
      await expect(attClaim.attestation.store(attester)).rejects.toThrowError(
        'already attested'
      )
    }, 15000)

    it('should not be possible to use attestation for different claim', async () => {
      const content = { name: 'Rolfi', age: 19 }
      const claim = Claim.fromCTypeAndClaimContents(
        DriversLicense,
        content,
        claimer.getAddress()
      )
      const request = (await RequestForAttestation.fromClaimAndIdentity(
        claim,
        claimer
      )).message
      const fakeAttClaim = new AttestedClaim({
        request,
        attestation: attClaim.attestation,
      })
      await expect(() => {
        try {
          fakeAttClaim.verify()
        } catch (error) {
          return false
        }
        return true
      }).resolves.toBeFalsy()
    }, 15000)

    it('should not be possible for the claimer to revoke an attestation', async () => {
      await expect(revoke(attClaim.getHash(), claimer)).rejects.toThrowError(
        'not permitted'
      )
      await expect(attClaim.verify()).resolves.toBeTruthy()
    }, 30000)

    it('should be possible for the attester to revoke an attestation', async () => {
      await expect(attClaim.verify()).resolves.toBeTruthy()
      const result = await revoke(attClaim.getHash(), attester)
      expect(result.status.type).toBe('Finalized')
      expect(result.isFinalized).toBeTruthy()
      await expect(() => {
        try {
          attClaim.verify()
        } catch (error) {
          return false
        }
        return true
      }).resolves.toBeFalsy()
    }, 15000)
  })

  describe('when there is another Ctype that works as a legitimation', () => {
    beforeAll(async () => {
      if (!(await CtypeOnChain(IsOfficialLicenseAuthority))) {
        await IsOfficialLicenseAuthority.store(faucet)
      }
      await expect(
        CtypeOnChain(IsOfficialLicenseAuthority)
      ).resolves.toBeTruthy()
    }, 30_000)

    it('can be included in a claim as a legitimation', async () => {
      // make credential to be used as legitimation
      const licenseAuthorization = Claim.fromCTypeAndClaimContents(
        IsOfficialLicenseAuthority,
        {
          LicenseType: "Driver's License",
          LicenseSubtypes: 'sportscars, tanks',
        },
        attester.getAddress()
      )
      const request1 = (await RequestForAttestation.fromClaimAndIdentity(
        licenseAuthorization,
        attester
      )).message
      const licenseAuthorizationGranted = Attestation.fromRequestAndPublicIdentity(
        request1,
        faucet.getPublicIdentity()
      )
      const tx1 = await licenseAuthorizationGranted.store(faucet)
      expect(tx1.status.isFinalized).toBeTruthy()
      // make request including legitimation
      const iBelieveICanDrive = Claim.fromCTypeAndClaimContents(
        DriversLicense,
        { name: 'Dominic Toretto', age: 52 },
        claimer.getAddress()
      )
      const request2 = (await RequestForAttestation.fromClaimAndIdentity(
        iBelieveICanDrive,
        claimer,
        {
          legitimations: [
            await Credential.fromRequestAndAttestation(
              attester,
              request1,
              licenseAuthorizationGranted
            ).then(e => e.createPresentation([], false)),
          ],
        }
      )).message
      const LicenseGranted = Attestation.fromRequestAndPublicIdentity(
        request2,
        attester.getPublicIdentity()
      )
      const tx2 = await LicenseGranted.store(attester)
      expect(tx2.status.isFinalized).toBeTruthy()
      const license = await Credential.fromRequestAndAttestation(
        claimer,
        request2,
        LicenseGranted
      ).then(e => e.createPresentation([], false))
      await Promise.all([
        expect(license.verify()).resolves.toBeTruthy(),
        expect(licenseAuthorizationGranted.verify()).resolves.toBeTruthy(),
      ])
    }, 60_000)
  })
})

afterAll(() => {
  blockchain.api.disconnect()
})
