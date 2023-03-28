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
import { ApiPromise, Keyring } from '@polkadot/api'
import { hexToU8a } from '@polkadot/util'
import type {
  DidDocument,
  IClaim,
  ICredential,
  KiltKeyringPair,
} from '@kiltprotocol/types'
import { createLightDidDocument } from '@kiltprotocol/did'
import { Sr25519Signature2020 } from './Sr25519Signature2020.js'
import { KiltAttestationV1Suite } from './KiltAttestationProofV1.js'
import { applySelectiveDisclosure } from '../../KiltAttestationProofV1.js'
import ingosCredential from '../examples/ingos-cred.json'
import {
  combineDocumentLoaders,
  documentLoader,
  kiltDidLoader,
} from '../documentLoader.js'
import type {
  KiltAttestationProofV1,
  VerifiableCredential,
} from '../../types.js'
import { KiltAttestationProofV1Purpose } from '../purposes/KiltAttestationProofV1Purpose.js'
import { exportICredentialToVc } from '../../fromICredential.js'

// is not needed and imports a dependency that does not work in node 18
jest.mock('@digitalbazaar/http-client', () => ({}))

let api: ApiPromise
const genesisHash = hexToU8a(
  '0x411f057b9107718c9624d6aa4a3f23c1653898297f3d4d529d9bb6511a39dd21'
)

const attestedCredential = exportICredentialToVc(
  ingosCredential as ICredential,
  {
    issuer: 'did:kilt:4pnfkRn5UurBJTW92d9TaVLR2CqJdY4z5HPjrEbpGyBykare',
    chainGenesisHash: genesisHash,
    blockHash: hexToU8a(
      '0x93c4a399abff5a68812479445d121995fde278b7a29d5863259cf7b6b6f1dc7e'
    ),
    timestamp: 1649670060 * 1000,
  }
)

const notAttestedCredential = exportICredentialToVc(
  Credential.fromClaim(ingosCredential.claim as IClaim),
  {
    issuer: 'did:kilt:4pnfkRn5UurBJTW92d9TaVLR2CqJdY4z5HPjrEbpGyBykare',
    chainGenesisHash: genesisHash,
    blockHash: hexToU8a(
      '0x93c4a399abff5a68812479445d121995fde278b7a29d5863259cf7b6b6f1dc7e'
    ),
    timestamp: 1649670060 * 1000,
  }
)

let suite: KiltAttestationV1Suite
let purpose: purposes.ProofPurpose
let proof: KiltAttestationProofV1

beforeAll(async () => {
  api = await connect('wss://spiritnet.kilt.io')
  suite = new KiltAttestationV1Suite({ api })
  purpose = new KiltAttestationProofV1Purpose()
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
    const derived = applySelectiveDisclosure(attestedCredential, proof, [])
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
    let did: DidDocument
    let signingSuite: any
    let didDocumentLoader: jsigs.DocumentLoader
    beforeAll(async () => {
      const keypair = new Keyring({ type: 'sr25519' }).addFromMnemonic(
        '//Alice'
      ) as KiltKeyringPair & { type: 'sr25519' }
      did = createLightDidDocument({ authentication: [keypair] })
      const signer = {
        sign: async ({ data }: { data: Uint8Array }) => keypair.sign(data),
        id: did.uri + did.authentication[0].id,
      }
      signingSuite = new Sr25519Signature2020({ signer })
      didDocumentLoader = combineDocumentLoaders([
        documentLoader,
        // @ts-ignore
        async (url, dl) => {
          const result = await kiltDidLoader(url, dl)
          // we need to add the context url to keys or it won't be accepted
          result.document['@context'] = [
            ...result?.document?.['@context'],
            Sr25519Signature2020.CONTEXT_URL,
          ]
          return result
        },
      ])
    })

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

    it('creates and verifies a signed presentation', async () => {
      const verifiableCredential = { ...attestedCredential }
      let presentation = vcjs.createPresentation({
        verifiableCredential,
        holder: did.uri,
      })

      presentation = await vcjs.signPresentation({
        presentation,
        suite: signingSuite,
        challenge: '0x1234',
        documentLoader,
      })

      const result = await vcjs.verify({
        presentation,
        suite: [suite, new Sr25519Signature2020()],
        // TODO: vcjs is currently broken and ignores the presentationPurpose if a purpose is given; so we can't actually verify the credential within unfortunately
        // purpose: new AnyProofPurpose(),
        challenge: '0x1234',
        documentLoader: didDocumentLoader,
        checkStatus: suite.checkStatus,
      })

      expect(result.presentationResult).not.toHaveProperty(
        'error',
        expect.any(Array)
      )
      expect(result).toMatchObject({
        // verified: true,
        // error: undefined,
        presentationResult: { verified: true },
        // credentialResults: [{verified: true, error: undefined}]
      })
    })

    it('issues and verifies a signed credential', async () => {
      const credential: VerifiableCredential = {
        ...attestedCredential,
        issuer: did.uri,
      }
      delete credential.proof
      // @ts-expect-error
      delete credential.credentialStatus
      // TODO: light DIDs don't support assertionMethods
      const mockDidDocumentLoader = combineDocumentLoaders([
        documentLoader,
        // @ts-ignore
        async (url, dl) => {
          const result = await kiltDidLoader(url, dl)
          // we need to add the context url to keys or it won't be accepted
          result.document['@context'] = [
            ...result?.document?.['@context'],
            Sr25519Signature2020.CONTEXT_URL,
          ]
          if ('authentication' in result.document) {
            // @ts-ignore
            result.document.assertionMethod = result.document.authentication
          }
          return result
        },
      ])

      const verifiableCredential = await vcjs.issue({
        credential,
        suite: signingSuite,
        documentLoader,
      })

      const result = await vcjs.verifyCredential({
        credential: verifiableCredential,
        suite: new Sr25519Signature2020(),
        documentLoader: mockDidDocumentLoader,
      })
      expect(result).not.toHaveProperty('error')
      expect(result).toHaveProperty('verified', true)
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
