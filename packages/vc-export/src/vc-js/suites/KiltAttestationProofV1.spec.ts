/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group unit/vc-js
 */

import { hexToU8a, u8aEq } from '@polkadot/util'
// @ts-expect-error not a typescript module
import * as vcjs from '@digitalbazaar/vc'
import {
  Ed25519Signature2020,
  suiteContext as Ed25519Signature2020Context,
  // @ts-expect-error not a typescript module
} from '@digitalbazaar/ed25519-signature-2020'
// @ts-expect-error not a typescript module
import jsigs from 'jsonld-signatures' // cjs module
// @ts-expect-error not a typescript module
import jsonld from 'jsonld' // cjs module

import { Credential } from '@kiltprotocol/core'
import { ConfigService } from '@kiltprotocol/config'
import * as Did from '@kiltprotocol/did'
import { Crypto } from '@kiltprotocol/utils'
import type {
  ConformingDidDocument,
  IClaim,
  ICredential,
  KiltKeyringPair,
  SubmittableExtrinsic,
} from '@kiltprotocol/types'

import { exportICredentialToVc } from '../../fromICredential.js'
import { applySelectiveDisclosure } from '../../KiltAttestationProofV1.js'
import { KiltAttestationProofV1Purpose } from '../purposes/KiltAttestationProofV1Purpose.js'
import {
  JsonLdObj,
  combineDocumentLoaders,
  kiltContextsLoader,
  kiltDidLoader,
} from '../documentLoader.js'
import {
  KILT_CREDENTIAL_CONTEXT_URL,
  W3C_CREDENTIAL_CONTEXT_URL,
} from '../../constants.js'
import { Sr25519Signature2020 } from './Sr25519Signature2020.js'
import {
  CredentialStub,
  KiltAttestationV1Suite,
} from './KiltAttestationProofV1.js'
import ingosCredential from '../examples/ICredentialExample.json'
import {
  makeAttestationCreatedEvents,
  mockedApi,
} from '../../exportToVerifiableCredential.spec.js'
import type {
  KiltAttestationProofV1,
  Proof,
  KiltCredentialV1,
} from '../../types.js'
import { makeFakeDid } from './Sr25519Signature2020.spec'

jest.mock('@kiltprotocol/did', () => ({
  ...jest.requireActual('@kiltprotocol/did'),
  resolveCompliant: jest.fn(),
  authorizeTx: jest.fn(),
}))

// is not needed and imports a dependency that does not work in node 18
jest.mock('@digitalbazaar/http-client', () => ({}))

const attester = '4pnfkRn5UurBJTW92d9TaVLR2CqJdY4z5HPjrEbpGyBykare'
const timestamp = 1_649_670_060_000
const blockHash = hexToU8a(
  '0x93c4a399abff5a68812479445d121995fde278b7a29d5863259cf7b6b6f1dc7e'
)
const { genesisHash } = mockedApi

const attestedVc = exportICredentialToVc(ingosCredential as ICredential, {
  issuer: `did:kilt:${attester}`,
  chainGenesisHash: genesisHash,
  blockHash,
  timestamp,
})

const notAttestedVc = exportICredentialToVc(
  Credential.fromClaim(ingosCredential.claim as IClaim),
  {
    issuer: `did:kilt:${attester}`,
    chainGenesisHash: genesisHash,
    blockHash,
    timestamp,
  }
)
const revokedCredential = Credential.fromClaim(ingosCredential.claim as IClaim)
const revokedVc = exportICredentialToVc(revokedCredential, {
  issuer: `did:kilt:${attester}`,
  chainGenesisHash: genesisHash,
  blockHash,
  timestamp,
})

