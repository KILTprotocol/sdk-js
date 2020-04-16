/**
 * @group integration/delegation
 */

import DelegationRootNode from '../delegation/DelegationRootNode'
import UUID from '../util/UUID'
import DelegationNode from '../delegation/DelegationNode'
import { Permission } from '../types/Delegation'
import Claim from '../claim/Claim'
import RequestForAttestation from '../requestforattestation/RequestForAttestation'
import Attestation from '../attestation/Attestation'
import AttestedClaim from '../attestedclaim/AttestedClaim'
import { faucet, alice, bob, DriversLicense, CtypeOnChain } from './utils'
import {
  getChildIds,
  getAttestationHashes,
  fetchChildren,
} from '../delegation/Delegation.chain'
import { decodeDelegationNode } from '../delegation/DelegationDecoder'
import getCached from '../blockchainApiConnection'

const UncleSam = faucet
const attester = alice
const claimer = bob

describe('when there is an account hierarchy', () => {
  beforeAll(async () => {
    if (!(await CtypeOnChain(DriversLicense))) {
      await DriversLicense.store(attester)
    }
  }, 30_000)

  it('should be possible to delegate attestation rights', async () => {
    const rootNode = new DelegationRootNode(
      UUID.generate(),
      DriversLicense.hash,
      UncleSam.address
    )
    await rootNode.store(UncleSam)
    const delegatedNode = new DelegationNode(
      UUID.generate(),
      rootNode.id,
      attester.address,
      [Permission.ATTEST],
      rootNode.id
    )
    const HashSignedByDelegate = attester.signStr(delegatedNode.generateHash())
    await delegatedNode.store(UncleSam, HashSignedByDelegate)
    await Promise.all([
      expect(rootNode.verify()).resolves.toBeTruthy(),
      expect(delegatedNode.verify()).resolves.toBeTruthy(),
    ])
  }, 40_000)

  describe('and attestation rights have been delegated', () => {
    const rootNode: DelegationRootNode = new DelegationRootNode(
      UUID.generate(),
      DriversLicense.hash,
      UncleSam.address
    )
    const delegatedNode: DelegationNode = new DelegationNode(
      UUID.generate(),
      rootNode.id,
      attester.address,
      [Permission.ATTEST],
      rootNode.id
    )
    const content = { name: 'Ralfi', age: 12 }
    const claim = Claim.fromCTypeAndClaimContents(
      DriversLicense,
      content,
      claimer.address
    )
    const request = RequestForAttestation.fromClaimAndIdentity(
      claim,
      claimer,
      [],
      delegatedNode.id
    )
    const attestation = Attestation.fromRequestAndPublicIdentity(
      request,
      attester.getPublicIdentity()
    )

    beforeAll(async () => {
      await rootNode.store(UncleSam)
      const HashSignedByDelegate = attester.signStr(
        delegatedNode.generateHash()
      )
      await delegatedNode.store(UncleSam, HashSignedByDelegate)
      await Promise.all([
        expect(rootNode.verify()).resolves.toBeTruthy(),
        expect(delegatedNode.verify()).resolves.toBeTruthy(),
      ])
    }, 40_000)
    it('should be possible to store an attestation on the chain', async () => {
      const status = await attestation.store(attester)
      expect(request.verifyData()).toBeTruthy()
      expect(request.verifySignature()).toBeTruthy()
      expect(status.isFinalized).toBeTruthy()
    }, 30_000)
    it('should be possible to revoke it by the root', async () => {
      const attClaim = AttestedClaim.fromRequestAndAttestation(
        request,
        attestation
      )
      expect(attClaim.verifyData()).toBeTruthy()
      await expect(attClaim.verify()).resolves.toBeTruthy()

      // revoke attestation through root
      const result = await attClaim.attestation.revoke(UncleSam)
      expect(result.isFinalized).toBeTruthy()
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
      fetchChildren(['0x012012012']).then((res) =>
        res.map((el) => {
          return { id: el.id, codec: decodeDelegationNode(el.codec) }
        })
      )
    ).resolves.toEqual([{ id: '0x012012012', codec: null }])
  })
})

afterAll(() => {
  return getCached().then((bc) => bc.api.disconnect())
})
