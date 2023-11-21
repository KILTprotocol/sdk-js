/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { u8aEq } from '@polkadot/util'
import { base58Decode } from '@polkadot/util-crypto'
import {
  Ed25519Signature2020,
  suiteContext as Ed25519Signature2020Context,
  // @ts-expect-error not a typescript module
} from '@digitalbazaar/ed25519-signature-2020'
// @ts-expect-error not a typescript module
import * as vcjs from '@digitalbazaar/vc'
// @ts-expect-error not a typescript module
import jsigs from 'jsonld-signatures' // cjs module
// @ts-expect-error not a typescript module
import jsonld from 'jsonld' // cjs module

import { ConfigService } from '@kiltprotocol/config'
import * as Did from '@kiltprotocol/did'
import type {
  DidDocument,
  DidUrl,
  HexString,
  ICType,
  KiltAddress,
  KiltKeyringPair,
  SignerInterface,
  SubmittableExtrinsic,
} from '@kiltprotocol/types'
import { Crypto } from '@kiltprotocol/utils'
import {
  KiltAttestationProofV1,
  KiltCredentialV1,
  Types,
  W3C_CREDENTIAL_CONTEXT_URL,
} from '@kiltprotocol/core'

import {
  cType,
  makeAttestationCreatedEvents,
  mockedApi,
} from '../../../../tests/testUtils/testData.js'
import {
  JsonLdObj,
  combineDocumentLoaders,
  kiltContextsLoader,
  kiltDidLoader,
} from '../documentLoader.js'
import ingosCredential from '../examples/KiltCredentialV1.json'
import { KiltAttestationProofV1Purpose } from '../purposes/KiltAttestationProofV1Purpose.js'
import {
  CredentialStub,
  KiltAttestationV1Suite,
} from './KiltAttestationProofV1.js'
import { Sr25519Signature2020 } from './Sr25519Signature2020.js'
import { makeFakeDid } from './Sr25519Signature2020.spec'

jest.mock('@kiltprotocol/did', () => ({
  ...jest.requireActual('@kiltprotocol/did'),
  resolve: jest.fn(),
  authorizeTx: jest.fn(),
}))

// is not needed and imports a dependency that does not work in node 18
jest.mock('@digitalbazaar/http-client', () => ({}))

const attester = ingosCredential.issuer.split(':')[2] as KiltAddress
const timestamp = new Date(ingosCredential.issuanceDate)
const blockHash = base58Decode(ingosCredential.proof.block)
const { genesisHash } = mockedApi
const ctypeHash = ingosCredential.type[2].split(':')[2] as HexString

const attestedVc = KiltAttestationProofV1.finalizeProof(
  { ...ingosCredential } as unknown as Types.KiltCredentialV1,
  ingosCredential.proof as Types.KiltAttestationProofV1,
  { blockHash, timestamp, genesisHash }
)

const notAttestedVc = KiltAttestationProofV1.finalizeProof(
  attestedVc,
  KiltAttestationProofV1.initializeProof(attestedVc)[0],
  { blockHash, timestamp, genesisHash }
)

const revokedVc = KiltAttestationProofV1.finalizeProof(
  attestedVc,
  KiltAttestationProofV1.initializeProof(attestedVc)[0],
  {
    blockHash,
    timestamp,
    genesisHash,
  }
)

