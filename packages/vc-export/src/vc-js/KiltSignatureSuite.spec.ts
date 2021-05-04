/**
 * @group unit/vc-js
 */

import jsigs, { purposes } from 'jsonld-signatures'
import vcjs from 'vc-js'
import jsonld from 'jsonld'
import { Identity } from '@kiltprotocol/core'
import Suite from './KiltSignatureSuite'
import credential from './testcred.json'
import documentLoader from './documentLoader'
import {
  VerifiableCredential,
  KILT_SELF_SIGNED_PROOF_TYPE,
  SelfSignedProof,
  IPublicKeyRecord,
} from '../types'

let suite: Suite
let purpose: purposes.ProofPurpose
let proof: SelfSignedProof

beforeAll(async () => {
  suite = new Suite()
  purpose = new purposes.AssertionProofPurpose()
  credential.proof.some((p) => {
    if (p.type === KILT_SELF_SIGNED_PROOF_TYPE) {
      proof = p as SelfSignedProof
      return true
    }
    return false
  })
})

describe('jsigs', () => {
  describe('proof matching', () => {
    it('purpose matches compacted proof', async () => {
      const compactedProof = await jsonld.compact(
        { ...proof, '@context': credential['@context'] },
        'https://w3id.org/security/v2',
        { documentLoader, compactToRelative: false }
      )
      await expect(purpose.match(compactedProof, {})).resolves.toBe(true)
      await expect(
        purpose.match(compactedProof, { document: credential, documentLoader })
      ).resolves.toBe(true)
    })

    it('suite matches proof', async () => {
      const proofWithContext = { ...proof, '@context': credential['@context'] }
      await expect(suite.matchProof({ proof: proofWithContext })).resolves.toBe(
        true
      )
      await expect(
        suite.matchProof({
          proof: proofWithContext,
          document: credential,
          purpose,
          documentLoader,
        })
      ).resolves.toBe(true)
    })
  })

  describe('verification', () => {
    beforeAll(async () => {
      suite = new Suite()
    })

    it('verifies Kilt Self Signed Proof', async () => {
      await expect(
        jsigs.verify(credential, { suite, purpose, documentLoader })
      ).resolves.toMatchObject({ verified: true })
    })
  })

  describe('tamper detection', () => {
    beforeAll(async () => {
      suite = new Suite()
    })

    let tamperCred: VerifiableCredential
    beforeEach(() => {
      tamperCred = JSON.parse(JSON.stringify(credential))
    })

    it('detects tampering', async () => {
      tamperCred.id = tamperCred.id.replace('1', '2')
      await expect(
        jsigs.verify(tamperCred, { suite, purpose, documentLoader })
      ).resolves.toMatchObject({ verified: false })
    })

    it('detects signer mismatch', async () => {
      const verificationMethod = {
        ...(proof.verificationMethod as IPublicKeyRecord),
        publicKeyHex: Identity.buildFromMnemonic('').signPublicKeyAsHex,
      }
      tamperCred.proof = [{ ...proof, verificationMethod }]
      await expect(
        jsigs.verify(tamperCred, { suite, purpose, documentLoader })
      ).resolves.toMatchObject({ verified: false })
    })
  })
})

describe('vc-js', () => {
  describe('verification', () => {
    beforeAll(async () => {
      suite = new Suite()
    })

    it('verifies Kilt Self Signed Proof', async () => {
      await expect(
        vcjs.verifyCredential({ credential, suite, purpose, documentLoader })
      ).resolves.toMatchObject({ verified: true })
    })
  })

  describe('tamper detection', () => {
    beforeAll(async () => {
      suite = new Suite()
    })

    let tamperCred: VerifiableCredential
    beforeEach(() => {
      tamperCred = JSON.parse(JSON.stringify(credential))
    })

    it('detects tampering', async () => {
      tamperCred.id = tamperCred.id.replace('1', '2')
      await expect(
        vcjs.verifyCredential({
          credential: tamperCred,
          suite,
          purpose,
          documentLoader,
        })
      ).resolves.toMatchObject({ verified: false })
    })

    it('detects signer mismatch', async () => {
      const verificationMethod = {
        ...(proof.verificationMethod as IPublicKeyRecord),
        publicKeyHex: Identity.buildFromMnemonic('').signPublicKeyAsHex,
      }
      tamperCred.proof = [{ ...proof, verificationMethod }]
      await expect(
        vcjs.verifyCredential({
          credential: tamperCred,
          suite,
          purpose,
          documentLoader,
        })
      ).resolves.toMatchObject({ verified: false })
    })
  })
})
