/**
 * @packageDocumentation
 * @group integration/attestation
 * @ignore
 */

import {
  Accumulator,
  AttesterAttestationSession,
} from '@kiltprotocol/portablegabi'
import { Claim, IBlockchainApi, IClaim, Message } from '..'
import { Attester, Claimer, Verifier } from '../actor'
import { ClaimerAttestationSession } from '../actor/Claimer'
import { IS_IN_BLOCK, submitTxWithReSign } from '../blockchain/Blockchain.utils'
import { configuration } from '../config/ConfigService'
import getCached from '../blockchainApiConnection'
import Credential from '../credential'
import Identity, { AttesterIdentity } from '../identity'
import constants from '../test/constants'
import { IRevocationHandle } from '../types/Attestation'
import { CtypeOnChain, DriversLicense, FaucetSeed, WS_ADDRESS } from './utils'

let blockchain: IBlockchainApi | undefined
beforeAll(async () => {
  blockchain = await getCached((configuration.host = WS_ADDRESS))
})

describe('Privacy enhanced claim, attestation, verification process', () => {
  let claimer: Identity
  let attester: AttesterIdentity
  let accumulator: Accumulator
  let claim: Claim
  const content: IClaim['contents'] = { name: 'Ralph', age: 12 }
  let verifier: Identity
  const requirePE = true

  beforeAll(async () => {
    // set up actors
    claimer = await Identity.buildFromURI('//Bob', { peEnabled: true })
    attester = await AttesterIdentity.buildFromMnemonic(FaucetSeed, {
      key: {
        publicKey: constants.PUBLIC_KEY.toString(),
        privateKey: constants.PRIVATE_KEY.toString(),
      },
    })
    verifier = await Identity.buildFromMnemonic(Identity.generateMnemonic(), {
      peEnabled: true,
    })

    // update accumulator (empty for fresh chain)
    accumulator = await Attester.buildAccumulator(attester)
    await attester.updateAccumulator(accumulator)

    // set up claim (ctype missing on fresh chain)
    if (!(await CtypeOnChain(DriversLicense))) {
      await DriversLicense.store(attester).then((tx) =>
        submitTxWithReSign(tx, attester, { resolveOn: IS_IN_BLOCK })
      )
    }
    claim = Claim.fromCTypeAndClaimContents(
      DriversLicense,
      content,
      claimer.address
    )
  }, 80_000)

  it('should get accumulator of attester', async () => {
    expect(accumulator).toBeDefined()
    expect(accumulator).toStrictEqual(attester.getAccumulator())
    expect(accumulator).toBeInstanceOf(Accumulator)
  })

  it('should attest and verify a PE claim from start to finish', async () => {
    // attester initiates attestation
    const {
      session: attestersSession,
      message: initiateAttestationMsg,
    } = await Attester.initiateAttestation(
      attester,
      claimer.getPublicIdentity()
    )
    expect(attestersSession).toBeDefined()
    expect(initiateAttestationMsg).toBeDefined()
    expect(initiateAttestationMsg.body).toBeDefined()
    expect(initiateAttestationMsg).toBeInstanceOf(Message)

    // claimer requests attestation
    const {
      message: reqForAtt,
      session: claimerSession,
    } = await Claimer.requestAttestation(
      claim,
      claimer,
      attester.getPublicIdentity(),
      {
        initiateAttestationMsg,
      }
    )
    expect(reqForAtt).toBeDefined()
    expect(reqForAtt.body).toBeDefined()
    expect(reqForAtt).toBeInstanceOf(Message)
    expect(claimerSession).toBeDefined()
    expect(claimerSession).toHaveProperty('peSession')
    expect(claimerSession).toHaveProperty('requestForAttestation')

    // attester issues attestation
    const {
      revocationHandle,
      message: submitAttestation,
    } = await Attester.issueAttestation(
      attester,
      reqForAtt,
      claimer.getPublicIdentity(),
      attestersSession,
      requirePE
    )
    expect(revocationHandle).toBeDefined()
    expect(revocationHandle).toHaveProperty('attestation')
    expect(revocationHandle).toHaveProperty('witness')
    expect(submitAttestation).toBeDefined()
    expect(submitAttestation.body).toBeDefined()
    expect(submitAttestation).toBeInstanceOf(Message)

    // claimer builds credential
    const credential = await Claimer.buildCredential(
      claimer,
      submitAttestation,
      claimerSession
    )
    expect(credential).toBeDefined()
    expect(credential.attestation.cTypeHash).toBe(claim.cTypeHash)
    expect(credential.privacyCredential).toBeDefined()
    expect(credential.reqForAtt).toBeDefined()

    // verifier initiates verification session
    const {
      session: verifierSession,
      message: verifyReq,
    } = await Verifier.newRequestBuilder()
      .requestPresentationForCtype({
        ctypeHash: credential.attestation.cTypeHash,
        requestUpdatedAfter: new Date(), // request accumulator newer than NOW or the latest available
        properties: ['age'],
      })
      .finalize(requirePE, verifier, claimer.getPublicIdentity())
    expect(verifierSession).toBeDefined()
    expect(verifierSession).toHaveProperty('privacyEnhancement')
    expect(verifierSession).toHaveProperty('requestedProperties', [
      {
        ctype: claim.cTypeHash,
        properties: ['claim.contents.age', 'claim.cTypeHash'],
      },
    ])
    expect(verifierSession).toHaveProperty('allowedPrivacyEnhancement', true)
    expect(verifyReq).toBeDefined()
    expect(verifyReq.body).toBeDefined()
    expect(verifyReq).toBeInstanceOf(Message)

    // claimer creates presentation
    const presentation = await Claimer.createPresentation(
      claimer,
      verifyReq,
      verifier.getPublicIdentity(),
      [credential],
      [attester.getPublicIdentity()],
      requirePE
    )
    expect(presentation).toBeDefined()
    expect(presentation.body).toBeDefined()
    expect(presentation).toBeInstanceOf(Message)
  }, 80_000)

  describe('Verification', () => {
    let attestersSession: AttesterAttestationSession
    let initiateAttestationMsg: Message
    let reqForAtt: Message
    let claimerSession: ClaimerAttestationSession
    let revocationHandle: IRevocationHandle
    let submitAttestation: Message
    let credential: Credential
    let verifierSession: Verifier.IVerifierSession
    let verifyReq: Message
    let presentation: Message

    // errors in this setup will be caught in previous test
    beforeAll(async () => {
      // attester initiates attestation
      ;({
        session: attestersSession,
        message: initiateAttestationMsg,
      } = await Attester.initiateAttestation(
        attester,
        claimer.getPublicIdentity()
      ))
      // claimer requests attestation
      ;({
        message: reqForAtt,
        session: claimerSession,
      } = await Claimer.requestAttestation(
        claim,
        claimer,
        attester.getPublicIdentity(),
        { initiateAttestationMsg }
      ))
      // attester issues attestation
      ;({
        revocationHandle,
        message: submitAttestation,
      } = await Attester.issueAttestation(
        attester,
        reqForAtt,
        claimer.getPublicIdentity(),
        attestersSession,
        requirePE
      ))
      // claimer builds credential
      credential = await Claimer.buildCredential(
        claimer,
        submitAttestation,
        claimerSession
      )
      // verifier initiates verification session
      ;({
        session: verifierSession,
        message: verifyReq,
      } = await Verifier.newRequestBuilder()
        .requestPresentationForCtype({
          ctypeHash: credential.attestation.cTypeHash,
          requestUpdatedAfter: new Date(), // request accumulator newer than NOW or the latest available
          properties: ['age'],
        })
        .finalize(requirePE, verifier, claimer.getPublicIdentity()))
      // claimer creates presentation
      presentation = await Claimer.createPresentation(
        claimer,
        verifyReq,
        verifier.getPublicIdentity(),
        [credential],
        [attester.getPublicIdentity()],
        requirePE
      )
    }, 80_000)

    it('safety checks verification setup', () => {
      expect(credential).toBeDefined()
      expect(credential.privacyCredential).toBeDefined()
      expect(credential.reqForAtt).toBeDefined()
      expect(verifierSession).toBeDefined()
      expect(verifyReq).toBeDefined()
      expect(presentation).toBeDefined()
    })

    it('should be possible to verify PE claim', async () => {
      // verifier checks presentation
      const { verified, claims } = await Verifier.verifyPresentation(
        presentation,
        verifierSession,
        [await Attester.getLatestAccumulator(attester.getPublicIdentity())],
        [attester.getPublicIdentity()]
      )
      expect(verified).toBeTruthy()
      expect(claims).toBeDefined()
      expect(claims).toHaveLength(1)
      expect(claims[0]).toHaveProperty('claim')
      expect((claims[0] as any).claim.contents).toStrictEqual({
        age: content.age,
      })
    })

    it('should not verify revoked attestation', async () => {
      const accumulatorBeforeRevocation = accumulator
      await Attester.revokeAttestation(attester, revocationHandle)
      // should update accumulator
      expect(attester.getAccumulator()).not.toStrictEqual(
        accumulatorBeforeRevocation
      )
      // should not verify with latest accumulator
      const { verified: shouldBeRevoked } = await Verifier.verifyPresentation(
        presentation,
        verifierSession,
        [await Attester.getLatestAccumulator(attester.getPublicIdentity())],
        [attester.getPublicIdentity()]
      )
      expect(shouldBeRevoked).toBeFalsy()
      // but should verify with outdated accumulator on which credential was still valid
      const { verified: shouldBeTrue } = await Verifier.verifyPresentation(
        presentation,
        verifierSession,
        [accumulatorBeforeRevocation],
        [attester.getPublicIdentity()]
      )
      expect(shouldBeTrue).toBeTruthy()
    }, 80_000)

    it('should not reveal any non-public claimer data', async () => {
      // compare two presentations on same credential from same claimer
      const presentation2 = await Claimer.createPresentation(
        claimer,
        verifyReq,
        verifier.getPublicIdentity(),
        [credential],
        [attester.getPublicIdentity()],
        requirePE
      )
      // FIXME: At a later stage. For privacy enhancement, this should have length 1.
      // But senderAddress and senderBoxPublicKey obviously match (currently)
      // when created from same claimer identity
      expect(
        Object.entries(presentation).filter(
          ([key, value]) => value === presentation2[key]
        )
      ).toHaveLength(3)
    })
  })
})

afterAll(() => {
  if (typeof blockchain !== 'undefined') blockchain.api.disconnect()
})