jest.mocked(mockedApi.query.attestation.attestations).mockImplementation(
  // @ts-expect-error
  async (claimHash) => {
    if (u8aEq(claimHash, ingosCredential.rootHash)) {
      return mockedApi.createType(
        'Option<AttestationAttestationsAttestationDetails>',
        {
          ctypeHash: ingosCredential.claim.cTypeHash,
          attester,
          revoked: false,
        }
      )
    }
    if (u8aEq(claimHash, revokedCredential.rootHash)) {
      return mockedApi.createType(
        'Option<AttestationAttestationsAttestationDetails>',
        {
          ctypeHash: revokedCredential.claim.cTypeHash,
          attester,
          revoked: true,
        }
      )
    }
    return mockedApi.createType(
      'Option<AttestationAttestationsAttestationDetails>'
    )
  }
)
jest.mocked(mockedApi.query.system.events).mockResolvedValue(
  makeAttestationCreatedEvents([
    [attester, ingosCredential.rootHash, ingosCredential.claim.cTypeHash, null],
    [
      attester,
      revokedCredential.rootHash,
      revokedCredential.claim.cTypeHash,
      null,
    ],
  ]) as any
)
jest
  .mocked(mockedApi.query.timestamp.now)
  .mockResolvedValue(mockedApi.createType('u64', timestamp) as any)

const documentLoader = combineDocumentLoaders([
  kiltDidLoader,
  kiltContextsLoader,
  vcjs.defaultDocumentLoader,
])

let suite: KiltAttestationV1Suite
let purpose: KiltAttestationProofV1Purpose
let proof: KiltAttestationProofV1
let keypair: KiltKeyringPair
let didDocument: ConformingDidDocument

beforeAll(async () => {
  suite = new KiltAttestationV1Suite()
  purpose = new KiltAttestationProofV1Purpose()
  proof = attestedVc.proof as KiltAttestationProofV1
  ;({ keypair, didDocument } = await makeFakeDid())
})

beforeEach(() => {
  ConfigService.set({ api: mockedApi })
})

