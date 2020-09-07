import * as gabi from '@kiltprotocol/portablegabi'
import { hexToU8a } from '@polkadot/util'
import Identity from '.'
import { Attester, Claimer } from '../actor'
import CType from '../ctype/CType'
import { ERROR_PE_MISSING } from '../errorhandling/SDKErrors'
import Message, { IRequestingAttestationForClaim } from '../messaging/Message'
import constants from '../test/constants'
import { IRevocationHandle } from '../types/Attestation'
import IClaim from '../types/Claim'
import ICType from '../types/CType'
import IRequestForAttestation from '../types/RequestForAttestation'
import AttesterIdentity from './AttesterIdentity'

jest.mock('../blockchainApiConnection/BlockchainApiConnection')

describe('AttesterIdentity', () => {
  const blockchainApi = require('../blockchainApiConnection/BlockchainApiConnection')
    .__mocked_api

  const mnemonic =
    'receive clutch item involve chaos clutch furnace arrest claw isolate okay together'
  const seedString =
    '0xcdfd6024d2b0eba27d54cc92a44cd9a627c69b2dbda15ed7e58085425119ae03'
  let attester: AttesterIdentity
  let accumulator: gabi.Accumulator
  let claimer: Identity
  let rawCType: ICType['schema']
  let cType: CType
  let revocationHandle: IRevocationHandle
  let attesterSession: gabi.AttesterAttestationSession
  let req4Att: IRequestForAttestation

  beforeAll(async () => {
    rawCType = {
      $id: 'http://example.com/ctype-1',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
      properties: {
        name: { type: 'string' },
      },
      type: 'object',
      title: 'title',
    }
    claimer = await Identity.buildFromURI('//Bob', { peEnabled: true })
    cType = CType.fromSchema(rawCType, claimer.address)
    attester = await AttesterIdentity.buildFromMnemonic(mnemonic, {
      key: {
        publicKey: constants.PUBLIC_KEY.toString(),
        privateKey: constants.PRIVATE_KEY.toString(),
      },
    })
    accumulator = attester.getAccumulator()
    let initAttestation: Message
    ;({
      message: initAttestation,
      session: attesterSession,
    } = await Attester.initiateAttestation(
      attester,
      claimer.getPublicIdentity()
    ))

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
    if (Array.isArray(requestAttestation.body.content)) {
      return
    }
    const { requestForAttestation } = requestAttestation.body
      .content as IRequestingAttestationForClaim
    req4Att = requestForAttestation
    ;({ revocationHandle } = await Attester.issueAttestation(
      attester,
      requestAttestation,
      claimer.getPublicIdentity(),
      attesterSession,
      true
    ))

    // we should be able to get the different keys
    expect(attester.getPrivateGabiKey()).toBeDefined()
    expect(attester.getPublicGabiKey()).toBeDefined()
    expect(attester.getBoxPublicKey()).toBeDefined()
    expect(attester.address).toBeDefined()
    expect(accumulator).toBeDefined()
  })

  it('should build with accumulator', async () => {
    const newAttester = await AttesterIdentity.buildFromMnemonic(mnemonic, {
      key: {
        publicKey: constants.PUBLIC_KEY.toString(),
        privateKey: constants.PRIVATE_KEY.toString(),
      },
      accumulator,
    })
    expect(newAttester.getPrivateGabiKey()).toEqual(
      attester.getPrivateGabiKey()
    )
    expect(newAttester.getPublicGabiKey()).toEqual(attester.getPublicGabiKey())
    expect(newAttester.getAccumulator()).toEqual(attester.getAccumulator())
    expect(newAttester.getBoxPublicKey()).toEqual(attester.getBoxPublicKey())
    expect(newAttester.address).toEqual(attester.address)
  })

  it('should build the same from plain identity', async () => {
    const plainId = await Identity.buildFromMnemonic(mnemonic, {
      peEnabled: true,
    })
    const newAttester = await AttesterIdentity.buildFromIdentity(plainId, {
      key: {
        publicKey: constants.PUBLIC_KEY.toString(),
        privateKey: constants.PRIVATE_KEY.toString(),
      },
    })

    expect(newAttester.getPrivateGabiKey()).toEqual(
      attester.getPrivateGabiKey()
    )
    expect(newAttester.getPublicGabiKey()).toEqual(attester.getPublicGabiKey())
    expect(newAttester.getBoxPublicKey()).toEqual(attester.getBoxPublicKey())
    expect(newAttester.address).toEqual(attester.address)
    expect(plainId.getBoxPublicKey()).toEqual(attester.getBoxPublicKey())
  })

  it('should build the same from seed string', async () => {
    const newAttester = await AttesterIdentity.buildFromSeedString(seedString, {
      key: {
        publicKey: constants.PUBLIC_KEY.toString(),
        privateKey: constants.PRIVATE_KEY.toString(),
      },
    })

    expect(newAttester.getPrivateGabiKey()).toEqual(
      attester.getPrivateGabiKey()
    )
    expect(newAttester.getPublicGabiKey()).toEqual(attester.getPublicGabiKey())
    expect(newAttester.getBoxPublicKey()).toEqual(attester.getBoxPublicKey())
    expect(newAttester.address).toEqual(attester.address)
  })

  it('should build the same from seed', async () => {
    const asU8a = hexToU8a(seedString)
    const newAttester = await AttesterIdentity.buildFromSeed(asU8a, {
      key: {
        publicKey: constants.PUBLIC_KEY.toString(),
        privateKey: constants.PRIVATE_KEY.toString(),
      },
    })

    expect(newAttester.getPrivateGabiKey()).toEqual(
      attester.getPrivateGabiKey()
    )
    expect(newAttester.getPublicGabiKey()).toEqual(attester.getPublicGabiKey())
    expect(newAttester.getBoxPublicKey()).toEqual(attester.getBoxPublicKey())
    expect(newAttester.address).toEqual(attester.address)
  })

  it('should build the same from uri', async () => {
    const newAttester = await AttesterIdentity.buildFromURI(seedString, {
      key: {
        publicKey: constants.PUBLIC_KEY.toString(),
        privateKey: constants.PRIVATE_KEY.toString(),
      },
    })

    expect(newAttester.getPrivateGabiKey()).toEqual(
      attester.getPrivateGabiKey()
    )
    expect(newAttester.getPublicGabiKey()).toEqual(attester.getPublicGabiKey())
    expect(newAttester.getBoxPublicKey()).toEqual(attester.getBoxPublicKey())
  })

  it('should throw if privacy enhancement is missing', async () => {
    await expect(
      attester.issuePrivacyEnhancedAttestation(
        {} as gabi.AttesterAttestationSession,
        {} as IRequestForAttestation
      )
    ).rejects.toEqual(ERROR_PE_MISSING())
  })

  it('should issue privacy enhanced Attestation', async () => {
    await expect(
      attester.issuePrivacyEnhancedAttestation(attesterSession, req4Att)
    ).resolves.toBeDefined()
  })

  it('should revoke public only attestation', async () => {
    blockchainApi.tx.attestation.revoke.mockClear()
    const testRevHandle = { ...revocationHandle, witness: null }
    expect(testRevHandle.witness).toBeNull()
    await expect(
      attester.revokeAttestation(testRevHandle)
    ).resolves.toBeUndefined()
    expect(blockchainApi.tx.attestation.revoke.mock.calls.length).toBe(1)
  })

  it('should revoke privacy attestation', async () => {
    blockchainApi.tx.attestation.revoke.mockClear()
    const testRevHandle = { ...revocationHandle }
    expect(testRevHandle.witness).not.toBeNull()
    await expect(
      attester.revokeAttestation(testRevHandle)
    ).resolves.toBeUndefined()
    expect(blockchainApi.tx.attestation.revoke.mock.calls.length).toBe(1)
  })

  it('should build accumulator', async () => {
    expect(attester.buildAccumulator()).resolves.toBeDefined()
  })

  it('should calculate new keys with accumulator', async () => {
    const mock = jest.spyOn(gabi.Attester, 'create')
    mock.mockReturnValue(
      Promise.resolve(
        new gabi.Attester(constants.PUBLIC_KEY, constants.PRIVATE_KEY)
      )
    )
    const newAttester = await AttesterIdentity.buildFromMnemonic(mnemonic, {
      accumulator: attester.getAccumulator(),
    })
    expect(newAttester.getPrivateGabiKey()).toEqual(
      attester.getPrivateGabiKey()
    )
    expect(newAttester.getPublicGabiKey()).toEqual(attester.getPublicGabiKey())
    expect(newAttester.getBoxPublicKey()).toEqual(attester.getBoxPublicKey())
    expect(newAttester.address).toEqual(attester.address)
    expect(newAttester.getAccumulator()).toStrictEqual(
      attester.getAccumulator()
    )

    expect(mock).toHaveBeenCalled()
    mock.mockRestore()
  })

  it('should calculate new keys without accumulator', async () => {
    const mock = jest.spyOn(gabi.Attester, 'create')
    mock.mockReturnValue(
      Promise.resolve(
        new gabi.Attester(constants.PUBLIC_KEY, constants.PRIVATE_KEY)
      )
    )

    const newAttester = await AttesterIdentity.buildFromMnemonic(mnemonic)
    expect(newAttester.getPrivateGabiKey()).toEqual(
      attester.getPrivateGabiKey()
    )
    expect(newAttester.getPublicGabiKey()).toEqual(attester.getPublicGabiKey())
    expect(newAttester.getBoxPublicKey()).toEqual(attester.getBoxPublicKey())
    expect(newAttester.address).toEqual(attester.address)

    expect(mock).toHaveBeenCalled()
    mock.mockRestore()
  })
})
