/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group unit/vc-js
 */

import { Blockchain } from '@kiltprotocol/chain-helpers'
import jsigs, { purposes } from 'jsonld-signatures'
import { Attestation } from '@kiltprotocol/core'
import vcjs from 'vc-js'
import jsonld from 'jsonld'
import { KiltAttestedSuite as AttestationSuite } from './KiltAttestedSuite'
import credential from '../examples/example-vc.json'
import { documentLoader } from '../documentLoader'
import type { AttestedProof } from '../../types'
import { KILT_ATTESTED_PROOF_TYPE } from '../../constants'

const attestation = Attestation.fromAttestation({
  claimHash:
    '0x24195dd6313c0bb560f3043f839533b54bcd32d602dd848471634b0345ec88ad',
  cTypeHash:
    '0xf0fd09f9ed6233b2627d37eb5d6c528345e8945e0b610e70997ed470728b2ebf',
  owner: 'did:kilt:4sejigvu6STHdYmmYf2SuN92aNp8TbrsnBBDUj7tMrJ9Z3cG',
  delegationId: null,
  revoked: false,
})

const spy = jest
  .spyOn(Attestation, 'query')
  .mockImplementation(async (): Promise<Attestation | null> => attestation)

let suite: AttestationSuite
let purpose: purposes.ProofPurpose
let proof: AttestedProof

beforeAll(async () => {
  const KiltConnection = new Blockchain({} as any)
  suite = new AttestationSuite({ KiltConnection })
  purpose = new purposes.AssertionProofPurpose()
  credential.proof.some((p) => {
    if (p.type === KILT_ATTESTED_PROOF_TYPE) {
      proof = p as AttestedProof
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

  describe('attested', () => {
    beforeAll(() => {
      spy.mockImplementation(async (): Promise<Attestation> => attestation)
    })

    it('verifies Kilt Attestation Proof', async () => {
      await expect(
        jsigs.verify(credential, { suite, purpose, documentLoader })
      ).resolves.toMatchObject({ verified: true })
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
  })
})

describe('vc-js', () => {
  describe('attested', () => {
    beforeAll(() => {
      spy.mockImplementation(async (): Promise<Attestation> => attestation)
    })

    it('verifies Kilt Attestation Proof', async () => {
      await expect(
        vcjs.verifyCredential({ credential, suite, purpose, documentLoader })
      ).resolves.toMatchObject({ verified: true })
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
        vcjs.verifyCredential({ credential, suite, purpose, documentLoader })
      ).resolves.toMatchObject({ verified: false })
    })
  })

  describe('not attested', () => {
    beforeAll(() => {
      spy.mockImplementation(async (): Promise<Attestation | null> => null)
    })

    it('fails to verify Kilt Attestation Proof', async () => {
      await expect(
        vcjs.verifyCredential({ credential, suite, purpose, documentLoader })
      ).resolves.toMatchObject({ verified: false })
    })
  })
})