describe('jsigs', () => {
  describe('proof matching', () => {
    it('purpose matches compacted proof', async () => {
      const compactedProof = (await jsonld.compact(
        { ...proof, '@context': attestedVc['@context'] },
        attestedVc['@context'],
        { documentLoader, compactToRelative: false }
      )) as Proof
      expect(await purpose.match(compactedProof, {})).toBe(true)
      expect(
        await purpose.match(compactedProof, {
          document: attestedVc,
          documentLoader,
        })
      ).toBe(true)
    })

    it('suite matches proof', async () => {
      const proofWithContext = {
        ...proof,
        '@context': attestedVc['@context'],
      }
      expect(await suite.matchProof({ proof: proofWithContext })).toBe(true)
      expect(
        await suite.matchProof({
          proof: proofWithContext,
          document: attestedVc as unknown as JsonLdObj,
          purpose,
          documentLoader,
        })
      ).toBe(true)
    })
  })

  describe('attested', () => {
    it('verifies Kilt Attestation Proof', async () => {
      const result = await jsigs.verify(attestedVc, {
        suite,
        purpose,
        documentLoader,
      })
      expect(result).toHaveProperty('verified', true)
      expect(result).not.toHaveProperty('error')
    })
  })

  it('verifies proof with props removed', async () => {
    const derived = applySelectiveDisclosure(attestedVc, proof, [])
    expect(derived.credential.credentialSubject).not.toHaveProperty('Email')
    expect(
      await jsigs.verify(
        { ...derived.credential, proof: derived.proof },
        { suite, purpose, documentLoader }
      )
    ).toMatchObject({ verified: true })
  })

  describe('revoked', () => {
    it('still verifies Kilt Attestation Proof', async () => {
      expect(
        await jsigs.verify(revokedVc, {
          suite,
          purpose,
          documentLoader,
        })
      ).toMatchObject({ verified: true })
    })
  })

  describe('not attested', () => {
    it('fails to verify Kilt Attestation Proof', async () => {
      expect(
        await jsigs.verify(notAttestedVc, {
          suite,
          purpose,
          documentLoader,
        })
      ).toMatchObject({ verified: false })
    })
  })

  it('detects tampering on claims', async () => {
    // make a copy
    const tamperCred: KiltCredentialV1 = JSON.parse(JSON.stringify(attestedVc))
    tamperCred.credentialSubject.Email = 'macgyver@google.com'
    expect(
      await jsigs.verify(tamperCred, { suite, purpose, documentLoader })
    ).toMatchObject({ verified: false })
  })

  it('detects tampering on credential', async () => {
    const tamperCred: KiltCredentialV1 = JSON.parse(JSON.stringify(attestedVc))
    tamperCred.id = tamperCred.id.replace('1', '2') as any
    expect(
      await jsigs.verify(tamperCred, { suite, purpose, documentLoader })
    ).toMatchObject({ verified: false })
  })

  it('detects signer mismatch', async () => {
    const tamperCred: KiltCredentialV1 = JSON.parse(JSON.stringify(attestedVc))
    tamperCred.issuer =
      'did:kilt:4oFNEgM6ibgEW1seCGXk3yCM6o7QTnDGrqGtgSRSspVMDg4c'
    expect(
      await jsigs.verify(tamperCred, { suite, purpose, documentLoader })
    ).toMatchObject({ verified: false })
  })

  it('detects proof mismatch', async () => {
    const tamperCred: KiltCredentialV1 = JSON.parse(JSON.stringify(attestedVc))
    tamperCred.proof!.type = 'Sr25519Signature2020' as any
    expect(
      await jsigs.verify(tamperCred, { suite, purpose, documentLoader })
    ).toMatchObject({ verified: false })
  })
})
describe('vc-js', () => {
  describe('attested', () => {
    it('verifies Kilt Attestation Proof', async () => {
      const result = await vcjs.verifyCredential({
        credential: attestedVc,
        suite,
        purpose,
        documentLoader,
        checkStatus: suite.checkStatus,
      })
      expect(result).toHaveProperty('verified', true)
      expect(result).not.toHaveProperty('error')
    })

    it('creates and verifies a signed presentation (sr25519)', async () => {
      const signer = {
        sign: async ({ data }: { data: Uint8Array }) => keypair.sign(data),
        id: didDocument.authentication[0],
      }
      const signingSuite = new Sr25519Signature2020({ signer })

      const verifiableCredential = { ...attestedVc }
      let presentation = vcjs.createPresentation({
        verifiableCredential,
        holder: didDocument.id,
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
        purpose: new KiltAttestationProofV1Purpose(),
        challenge: '0x1234',
        documentLoader,
        checkStatus: suite.checkStatus,
      })

      expect(result.presentationResult).not.toHaveProperty(
        'error',
        expect.any(Array)
      )
      expect(result).toMatchObject({
        verified: true,
        presentationResult: { verified: true },
        credentialResults: [{ verified: true }],
      })
    })

    it('creates and verifies a signed presentation (ed25519)', async () => {
      const edKeypair = Crypto.makeKeypairFromUri('//Ingo', 'ed25519')
      const lightDid = Did.createLightDidDocument({
        authentication: [edKeypair],
      })
      const edSigner = {
        sign: async ({ data }: { data: Uint8Array }) => edKeypair.sign(data),
        id: lightDid.uri + lightDid.authentication[0].id,
      }
      const signingSuite = new Ed25519Signature2020({ signer: edSigner })

      const extendedDocLoader = combineDocumentLoaders([
        documentLoader,
        Ed25519Signature2020Context.documentLoader,
      ])

      let presentation = vcjs.createPresentation({
        verifiableCredential: attestedVc,
        holder: lightDid.uri,
      })

      presentation = await vcjs.signPresentation({
        presentation,
        suite: signingSuite,
        challenge: '0x1234',
        documentLoader: extendedDocLoader,
      })

      const result = await vcjs.verify({
        presentation,
        suite: [suite, new Ed25519Signature2020()],
        challenge: '0x1234',
        documentLoader: extendedDocLoader,
        checkStatus: suite.checkStatus,
        purpose: new KiltAttestationProofV1Purpose(),
      })

      expect(result.presentationResult).not.toHaveProperty(
        'error',
        expect.any(Array)
      )
      expect(result).toMatchObject({
        verified: true,
        presentationResult: { verified: true },
        credentialResults: [{ verified: true }],
      })
    })
  })

  describe('revoked', () => {
    it('fails to verify credential', async () => {
      ConfigService.set({
        api: {
          genesisHash,
          query: {
            attestation: {
              attestations: async () =>
                mockedApi.createType(
                  'Option<AttestationAttestationsAttestationDetails>'
                ),
            },
          },
        } as any,
      })
      expect(
        await vcjs.verifyCredential({
          credential: revokedVc,
          suite,
          purpose,
          documentLoader,
          checkStatus: suite.checkStatus,
        })
      ).toMatchObject({ verified: false })
    })
  })

  describe('not attested', () => {
    it('fails to verify Kilt Attestation Proof', async () => {
      expect(
        await vcjs.verifyCredential({
          credential: notAttestedVc,
          suite,
          purpose,
          documentLoader,
          checkStatus: suite.checkStatus,
        })
      ).toMatchObject({ verified: false })
    })
  })
})

