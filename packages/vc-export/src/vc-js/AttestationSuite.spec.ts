import { Blockchain } from '@kiltprotocol/chain-helpers'
import jsigs, { purposes } from 'jsonld-signatures'
import { Attestation } from '@kiltprotocol/core'
import AttestationSuite from './AttestationSuite'
import credential from './testcred.json'
import documentLoader from './documentLoader'

const attestation = Attestation.fromAttestation({
  claimHash:
    '0x24195dd6313c0bb560f3043f839533b54bcd32d602dd848471634b0345ec88ad',
  cTypeHash:
    '0xf0fd09f9ed6233b2627d37eb5d6c528345e8945e0b610e70997ed470728b2ebf',
  owner: '4sejigvu6STHdYmmYf2SuN92aNp8TbrsnBBDUj7tMrJ9Z3cG',
  delegationId: null,
  revoked: false,
})

const spy = jest
  .spyOn(Attestation, 'query')
  .mockImplementation(async (): Promise<Attestation | null> => attestation)

let suite: AttestationSuite
let purpose: purposes.ProofPurpose

beforeAll(async () => {
  const KiltConnection = new Blockchain({} as any)
  suite = new AttestationSuite({ KiltConnection })
  purpose = new purposes.AssertionProofPurpose()
})

describe('jsigs', () => {
  describe('attested', () => {
    beforeAll(() => {
      spy.mockImplementation(async (): Promise<Attestation> => attestation)
    })

    it('verifies Kilt Attestation Proof', async () => {
      await expect(
        jsigs.verify(credential, { suite, purpose, documentLoader })
      ).resolves.toMatchObject({ verified: true })
    })

    it('recreates Kilt Attestation Proof', async () => {
      const document = { ...credential, proof: [] }
      await expect(
        jsigs.sign(document, { suite, purpose, documentLoader })
      ).resolves.toMatchObject({
        proof: [credential.proof[1]],
      })
    })
  })

  describe('revoked', () => {
    beforeAll(() => {
      const revoked = { ...attestation, revoked: true }
      spy.mockImplementation(
        async (): Promise<Attestation> => revoked as Attestation
      )
    })

    it('fails to verify Kilt Attestation Proof', async () => {
      await expect(
        jsigs.verify(credential, { suite, purpose, documentLoader })
      ).resolves.toMatchObject({ verified: false })
    })

    it('still recreates Kilt Attestation Proof', async () => {
      const document = { ...credential, proof: [] }
      await expect(
        jsigs.sign(document, { suite, purpose, documentLoader })
      ).resolves.toMatchObject({
        proof: [credential.proof[1]],
      })
    })
  })
  describe('not attested', () => {
    beforeAll(() => {
      spy.mockImplementation(async (): Promise<Attestation | null> => null)
    })

    it('fails to verify Kilt Attestation Proof', async () => {
      await expect(
        jsigs.verify(credential, { suite, purpose, documentLoader })
      ).resolves.toMatchObject({ verified: false })
    })

    it('fails to recreate Kilt Attestation Proof', async () => {
      const document = { ...credential, proof: [] }
      await expect(
        jsigs.sign(document, { suite, purpose, documentLoader })
      ).rejects.toThrow()
    })
  })
})
