/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group unit/vc-js
 */

import jsigs, { purposes } from 'jsonld-signatures'
import vcjs from 'vc-js'
import jsonld from 'jsonld'
import { KiltDisclosureSuite as Suite } from './KiltIntegritySuite'
import credential from '../examples/example-vc.json'
import { documentLoader } from '../documentLoader'
import type { CredentialDigestProof, VerifiableCredential } from '../../types'
import { KILT_CREDENTIAL_DIGEST_PROOF_TYPE } from '../../constants'

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
      /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
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
      /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
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
})
