/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group unit/actor
 */

import { CType, Identity, SDKErrors } from '@kiltprotocol/core'
import type { ICType, IClaim, IMessage } from '@kiltprotocol/types'
import { mockChainQueryReturn } from '@kiltprotocol/chain-helpers/src/blockchainApiConnection/__mocks__/BlockchainQuery'
import Message from '@kiltprotocol/messaging'
import { Crypto } from '@kiltprotocol/utils'
import { Attester, Claimer } from '..'
import { issueAttestation } from './Attester'

jest.mock(
  '@kiltprotocol/chain-helpers/src/blockchainApiConnection/BlockchainApiConnection'
)

describe('Attester', () => {
  const blockchainApi = require('@kiltprotocol/chain-helpers/src/blockchainApiConnection/BlockchainApiConnection')
    .__mocked_api
  let attester: Identity
  let claimer: Identity
  let rawCType: ICType['schema']
  let cType: CType
  beforeAll(async () => {
    attester = Identity.buildFromURI('//Alice')

    claimer = Identity.buildFromURI('//Bob')

    rawCType = {
      $id: 'kilt:ctype:0x1',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
      title: 'Attester',
      properties: {
        name: { type: 'string' },
      },
      type: 'object',
    }

    cType = CType.fromSchema(rawCType, claimer.address)
  })

  it('Issue privacy enhanced attestation', async () => {
    blockchainApi.query.attestation.attestations.mockReturnValue(
      mockChainQueryReturn('attestation', 'attestations', [
        cType.hash,
        attester.address,
        undefined,
        0,
      ])
    )

    // const {
    //   message: initAttestation,
    //   session: attersterSession,
    // } = await Attester.initiateAttestation(
    //   attester,
    //   claimer.getPublicIdentity()
    // )
    // expect(initAttestation.body.type).toEqual(
    //   Message.BodyType.INITIATE_ATTESTATION
    // )
    // expect(initAttestation.body.content).toBeDefined()

    const claim: IClaim = {
      cTypeHash: cType.hash,
      contents: {
        name: 'bob',
        and: 1,
        other: Crypto.hashStr('0xbeef'),
        attributes: true,
      },
      owner: claimer.address,
    }
    const { message: requestAttestation } = Claimer.requestAttestation(
      claim,
      claimer,
      attester.getPublicIdentity()
    )

    const { message } = await Attester.issueAttestation(
      attester,
      requestAttestation,
      claimer.getPublicIdentity()
    )
    expect(message.body.type).toEqual(
      Message.BodyType.SUBMIT_ATTESTATION_FOR_CLAIM
    )
    if (message.body.type === Message.BodyType.SUBMIT_ATTESTATION_FOR_CLAIM) {
      expect(message.body.content.attestation).toBeDefined()
    }
  })

  it('Issue only public attestation', async () => {
    blockchainApi.query.attestation.attestations.mockReturnValue(
      mockChainQueryReturn<'attestation'>('attestation', 'attestations', [
        cType.hash,
        attester.address,
        undefined,
        0,
      ])
    )

    const claim: IClaim = {
      cTypeHash: cType.hash,
      contents: {
        name: 'bob',
        and: 1,
        other: '0xbeef',
        attributes: true,
      },
      owner: claimer.getPublicIdentity().address,
    }
    const { message: requestAttestation } = Claimer.requestAttestation(
      claim,
      claimer,
      attester.getPublicIdentity()
    )

    const { message } = await Attester.issueAttestation(
      attester,
      requestAttestation,
      claimer.getPublicIdentity()
    )
    expect(message.body.type).toEqual(
      Message.BodyType.SUBMIT_ATTESTATION_FOR_CLAIM
    )
    if (message.body.type === Message.BodyType.SUBMIT_ATTESTATION_FOR_CLAIM) {
      expect(message.body.content.attestation).toBeDefined()
    }
  })

  it('Revoke public only attestation', async () => {
    // const { message: initAttestation } = await Attester.initiateAttestation(
    //   attester,
    //   claimer.getPublicIdentity()
    // )

    const claim: IClaim = {
      cTypeHash: cType.hash,
      contents: {
        name: 'bob',
        and: 1,
        other: '0xbeef',
        attributes: true,
      },
      owner: claimer.getPublicIdentity().address,
    }
    const { message: requestAttestation } = Claimer.requestAttestation(
      claim,
      claimer,
      attester.getPublicIdentity()
    )

    const { revocationHandle } = await Attester.issueAttestation(
      attester,
      requestAttestation,
      claimer.getPublicIdentity()
    )
    await Attester.revokeAttestation(attester, revocationHandle)
  })

  describe('Negative tests', () => {
    it('Should throw when message body type does not match', async () => {
      // const { messageBody } = await attester.initiateAttestation()
      const messageBody: IMessage['body'] = {
        type: Message.BodyType.REQUEST_TERMS,
        content: { cTypeHash: `kilt:ctype:${Crypto.hashStr('0xabc')}` },
      }
      await expect(
        issueAttestation(
          attester,
          new Message(
            messageBody,
            attester.getPublicIdentity(),
            claimer.getPublicIdentity()
          ),
          claimer.getPublicIdentity()
        )
      ).rejects.toThrowError(
        SDKErrors.ERROR_MESSAGE_TYPE(
          messageBody.type,
          Message.BodyType.REQUEST_ATTESTATION_FOR_CLAIM
        )
      )
    })
  })
})
