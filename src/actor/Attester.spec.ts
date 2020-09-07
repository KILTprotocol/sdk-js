import * as gabi from '@kiltprotocol/portablegabi'
import { stringToHex } from '@polkadot/util'
import {
  Attester,
  AttesterIdentity,
  Claimer,
  CType,
  IClaim,
  ICType,
  Identity,
  Message,
  MessageBodyType,
} from '..'
import { mockChainQueryReturn } from '../blockchainApiConnection/__mocks__/BlockchainQuery'
import {
  ERROR_ATTESTATION_SESSION_MISSING,
  ERROR_MESSAGE_TYPE,
} from '../errorhandling/SDKErrors'
import constants from '../test/constants'
import { issueAttestation } from './Attester'

jest.mock('../blockchainApiConnection/BlockchainApiConnection')

describe('Attester', () => {
  const blockchainApi = require('../blockchainApiConnection/BlockchainApiConnection')
    .__mocked_api
  let attester: AttesterIdentity
  let claimer: Identity
  let acc: gabi.Accumulator
  let rawCType: ICType['schema']
  let cType: CType
  beforeAll(async () => {
    attester = await AttesterIdentity.buildFromURI('//Alice', {
      key: {
        publicKey: constants.PUBLIC_KEY.toString(),
        privateKey: constants.PRIVATE_KEY.toString(),
      },
    })

    claimer = await Identity.buildFromURI('//Bob', { peEnabled: true })

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
    acc = await Attester.buildAccumulator(attester)
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

    const {
      message: initAttestation,
      session: attersterSession,
    } = await Attester.initiateAttestation(
      attester,
      claimer.getPublicIdentity()
    )
    expect(initAttestation.body.type).toEqual(
      MessageBodyType.INITIATE_ATTESTATION
    )
    expect(initAttestation.body.content).toBeDefined()

    const claim: IClaim = {
      cTypeHash: cType.hash,
      contents: {
        name: 'bob',
        and: 1,
        other: '0xbeef',
        attributes: true,
      },
      owner: claimer.address,
    }
    const { message: requestAttestation } = await Claimer.requestAttestation(
      claim,
      claimer,
      attester.getPublicIdentity(),
      {
        initiateAttestationMsg: initAttestation,
      }
    )

    const { message, revocationHandle } = await Attester.issueAttestation(
      attester,
      requestAttestation,
      claimer.getPublicIdentity(),
      attersterSession,
      true
    )
    expect(revocationHandle.witness).not.toBeNull()
    expect(message.body.type).toEqual(
      MessageBodyType.SUBMIT_ATTESTATION_FOR_CLAIM
    )
    if (
      message.body.type === MessageBodyType.SUBMIT_ATTESTATION_FOR_CLAIM &&
      !Array.isArray(message.body.content)
    ) {
      expect(message.body.content.attestationPE).toBeDefined()
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
    const { message: requestAttestation } = await Claimer.requestAttestation(
      claim,
      claimer,
      attester.getPublicIdentity()
    )

    const { message, revocationHandle } = await Attester.issueAttestation(
      attester,
      requestAttestation,
      claimer.getPublicIdentity()
    )
    expect(revocationHandle.witness).toBeNull()
    expect(message.body.type).toEqual(
      MessageBodyType.SUBMIT_ATTESTATION_FOR_CLAIM
    )
    if (
      message.body.type === MessageBodyType.SUBMIT_ATTESTATION_FOR_CLAIM &&
      !Array.isArray(message.body.content)
    ) {
      expect(message.body.content.attestationPE).toBeUndefined()
      expect(message.body.content.attestation).toBeDefined()
    }
  })

  it('Revoke privacy enhanced attestation', async () => {
    const {
      message: initAttestation,
      session: attersterSession,
    } = await Attester.initiateAttestation(
      attester,
      claimer.getPublicIdentity()
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
    const { message: requestAttestation } = await Claimer.requestAttestation(
      claim,
      claimer,
      attester.getPublicIdentity(),
      {
        initiateAttestationMsg: initAttestation,
      }
    )

    const { revocationHandle } = await Attester.issueAttestation(
      attester,
      requestAttestation,
      claimer.getPublicIdentity(),
      attersterSession,
      true
    )
    const oldAcc = await Attester.getLatestAccumulator(
      attester.getPublicIdentity()
    )
    await Attester.revokeAttestation(attester, revocationHandle)
    await expect(
      Attester.getLatestAccumulator(attester.getPublicIdentity())
    ).resolves.not.toEqual(oldAcc)
  })

  it('Revoke public only attestation', async () => {
    const { message: initAttestation } = await Attester.initiateAttestation(
      attester,
      claimer.getPublicIdentity()
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
    const { message: requestAttestation } = await Claimer.requestAttestation(
      claim,
      claimer,
      attester.getPublicIdentity(),
      {
        initiateAttestationMsg: initAttestation,
      }
    )

    const { revocationHandle } = await Attester.issueAttestation(
      attester,
      requestAttestation,
      claimer.getPublicIdentity()
    )
    const oldAcc = attester.getAccumulator()
    await Attester.revokeAttestation(attester, revocationHandle)
    // accumulator should not change!
    expect(attester.getAccumulator().toString()).toEqual(oldAcc.toString())
  })

  it('Should build accumulator', async () => {
    const tAcc = await Attester.buildAccumulator(attester)
    expect(tAcc).toBeDefined()
  })
  it('Should get accumulator', async () => {
    expect(attester.getAccumulator()).toBeDefined()
    expect(attester.getAccumulator()).toBeInstanceOf(gabi.Accumulator)
    // Attester static
    await expect(
      Attester.getAccumulator(attester.getPublicIdentity(), 0)
    ).resolves.toBeInstanceOf(gabi.Accumulator)
  })
  it('Should get accumulator array', async () => {
    blockchainApi.query.portablegabi.accumulatorList.mockReturnValue(
      mockChainQueryReturn('portablegabi', 'accumulatorList', [[0], [1]])
    )
    blockchainApi.query.portablegabi.accumulatorList.multi = jest.fn(async () =>
      ['a', 'b'].map((x) => stringToHex(x.toString()))
    )
    const accumulator = await Attester.getAccumulatorArray(
      attester.getPublicIdentity(),
      0,
      1
    )
    expect(accumulator).toStrictEqual([
      new gabi.Accumulator('a'),
      new gabi.Accumulator('b'),
    ])
    expect(
      blockchainApi.query.portablegabi.accumulatorList.multi
    ).toHaveBeenCalled()
  })
  it('Should update accumulator', async () => {
    const beforeUpdate = attester.getAccumulator()
    await attester.updateAccumulator(acc)
    expect(
      blockchainApi.tx.portablegabi.updateAccumulator.mock.calls.length
    ).toEqual(1)
    expect(attester.getAccumulator()).toBeDefined()
    expect(attester.getAccumulator()).toBeInstanceOf(gabi.Accumulator)
    expect(attester.getAccumulator()).not.toStrictEqual(beforeUpdate)
    // Attester static
    const spy = jest.spyOn(attester, 'updateAccumulator')
    await Attester.updateAccumulator(attester, attester.getAccumulator())
    expect(spy).toHaveBeenCalledWith(attester.getAccumulator())
  })
  describe('Negative tests', () => {
    it('Should throw when message body type does not match', async () => {
      const { messageBody } = await attester.initiateAttestation()
      await expect(
        issueAttestation(
          attester,
          new Message(messageBody, attester, claimer.getPublicIdentity()),
          claimer.getPublicIdentity()
        )
      ).rejects.toThrowError(
        ERROR_MESSAGE_TYPE(
          messageBody.type,
          MessageBodyType.REQUEST_ATTESTATION_FOR_CLAIM
        )
      )
    })
    it('Should throw when PE is required but session missing', async () => {
      await expect(
        issueAttestation(
          attester,
          {
            body: {
              type: MessageBodyType.REQUEST_ATTESTATION_FOR_CLAIM,
            },
          } as Message,
          claimer.getPublicIdentity(),
          null,
          true
        )
      ).rejects.toThrowError(ERROR_ATTESTATION_SESSION_MISSING())
    })
  })
})
