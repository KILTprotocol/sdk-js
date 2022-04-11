/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group unit/vc-js
 */

import jsigs, { DocumentLoader, purposes } from 'jsonld-signatures'
import vcjs from 'vc-js'
import jsonld from 'jsonld'

import { base58Encode, randomAsHex } from '@polkadot/util-crypto'

import {
  DidDocumentPublicKeyType,
  DidPublicKey,
  DidUri,
} from '@kiltprotocol/types'
import { Utils as DidUtils } from '@kiltprotocol/did'
import { Crypto } from '@kiltprotocol/utils'

import { KiltSignatureSuite as Suite } from './KiltSignatureSuite'
import credential from '../examples/example-vc.json'
import { documentLoader as kiltDocumentLoader } from '../documentLoader'
import type {
  VerifiableCredential,
  SelfSignedProof,
  IPublicKeyRecord,
} from '../../types'
import { KILT_SELF_SIGNED_PROOF_TYPE } from '../../constants'

let suite: Suite
let purpose: purposes.ProofPurpose
let proof: SelfSignedProof
let documentLoader: DocumentLoader

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
  documentLoader = async (uri) => {
    if (uri.startsWith('did:kilt:')) {
      const { identifier, fragment, did } = DidUtils.parseDidUri(uri as DidUri)
      const key: IPublicKeyRecord = {
        uri: uri as DidPublicKey['uri'],
        publicKeyBase58: base58Encode(Crypto.decodeAddress(identifier)),
        controller: did,
        type: DidDocumentPublicKeyType.Ed25519VerificationKey,
      }
      if (fragment) {
        return { documentUrl: uri, document: key }
      }
      return {
        documentUrl: uri,
        document: {
          id: did,
          verificationMethod: [key],
        },
      }
    }
    return kiltDocumentLoader(uri)
  }
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
        publicKeyHex: randomAsHex(32),
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
        publicKeyHex: randomAsHex(32),
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