describe('issuance', () => {
  let txArgs: any
  let issuanceSuite: KiltAttestationV1Suite
  let toBeSigned: CredentialStub
  beforeEach(() => {
    toBeSigned = {
      credentialSubject: attestedVc.credentialSubject,
      credentialSchema: attestedVc.credentialSchema,
    }
    issuanceSuite = new KiltAttestationV1Suite({
      didSigner: {
        did: attestedVc.issuer,
        signer: async () => ({
          signature: new Uint8Array(32),
          keyType: 'sr25519',
        }),
      },
      transactionHandler: {
        account: attester,
        signAndSubmit: async () => {
          return {
            blockHash,
            timestamp,
          }
        },
      },
    })
    jest
      .mocked(Did.authorizeTx)
      .mockImplementation(async (...[, extrinsic]) => {
        txArgs = extrinsic.args
        return extrinsic as SubmittableExtrinsic
      })
  })

  it('issues a credential via vc-js', async () => {
    let newCred: Partial<KiltCredentialV1> =
      await issuanceSuite.anchorCredential({ ...toBeSigned })
    newCred = await vcjs.issue({
      credential: newCred,
      suite: issuanceSuite,
      documentLoader,
      purpose,
    })
    expect(newCred.proof).toMatchObject({
      type: 'KiltAttestationProofV1',
      commitments: expect.any(Array),
      salt: expect.any(Array),
    })
    expect(newCred).toMatchObject(toBeSigned)

    expect(newCred.issuanceDate).toStrictEqual(attestedVc.issuanceDate)
    expect(newCred.proof?.block).toStrictEqual(attestedVc.proof.block)
    expect(newCred.credentialStatus).toMatchObject({
      id: expect.any(String),
      type: 'KiltRevocationStatusV1',
    })
    expect(newCred.credentialStatus?.id).not.toMatch(
      attestedVc.credentialStatus.id
    )
    expect(newCred.id).not.toMatch(attestedVc.id)

    jest
      .mocked(mockedApi.query.system.events)
      .mockResolvedValueOnce(
        makeAttestationCreatedEvents([[attester, ...txArgs]]) as any
      )
    jest.mocked(mockedApi.query.attestation.attestations).mockResolvedValueOnce(
      mockedApi.createType(
        'Option<AttestationAttestationsAttestationDetails>',
        {
          ctypeHash: txArgs[1],
          attester,
          revoked: false,
        }
      ) as any
    )

    const result = await vcjs.verifyCredential({
      credential: newCred,
      suite,
      documentLoader,
      purpose,
      checkStatus: suite.checkStatus,
    })
    expect(result).toMatchObject({ verified: true })
  })

  it('adds context if not present', async () => {
    let newCred = await issuanceSuite.anchorCredential({
      ...toBeSigned,
    })
    newCred = (await vcjs.issue({
      credential: {
        ...newCred,
        '@context': [W3C_CREDENTIAL_CONTEXT_URL],
      },
      suite: issuanceSuite,
      documentLoader,
      purpose,
    })) as KiltCredentialV1
    expect(newCred['@context']).toContain(KILT_CREDENTIAL_CONTEXT_URL)

    await expect(
      jsigs.sign(
        {
          ...newCred,
          '@context': [W3C_CREDENTIAL_CONTEXT_URL],
        },
        {
          suite: issuanceSuite,
          documentLoader,
          purpose,
          addSuiteContext: false,
        }
      )
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"The document to be signed must contain this suite's @context, \\"https://www.kilt.io/contexts/credentials\\"."`
    )
  })

  it('complains if transaction handler not given', async () => {
    await expect(
      suite.anchorCredential({
        ...toBeSigned,
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"suite must be configured with a transactionHandler & didSigner for proof generation"`
    )
  })

  it('fails proof creation if credential is unknown', async () => {
    await expect(
      vcjs.issue({
        credential: attestedVc,
        suite,
        documentLoader,
        purpose,
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"No attestation information available for the credential kilt:credential:6N736gaJzLkwZXAgg51eZFjocLHGp2RH3YPpYnvqDHzw. Make sure you have called anchorCredential on the same instance of this class."`
    )
  })
})