jest.mocked(mockedApi.query.attestation.attestations).mockImplementation(
  // @ts-expect-error
  async (claimHash) => {
    if (u8aEq(claimHash, KiltCredentialV1.idToRootHash(attestedVc.id))) {
      return mockedApi.createType(
        'Option<AttestationAttestationsAttestationDetails>',
        {
          ctypeHash,
          attester,
          revoked: false,
        }
      )
    }
    if (u8aEq(claimHash, KiltCredentialV1.idToRootHash(revokedVc.id))) {
      return mockedApi.createType(
        'Option<AttestationAttestationsAttestationDetails>',
        {
          ctypeHash,
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
    [attester, KiltCredentialV1.idToRootHash(attestedVc.id), ctypeHash, null],
    [attester, KiltCredentialV1.idToRootHash(revokedVc.id), ctypeHash, null],
  ]) as any
)
jest
  .mocked(mockedApi.query.timestamp.now)
  .mockResolvedValue(mockedApi.createType('u64', timestamp) as any)

const emailCType: ICType = {
  $schema: 'http://kilt-protocol.org/draft-01/ctype#',
  properties: {
    Email: {
      type: 'string',
    },
  },
  title: 'Email',
  type: 'object',
  $id: 'kilt:ctype:0x3291bb126e33b4862d421bfaa1d2f272e6cdfc4f96658988fbcffea8914bd9ac',
}

const documentLoader = combineDocumentLoaders([
  kiltDidLoader,
  kiltContextsLoader,
  vcjs.defaultDocumentLoader,
])

let suite: KiltAttestationV1Suite
let purpose: KiltAttestationProofV1Purpose
let proof: Types.KiltAttestationProofV1
let keypair: KiltKeyringPair
let didDocument: DidDocument

beforeAll(async () => {
  suite = new KiltAttestationV1Suite({
    ctypes: [cType, emailCType],
  })
  purpose = new KiltAttestationProofV1Purpose()
  proof = attestedVc.proof as Types.KiltAttestationProofV1
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
      )) as Types.Proof
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
    const derived = KiltAttestationProofV1.applySelectiveDisclosure(
      attestedVc,
      proof,
      []
    )
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
    const tamperCred: Types.KiltCredentialV1 = JSON.parse(
      JSON.stringify(attestedVc)
    )
    tamperCred.credentialSubject.Email = 'macgyver@google.com'
    expect(
      await jsigs.verify(tamperCred, { suite, purpose, documentLoader })
    ).toMatchObject({ verified: false })
  })

  it('detects tampering on credential', async () => {
    const tamperCred: Types.KiltCredentialV1 = JSON.parse(
      JSON.stringify(attestedVc)
    )
    tamperCred.id = tamperCred.id.replace('1', '2') as any
    expect(
      await jsigs.verify(tamperCred, { suite, purpose, documentLoader })
    ).toMatchObject({ verified: false })
  })

  it('detects signer mismatch', async () => {
    const tamperCred: Types.KiltCredentialV1 = JSON.parse(
      JSON.stringify(attestedVc)
    )
    tamperCred.issuer =
      'did:kilt:4oFNEgM6ibgEW1seCGXk3yCM6o7QTnDGrqGtgSRSspVMDg4c'
    expect(
      await jsigs.verify(tamperCred, { suite, purpose, documentLoader })
    ).toMatchObject({ verified: false })
  })

  it('detects proof mismatch', async () => {
    const tamperCred: Types.KiltCredentialV1 = JSON.parse(
      JSON.stringify(attestedVc)
    )
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
        id: didDocument.id + didDocument.authentication![0],
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
        id: lightDid.id + lightDid.authentication?.[0],
      }
      const signingSuite = new Ed25519Signature2020({ signer: edSigner })

      const extendedDocLoader = combineDocumentLoaders([
        documentLoader,
        Ed25519Signature2020Context.documentLoader,
      ])

      let presentation = vcjs.createPresentation({
        verifiableCredential: attestedVc,
        holder: lightDid.id,
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

  const { issuer } = attestedVc
  const signer: SignerInterface<'Sr25519', DidUrl> = {
    sign: async () => new Uint8Array(32),
    algorithm: 'Sr25519',
    id: `${issuer}#1`,
  }
  const transactionHandler: KiltAttestationProofV1.IssueOpts = {
    signers: [signer],
    submitterAccount: attester,
    submitTx: async () => {
      return {
        status: 'finalized',
        includedAt: {
          blockHash,
          blockTime: timestamp,
        },
      }
    },
    authorizeTx: async (tx) => tx,
  }
  beforeEach(() => {
    toBeSigned = {
      credentialSubject: attestedVc.credentialSubject,
    }
    issuanceSuite = new KiltAttestationV1Suite()
    jest
      .mocked(Did.authorizeTx)
      .mockImplementation(async (...[, extrinsic]) => {
        txArgs = extrinsic.args
        return extrinsic as SubmittableExtrinsic
      })
  })

  it('issues a credential via vc-js', async () => {
    let newCred: Partial<Types.KiltCredentialV1> =
      await issuanceSuite.anchorCredential(
        { ...toBeSigned },
        issuer,
        transactionHandler
      )
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
    let newCred = await issuanceSuite.anchorCredential(
      {
        ...toBeSigned,
      },
      issuer,
      transactionHandler
    )
    newCred = (await vcjs.issue({
      credential: {
        ...newCred,
        '@context': [W3C_CREDENTIAL_CONTEXT_URL],
      },
      suite: issuanceSuite,
      documentLoader,
      purpose,
    })) as Types.KiltCredentialV1
    expect(newCred['@context']).toContain(KiltCredentialV1.CONTEXT_URL)

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
      `"The document to be signed must contain this suite's @context, "https://www.kilt.io/contexts/credentials"."`
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
