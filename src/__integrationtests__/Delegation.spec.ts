/**
 * @group integration/delegation
 */

import DelegationRootNode from '../delegation/DelegationRootNode'
import UUID from '../util/UUID'
import DelegationNode from '../delegation/DelegationNode'
import { Permission } from '../types/Delegation'
import getCached from '../blockchainApiConnection'
import Claim from '../claim/Claim'
import RequestForAttestation from '../requestforattestation/RequestForAttestation'
import Attestation from '../attestation/Attestation'
import Credential from '../credential/Credential'
import {
  wannabeFaucet,
  wannabeAlice,
  wannabeBob,
  DriversLicense,
  CtypeOnChain,
} from './utils'
import {
  getChildIds,
  getAttestationHashes,
  fetchChildren,
} from '../delegation/Delegation.chain'
import { decodeDelegationNode } from '../delegation/DelegationDecoder'
import { Identity } from '..'

describe('when there is an account hierarchy', () => {
  let UncleSam: Identity
  let claimer: Identity
  let attester: Identity

  beforeAll(async () => {
    UncleSam = await wannabeFaucet
    claimer = await wannabeBob
    attester = await wannabeAlice

    if (!(await CtypeOnChain(DriversLicense))) {
      await DriversLicense.store(attester)
    }
  }, 30000)

  it('should be possible to delegate attestation rights', async () => {
    const rootNode = new DelegationRootNode(
      UUID.generate(),
      DriversLicense.hash,
      UncleSam.getAddress()
    )
    await rootNode.store(UncleSam)
    const delegatedNode = new DelegationNode(
      UUID.generate(),
      rootNode.id,
      attester.getAddress(),
      [Permission.ATTEST],
      rootNode.id
    )
    const HashSignedByDelegate = attester.signStr(delegatedNode.generateHash())
    await delegatedNode.store(UncleSam, HashSignedByDelegate)
    await Promise.all([
      expect(rootNode.verify()).resolves.toBeTruthy(),
      expect(delegatedNode.verify()).resolves.toBeTruthy(),
    ])
  }, 30000)

  describe('and attestation rights have been delegated', () => {
    let rootNode: DelegationRootNode
    let delegatedNode: DelegationNode

    beforeAll(async () => {
      rootNode = new DelegationRootNode(
        UUID.generate(),
        DriversLicense.hash,
        UncleSam.getAddress()
      )
      await rootNode.store(UncleSam)

      delegatedNode = new DelegationNode(
        UUID.generate(),
        rootNode.id,
        attester.getAddress(),
        [Permission.ATTEST],
        rootNode.id
      )
      const HashSignedByDelegate = attester.signStr(
        delegatedNode.generateHash()
      )
      await delegatedNode.store(UncleSam, HashSignedByDelegate)
      await Promise.all([
        expect(rootNode.verify()).resolves.toBeTruthy(),
        expect(delegatedNode.verify()).resolves.toBeTruthy(),
      ])
    }, 30000)

    it("should be possible to attest a claim in the root's name and revoke it by the root", async () => {
      const content = { name: 'Ralfi', age: 12 }
      const claim = Claim.fromCTypeAndClaimContents(
        DriversLicense,
        content,
        claimer.getAddress()
      )
      const request = (await RequestForAttestation.fromClaimAndIdentity({
        claim,
        identity: claimer,
        delegationId: delegatedNode.id,
      })).message
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
      const result2 = await attClaim.attestation.revoke(UncleSam)
      expect(result2.status.type).toBe('Finalized')
    }, 30000)
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

afterAll(async () => {
  await getCached().then(bc => bc.api.disconnect())
})
