/**
 * @group unit/vc-js
 */

import jsigs, { purposes } from 'jsonld-signatures'
import vcjs from 'vc-js'
import jsonld from 'jsonld'
import Suite from './KiltDisclosureSuite'
import credential from './testcred.json'
import documentLoader from './documentLoader'
import {
  CredentialDigestProof,
  KILT_CREDENTIAL_DIGEST_PROOF_TYPE,
  VerifiableCredential,
} from '../types'

let suite: Suite
let purpose: purposes.ProofPurpose
let proof: CredentialDigestProof

beforeAll(async () => {
  suite = new Suite()
  purpose = new purposes.AssertionProofPurpose()
  credential.proof.some((p) => {
    if (p.type === KILT_CREDENTIAL_DIGEST_PROOF_TYPE) {
      proof = p as CredentialDigestProof
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

    it('verifies Kilt Credential Digest Proof', async () => {
      await expect(
        jsigs.verify(credential, { suite, purpose, documentLoader })
      ).resolves.toMatchObject({ verified: true })
    })

    it('verifies Kilt Credential Digest Proof with props removed', async () => {
      const { name, ...credentialSubject } = credential.credentialSubject
      expect(credentialSubject).not.toHaveProperty('name')
      await expect(
        jsigs.verify(
          { ...credential, credentialSubject },
          { suite, purpose, documentLoader }
        )
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

    it('detects tampering on props', async () => {
      tamperCred.credentialSubject.name = 'MacGyver'
      await expect(
        jsigs.verify(tamperCred, { suite, purpose, documentLoader })
      ).resolves.toMatchObject({ verified: false })
    })
  })

  describe('issue', () => {
    it('creates Kilt Credential Digest Proof', async () => {
      suite = new Suite()
      const document = { ...credential, proof: [] }
      const signed = await jsigs.sign(document, {
        suite,
        purpose,
        documentLoader,
      })
      Object.keys(proof.nonces).forEach((i) => {
        expect(signed).toHaveProperty(`proof.0.nonces.${i}`)
      })
    })

    it('recreates Kilt Credential Digest Proof', async () => {
      suite = new Suite({ existingProof: proof })
      const document = { ...credential, proof: [] }
      const signed = await jsigs.sign(document, {
        suite,
        purpose,
        documentLoader,
      })
      expect(signed).toHaveProperty(
        'proof.0.claimHashes',
        expect.arrayContaining(proof.claimHashes)
      )
      expect(signed).toHaveProperty(
        'proof.0.nonces',
        expect.objectContaining(proof.nonces)
      )
    })

    it('recreates Kilt Credential Digest Proof for reduced credential', async () => {
      suite = new Suite({ existingProof: proof })
      const document = {
        ...credential,
        proof: [],
        credentialSubject: { ...credential.credentialSubject, name: undefined },
      }
      const signed = await jsigs.sign(document, {
        suite,
        purpose,
        documentLoader,
      })
      expect(signed).toHaveProperty(
        'proof.0.claimHashes',
        expect.objectContaining(proof.claimHashes)
      )
      expect(proof.nonces).toMatchObject((signed as any).proof[0].nonces)
    })
  })
})

describe('vc-js', () => {
  describe('verification', () => {
    beforeAll(async () => {
      suite = new Suite()
    })

    it('verifies Kilt Credential Digest Proof', async () => {
      await expect(
        vcjs.verifyCredential({ credential, suite, purpose, documentLoader })
      ).resolves.toMatchObject({ verified: true })
    })

    it('verifies Kilt Credential Digest Proof with props removed', async () => {
      const { name, ...credentialSubject } = credential.credentialSubject
      expect(credentialSubject).not.toHaveProperty('name')
      await expect(
        vcjs.verifyCredential({
          credential: { ...credential, credentialSubject },
          suite,
          purpose,
          documentLoader,
        })
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

    it('detects tampering on props', async () => {
      tamperCred.credentialSubject.name = 'MacGyver'
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

  describe('issue', () => {
    it('creates Kilt Credential Digest Proof', async () => {
      suite = new Suite()
      const document = { ...credential, proof: [] }
      const signed = await vcjs.issue({
        credential: document,
        suite,
        purpose,
        documentLoader,
      })
      Object.keys(proof.nonces).forEach((i) => {
        expect(signed).toHaveProperty(`proof.0.nonces.${i}`)
      })
    })

    it('recreates Kilt Credential Digest Proof', async () => {
      suite = new Suite({ existingProof: proof })
      const document = { ...credential, proof: [] }
      await expect(
        vcjs.issue({ credential: document, suite, purpose, documentLoader })
      ).resolves.toMatchObject({
        proof: [proof],
      })
    })

    it('recreates Kilt Credential Digest Proof for reduced credential', async () => {
      suite = new Suite({ existingProof: proof })
      const document = {
        ...credential,
        proof: [],
        credentialSubject: {
          ...credential.credentialSubject,
          name: undefined,
        },
      }
      const signed = await vcjs.issue({
        credential: document,
        suite,
        purpose,
        documentLoader,
      })

      expect(signed).toHaveProperty(
        'proof.0.claimHashes',
        expect.arrayContaining(proof.claimHashes)
      )
      expect(proof.nonces).toMatchObject((signed as any).proof[0].nonces)
    })
  })
})
