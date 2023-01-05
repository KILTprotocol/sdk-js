/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group unit/vc-js
 */

import { ApiMocks } from '@kiltprotocol/testing'
import jsigs, { purposes } from 'jsonld-signatures'
import { Attestation } from '@kiltprotocol/core'
import type { IAttestation } from '@kiltprotocol/types'
import vcjs from 'vc-js'
import jsonld from 'jsonld'
import { KiltAttestedSuite as AttestationSuite } from './KiltAttestedSuite'
import credential from '../examples/example-vc.json'
import { documentLoader } from '../documentLoader'
import type { AttestedProof } from '../../types'
import { KILT_ATTESTED_PROOF_TYPE } from '../../constants'

const mockedApi: any = ApiMocks.getMockedApi()

const attestation: IAttestation = {
  claimHash:
    '0x24195dd6313c0bb560f3043f839533b54bcd32d602dd848471634b0345ec88ad',
  cTypeHash:
    '0xf0fd09f9ed6233b2627d37eb5d6c528345e8945e0b610e70997ed470728b2ebf',
  owner: 'did:kilt:4sejigvu6STHdYmmYf2SuN92aNp8TbrsnBBDUj7tMrJ9Z3cG',
  delegationId: null,
  revoked: false,
}

const encodedAttestation = ApiMocks.mockChainQueryReturn(
  'attestation',
  'attestations',
  [
    '0x24195dd6313c0bb560f3043f839533b54bcd32d602dd848471634b0345ec88ad',
    '4sejigvu6STHdYmmYf2SuN92aNp8TbrsnBBDUj7tMrJ9Z3cG',
    undefined,
    false,
    ['4sejigvu6STHdYmmYf2SuN92aNp8TbrsnBBDUj7tMrJ9Z3cG', 0],
  ]
)
mockedApi.query.attestation.attestations.mockResolvedValue(encodedAttestation)

const spy = jest.spyOn(Attestation, 'fromChain').mockReturnValue(attestation)

let suite: AttestationSuite
let purpose: purposes.ProofPurpose
let proof: AttestedProof

beforeAll(async () => {
  suite = new AttestationSuite({ KiltConnection: mockedApi })
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
      expect(await purpose.match(compactedProof, {})).toBe(true)
      expect(
        await purpose.match(compactedProof, {
          document: credential,
          documentLoader,
        })
      ).toBe(true)
    })

    it('suite matches proof', async () => {
      const proofWithContext = { ...proof, '@context': credential['@context'] }
      expect(await suite.matchProof({ proof: proofWithContext })).toBe(true)
      expect(
        await suite.matchProof({
          proof: proofWithContext,
          document: credential,
          purpose,
          documentLoader,
        })
      ).toBe(true)
    })
  })

  describe('attested', () => {
    beforeAll(() => {
      spy.mockReturnValue(attestation)
    })

    it('verifies Kilt Attestation Proof', async () => {
      expect(
        await jsigs.verify(credential, { suite, purpose, documentLoader })
      ).toMatchObject({ verified: true })
    })
  })

  describe('revoked', () => {
    beforeAll(() => {
      spy.mockReturnValue({ ...attestation, revoked: true })
    })

    it('fails to verify Kilt Attestation Proof', async () => {
      expect(
        await jsigs.verify(credential, { suite, purpose, documentLoader })
      ).toMatchObject({ verified: false })
    })
  })

  describe('not attested', () => {
    it('fails to verify Kilt Attestation Proof', async () => {
      expect(
        await jsigs.verify(credential, { suite, purpose, documentLoader })
      ).toMatchObject({ verified: false })
    })
  })
})

describe('vc-js', () => {
  describe('attested', () => {
    beforeAll(() => {
      spy.mockReturnValue(attestation)
    })

    it('verifies Kilt Attestation Proof', async () => {
      expect(
        await vcjs.verifyCredential({
          credential,
          suite,
          purpose,
          documentLoader,
        })
      ).toMatchObject({ verified: true })
    })
  })

  describe('revoked', () => {
    beforeAll(() => {
      spy.mockReturnValue({ ...attestation, revoked: true })
    })

    it('fails to verify Kilt Attestation Proof', async () => {
      expect(
        await vcjs.verifyCredential({
          credential,
          suite,
          purpose,
          documentLoader,
        })
      ).toMatchObject({ verified: false })
    })
  })

  describe('not attested', () => {
    it('fails to verify Kilt Attestation Proof', async () => {
      expect(
        await vcjs.verifyCredential({
          credential,
          suite,
          purpose,
          documentLoader,
        })
      ).toMatchObject({ verified: false })
    })
  })
})
