/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group unit/actor
 */

import { AttestedClaim, CType, Identity } from '@kiltprotocol/core'
import type { IClaim, ICType } from '@kiltprotocol/types'
import { mockChainQueryReturn } from '@kiltprotocol/chain-helpers/src/blockchainApiConnection/__mocks__/BlockchainQuery'
import Message from '@kiltprotocol/messaging'
import { Crypto } from '@kiltprotocol/utils'
import { Attester, Claimer, Verifier } from '..'

jest.mock(
  '@kiltprotocol/chain-helpers/lib/blockchainApiConnection/BlockchainApiConnection'
)

describe('Verifier', () => {
  let attester: Identity
  let claimer: Identity
  let verifier: Identity
  let cType: CType
  let claim: IClaim
  let credential: AttestedClaim
  const blockchainApi = require('@kiltprotocol/chain-helpers/lib/blockchainApiConnection/BlockchainApiConnection')
    .__mocked_api

  beforeAll(async () => {
    attester = Identity.buildFromURI('//Alice')

    claimer = Identity.buildFromURI('//bob')
    verifier = Identity.buildFromMnemonic(Identity.generateMnemonic())

    const rawCType: ICType['schema'] = {
      $id: 'kilt:ctype:0x1',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
      title: 'Verifier',
      properties: {
        name: { type: 'string' },
      },
      type: 'object',
    }

    cType = CType.fromSchema(rawCType, claimer.address)

    claim = {
      cTypeHash: cType.hash,
      contents: {
        name: 'bob',
        and: 1,
        other: '0xbeef',
        attributes: true,
      },
      owner: claimer.getPublicIdentity().address,
    }

    blockchainApi.query.attestation.attestations.mockReturnValue(
      mockChainQueryReturn('attestation', 'attestations', [
        '"0xde9f624875aa620d06434603787a40c8cd02cc25c7b775cf50de8a3a96bbeafa"', // ctype hash
        attester.address, // Account
        undefined, // delegation-id?
        false, // revoked flag
      ])
    )

    // const {
    //   message: initAttestation,
    //   session: attersterSession,
    // } = await Attester.initiateAttestation(
    //   attester,
    //   claimer.getPublicIdentity()
    // )

    const {
      message: requestAttestation,
      session: claimerSession,
    } = Claimer.requestAttestation(claim, claimer, attester.getPublicIdentity())
    expect(requestAttestation.body.type).toEqual(
      Message.BodyType.REQUEST_ATTESTATION_FOR_CLAIM
    )
    if (
      requestAttestation.body.type ===
      Message.BodyType.REQUEST_ATTESTATION_FOR_CLAIM
    ) {
      const { message: attestationMessage } = await Attester.issueAttestation(
        attester,
        requestAttestation,
        claimer.getPublicIdentity()
      )

      credential = Claimer.buildCredential(attestationMessage, claimerSession)
    }
  })

  it('request public presentation', async () => {
    const { session, message: request } = Verifier.newRequestBuilder()
      .requestPresentationForCtype({
        ctypeHash: `kilt:ctype:${Crypto.hashStr('this is a ctype hash')}`,
        properties: ['name', 'and', 'other', 'attributes'],
      })
      .finalize(verifier, claimer.getPublicIdentity())
    expect(session).toBeDefined()
    expect(request.body.type).toEqual(
      Message.BodyType.REQUEST_CLAIMS_FOR_CTYPES
    )
    if (request.body.type === Message.BodyType.REQUEST_CLAIMS_FOR_CTYPES) {
      expect(request.body.content[0].cTypeHash).toEqual(
        `kilt:ctype:${Crypto.hashStr('this is a ctype hash')}`
      )
    }
  })

  it('verify public-only presentation all good', async () => {
    const { session, message: request } = Verifier.newRequestBuilder()
      .requestPresentationForCtype({
        ctypeHash: `kilt:ctype:${Crypto.hashStr('this is a ctype hash')}`,
        properties: ['name', 'and', 'other', 'attributes'],
      })
      .finalize(verifier, claimer.getPublicIdentity())

    const presentation = Claimer.createPresentation(
      claimer,
      request,
      verifier.getPublicIdentity(),
      [credential]
    )
    expect(presentation.body.type).toEqual(
      Message.BodyType.SUBMIT_CLAIMS_FOR_CTYPES
    )
    expect(Array.isArray(presentation.body.content)).toBeTruthy()

    const { verified: ok, claims } = await Verifier.verifyPresentation(
      presentation,
      session
    )
    expect(ok).toBeTruthy()
    expect(Array.isArray(claims)).toBeTruthy()
    expect(claims.length).toEqual(1)
  })

  it('verify public-only presentation missing property', async () => {
    const { session, message: request } = Verifier.newRequestBuilder()
      .requestPresentationForCtype({
        ctypeHash: `kilt:ctype:${Crypto.hashStr('this is a ctype hash')}`,
        properties: ['name', 'and', 'other', 'attributes'],
      })
      .finalize(verifier, claimer.getPublicIdentity())

    const presentation = Claimer.createPresentation(
      claimer,
      request,
      verifier.getPublicIdentity(),
      [credential]
    )
    expect(presentation.body.type).toEqual(
      Message.BodyType.SUBMIT_CLAIMS_FOR_CTYPES
    )
    expect(Array.isArray(presentation.body.content)).toBeTruthy()
    if (presentation.body.type === Message.BodyType.SUBMIT_CLAIMS_FOR_CTYPES) {
      delete presentation.body.content[0].request.claim.contents.name
      const { verified: ok, claims } = await Verifier.verifyPresentation(
        presentation,
        session
      )
      expect(ok).toBeFalsy()
      expect(Array.isArray(claims)).toBeTruthy()
      expect(claims.length).toEqual(0)
    }
  })
})
