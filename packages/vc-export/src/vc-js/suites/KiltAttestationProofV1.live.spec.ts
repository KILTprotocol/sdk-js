/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group unit/vc-js
 */

import jsigs, { Proof, purposes } from 'jsonld-signatures'
import { connect, Credential, disconnect } from '@kiltprotocol/core'
import vcjs from '@digitalbazaar/vc'
import jsonld from 'jsonld'
import { ApiPromise } from '@polkadot/api'
import { hexToU8a } from '@polkadot/util'
import { IClaim, ICredential } from '@kiltprotocol/types'
import { KiltAttestationV1Suite } from './KiltAttestationProofV1'
import { deriveProof } from '../../KiltAttestationProofV1'
import ingosCredential from '../examples/ingos-cred.json'
import { documentLoader } from '../documentLoader'
import { KiltAttestationProofV1, VerifiableCredential } from '../../types'
import { AnyProofPurpose } from './AnyProofPurpose.js'
import * as KiltCredentialV1 from '../../KiltCredentialV1.js'

let api: ApiPromise
const genesisHash = hexToU8a(
  '0x411f057b9107718c9624d6aa4a3f23c1653898297f3d4d529d9bb6511a39dd21'
)

const attestedCredential = KiltCredentialV1.fromICredential(
  ingosCredential as ICredential,
  'did:kilt:4pnfkRn5UurBJTW92d9TaVLR2CqJdY4z5HPjrEbpGyBykare',
  genesisHash,
  hexToU8a(
    '0x93c4a399abff5a68812479445d121995fde278b7a29d5863259cf7b6b6f1dc7e'
  ),
  1649670060 * 1000
)

const notAttestedCredential = KiltCredentialV1.fromICredential(
  Credential.fromClaim(ingosCredential.claim as IClaim),
  'did:kilt:4pnfkRn5UurBJTW92d9TaVLR2CqJdY4z5HPjrEbpGyBykare',
  genesisHash,
  hexToU8a(
    '0x93c4a399abff5a68812479445d121995fde278b7a29d5863259cf7b6b6f1dc7e'
  ),
  1649670060 * 1000
)

let suite: KiltAttestationV1Suite
let purpose: purposes.ProofPurpose
let proof: KiltAttestationProofV1

beforeAll(async () => {
  api = await connect('wss://spiritnet.kilt.io')
  suite = new KiltAttestationV1Suite({ api })
  purpose = new AnyProofPurpose()
  proof = attestedCredential.proof as KiltAttestationProofV1
})

describe('jsigs', () => {
  describe('proof matching', () => {
    it('purpose matches compacted proof', async () => {
      const compactedProof = (await jsonld.compact(
        { ...proof, '@context': attestedCredential['@context'] },
        attestedCredential['@context'],
        { documentLoader, compactToRelative: false }
      )) as Proof
      expect(await purpose.match(compactedProof, {})).toBe(true)
      expect(
        await purpose.match(compactedProof, {
          document: attestedCredential,
          documentLoader,
        })
      ).toBe(true)
    })

    it('suite matches proof', async () => {
      const proofWithContext = {
        ...proof,
        '@context': attestedCredential['@context'],
      }
      expect(await suite.matchProof({ proof: proofWithContext })).toBe(true)
      expect(
        await suite.matchProof({
          proof: proofWithContext,
          document: attestedCredential,
          purpose,
          documentLoader,
        })
      ).toBe(true)
    })
  })

  describe('attested', () => {
    it('verifies Kilt Attestation Proof', async () => {
      const result = await jsigs.verify(attestedCredential, {
        suite,
        purpose,
        documentLoader,
      })
      expect(result).toHaveProperty('verified', true)
      expect(result).not.toHaveProperty('error')
    })
  })

  it('verifies proof with props removed', async () => {
    const derived = deriveProof(attestedCredential, proof, [])
    expect(derived.credential.credentialSubject).not.toHaveProperty('Email')
    expect(
      await jsigs.verify(
        { ...derived.credential, proof: derived.proof },
        { suite, purpose, documentLoader }
      )
    ).toMatchObject({ verified: true })
  })

  // TODO: need example credential
  describe.skip('revoked', () => {
    it('fails to verify Kilt Attestation Proof', async () => {
      expect(
        await jsigs.verify(attestedCredential, {
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
        await jsigs.verify(notAttestedCredential, {
          suite,
          purpose,
          documentLoader,
        })
      ).toMatchObject({ verified: false })
    })
  })

  it('detects tampering on claims', async () => {
    // make a copy
    const tamperCred: VerifiableCredential = JSON.parse(
      JSON.stringify(attestedCredential)
    )
    tamperCred.credentialSubject.Email = 'macgyver@google.com'
    expect(
      await jsigs.verify(tamperCred, { suite, purpose, documentLoader })
    ).toMatchObject({ verified: false })
  })

  it('detects tampering on credential', async () => {
    const tamperCred: VerifiableCredential = JSON.parse(
      JSON.stringify(attestedCredential)
    )
    tamperCred.id = tamperCred.id.replace('1', '2') as any
    expect(
      await jsigs.verify(tamperCred, { suite, purpose, documentLoader })
    ).toMatchObject({ verified: false })
  })

  it('detects signer mismatch', async () => {
    const tamperCred: VerifiableCredential = JSON.parse(
      JSON.stringify(attestedCredential)
    )
    tamperCred.issuer =
      'did:kilt:4oFNEgM6ibgEW1seCGXk3yCM6o7QTnDGrqGtgSRSspVMDg4c'
    expect(
      await jsigs.verify(tamperCred, { suite, purpose, documentLoader })
    ).toMatchObject({ verified: false })
  })
})

describe('vc-js', () => {
  const mockSuite = new KiltAttestationV1Suite({
    api: {
      genesisHash,
      query: {
        attestation: {
          attestations: async () =>
            api.createType('Option<AttestationAttestationsAttestationDetails>'),
        },
      },
    } as any,
  })

  describe('attested', () => {
    it('verifies Kilt Attestation Proof', async () => {
      const result = await vcjs.verifyCredential({
        credential: attestedCredential,
        suite,
        purpose,
        documentLoader,
        checkStatus: suite.checkStatus,
      })
      expect(result).toHaveProperty('verified', true)
      expect(result).not.toHaveProperty('error')
    })
  })

  describe('revoked', () => {
    it('fails to verify Kilt Attestation Proof', async () => {
      expect(
        await vcjs.verifyCredential({
          credential: attestedCredential,
          suite,
          purpose,
          documentLoader,
          checkStatus: mockSuite.checkStatus,
        })
      ).toMatchObject({ verified: false })
    })
  })

  describe('not attested', () => {
    it('fails to verify Kilt Attestation Proof', async () => {
      expect(
        await vcjs.verifyCredential({
          credential: notAttestedCredential,
          suite,
          purpose,
          documentLoader,
          checkStatus: suite.checkStatus,
        })
      ).toMatchObject({ verified: false })
    })
  })
})

afterAll(disconnect)
