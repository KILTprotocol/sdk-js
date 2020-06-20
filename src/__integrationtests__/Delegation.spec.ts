/**
 * @group integration/delegation
 * @ignore
 * @packageDocumentation
 */

import { cryptoWaitReady } from '@polkadot/util-crypto'
import { Identity } from '..'
import Attestation from '../attestation/Attestation'
import { IBlockchainApi } from '../blockchain/Blockchain'
import getCached, { DEFAULT_WS_ADDRESS } from '../blockchainApiConnection'
import Claim from '../claim/Claim'
import Credential from '../credential/Credential'
import {
  fetchChildren,
  getAttestationHashes,
  getChildIds,
} from '../delegation/Delegation.chain'
import { decodeDelegationNode } from '../delegation/DelegationDecoder'
import DelegationNode from '../delegation/DelegationNode'
import DelegationRootNode from '../delegation/DelegationRootNode'
import RequestForAttestation from '../requestforattestation/RequestForAttestation'
import { Permission } from '../types/Delegation'
import UUID from '../util/UUID'
import {
  CtypeOnChain,
  DriversLicense,
  wannabeAlice,
  wannabeBob,
  wannabeFaucet,
} from './utils'

let blockchain: IBlockchainApi
beforeAll(async () => {
  blockchain = await getCached(DEFAULT_WS_ADDRESS)
})

describe('when there is an account hierarchy', () => {
  let uncleSam: Identity
  let claimer: Identity
  let attester: Identity

  beforeAll(async () => {
    await cryptoWaitReady()
    uncleSam = await wannabeFaucet
    claimer = await wannabeBob
    attester = await wannabeAlice

    if (!(await CtypeOnChain(DriversLicense))) {
      await DriversLicense.store(attester)
    }
  }, 30_000)

  it('should be possible to delegate attestation rights', async () => {
    const rootNode = new DelegationRootNode(
      UUID.generate(),
      DriversLicense.hash,
      uncleSam.getAddress()
    )
    await rootNode.store(uncleSam)
    const delegatedNode = new DelegationNode(
      UUID.generate(),
      rootNode.id,
      attester.getAddress(),
      [Permission.ATTEST],
      rootNode.id
    )
    const HashSignedByDelegate = attester.signStr(delegatedNode.generateHash())
    await delegatedNode.store(uncleSam, HashSignedByDelegate)
    await Promise.all([
      expect(rootNode.verify()).resolves.toBeTruthy(),
      expect(delegatedNode.verify()).resolves.toBeTruthy(),
    ])
  }, 50_000)

  describe('and attestation rights have been delegated', () => {
    let rootNode: DelegationRootNode
    let delegatedNode: DelegationNode
    let HashSignedByDelegate: string

    beforeAll(async () => {
      rootNode = new DelegationRootNode(
        UUID.generate(),
        DriversLicense.hash,
        uncleSam.getAddress()
      )
      delegatedNode = new DelegationNode(
        UUID.generate(),
        rootNode.id,
        attester.getAddress(),
        [Permission.ATTEST],
        rootNode.id
      )
      HashSignedByDelegate = attester.signStr(delegatedNode.generateHash())
      await rootNode.store(uncleSam)
      await delegatedNode.store(uncleSam, HashSignedByDelegate)
      await Promise.all([
        expect(rootNode.verify()).resolves.toBeTruthy(),
        expect(delegatedNode.verify()).resolves.toBeTruthy(),
      ])
    }, 40_000)

    it("should be possible to attest a claim in the root's name and revoke it by the root", async () => {
      const content = {
        name: 'Ralph',
        age: 12,
      }
      const claim = Claim.fromCTypeAndClaimContents(
        DriversLicense,
        content,
        claimer.getAddress()
      )
      const request = (await RequestForAttestation.fromClaimAndIdentity(
        claim,
        claimer,
        {
          delegationId: delegatedNode.id,
        }
      )).message
      expect(request.verifyData()).toBeTruthy()
      expect(request.verifySignature()).toBeTruthy()

      const attestation = Attestation.fromRequestAndPublicIdentity(
        request,
        attester.getPublicIdentity()
      )
      const result1 = await attestation.store(attester)
      expect(result1.status.type).toBe('Finalized')

      const attClaim = await Credential.fromRequestAndAttestation(
        claimer,
        request,
        attestation
      ).then(c => c.createPresentation([]))
      expect(attClaim.verifyData()).toBeTruthy()
      await expect(attClaim.verify()).resolves.toBeTruthy()

      // revoke attestation through root
      // FIXME: Why is ErrorCode.ERROR_DELEGATION_NOT_FOUND thrown?
      const result2 = await attClaim.attestation.revoke(uncleSam)
      expect(result2.status.type).toBe('Finalized')
    }, 30_000)
  })
})

describe('handling queries to data not on chain', () => {
  it('getChildIds on empty', async () => {
    return expect(getChildIds('0x012012012')).resolves.toEqual([])
  })

  it('DelegationNode query on empty', async () => {
    return expect(DelegationNode.query('0x012012012')).resolves.toBeNull()
  })

  it('DelegationRootNode.query on empty', async () => {
    return expect(DelegationRootNode.query('0x012012012')).resolves.toBeNull()
  })

  it('getAttestationHashes on empty', async () => {
    return expect(getAttestationHashes('0x012012012')).resolves.toEqual([])
  })

  it('fetchChildren on empty', async () => {
    return expect(
      fetchChildren(['0x012012012']).then(res =>
        res.map(el => {
          return { id: el.id, codec: decodeDelegationNode(el.codec) }
        })
      )
    ).resolves.toEqual([{ id: '0x012012012', codec: null }])
  })
})

afterAll(() => {
  blockchain.api.disconnect()
})
