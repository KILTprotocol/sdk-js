import DelegationRootNode from '../delegation/DelegationRootNode'
import UUID from '../util/UUID'
import DelegationNode from '../delegation/DelegationNode'
import { Permission } from '../types/Delegation'
import getCached from '../blockchainApiConnection'
import { IBlockchainApi } from '../blockchain/Blockchain'
import Claim from '../claim/Claim'
import RequestForAttestation from '../requestforattestation/RequestForAttestation'
import Attestation from '../attestation/Attestation'
import AttestedClaim from '../attestedclaim/AttestedClaim'
import {
  assureBalance,
  claimer,
  attester,
  UncleSam,
  DriversLicense,
  CtypeOnChain,
} from './utils'

import BN = require('bn.js')

describe('when there is an account hierarchy', async () => {
  beforeAll(async () => {
    await assureBalance(UncleSam, new BN(30_000_000))
    await assureBalance(attester, new BN(30_000_000))
    await assureBalance(claimer, new BN(30_000_000))
    if (!(await CtypeOnChain(DriversLicense))) {
      DriversLicense.store(UncleSam)
    }
  }, 30000)

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
  }, 30000)

  describe('and attestation rights have been delegated', async () => {
    let rootNode: DelegationRootNode
    let delegatedNode: DelegationNode

    beforeAll(async () => {
      rootNode = new DelegationRootNode(
        UUID.generate(),
        DriversLicense.hash,
        UncleSam.address
      )
      await rootNode.store(UncleSam)

      delegatedNode = new DelegationNode(
        UUID.generate(),
        rootNode.id,
        attester.address,
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
        claimer.address
      )
      const request = RequestForAttestation.fromClaimAndIdentity(
        claim,
        claimer,
        [],
        delegatedNode.id
      )
      expect(request.verifyData()).toBeTruthy()
      expect(request.verifySignature()).toBeTruthy()

      const attestation = Attestation.fromRequestAndPublicIdentity(
        request,
        attester.getPublicIdentity(),
        delegatedNode.id
      )
      const status = await attestation.store(attester)
      expect(status.type).toBe('Finalized')

      const attClaim = AttestedClaim.fromRequestAndAttestation(
        request,
        attestation
      )
      expect(attClaim.verifyData()).toBeTruthy()
      await expect(attClaim.verify()).resolves.toBeTruthy()

      // revoke attestation through root
      const result = await attClaim.attestation.revoke(UncleSam)
      expect(result.type).toBe('Finalized')
    }, 30000)
  })
})

afterAll(async () => {
  await getCached().then(
    (BC: IBlockchainApi) => {
      BC.api.disconnect()
    },
    err => {
      console.log('not connected to chain')
      console.log(err)
    }
  )
})
