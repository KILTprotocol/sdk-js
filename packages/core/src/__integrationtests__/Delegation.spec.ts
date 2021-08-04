/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group integration/delegation
 */

import type { ICType, IDelegationNode } from '@kiltprotocol/types'
import { Permission } from '@kiltprotocol/types'
import { BlockchainUtils } from '@kiltprotocol/chain-helpers'
import Attestation from '../attestation/Attestation'
import Claim from '../claim/Claim'
import RequestForAttestation from '../requestforattestation/RequestForAttestation'
import { AttestedClaim, Identity } from '..'
import { config, disconnect } from '../kilt'
import DelegationNode from '../delegation/DelegationNode'
import {
  CtypeOnChain,
  DriversLicense,
  wannabeAlice,
  wannabeBob,
  wannabeFaucet,
  WS_ADDRESS,
} from './utils'
import { getAttestationHashes } from '../delegation/DelegationNode.chain'

async function writeHierarchy(
  delegator: Identity,
  ctypeHash: ICType['hash']
): Promise<DelegationNode> {
  const rootNode = DelegationNode.newRoot({
    account: delegator.address,
    permissions: [Permission.DELEGATE],
    cTypeHash: ctypeHash,
  })

  await rootNode.store().then((tx) =>
    BlockchainUtils.signAndSubmitTx(tx, delegator, {
      resolveOn: BlockchainUtils.IS_IN_BLOCK,
      reSign: true,
    })
  )

  return rootNode
}

async function addDelegation(
  hierarchyId: IDelegationNode['id'],
  parentId: DelegationNode['id'],
  delegator: Identity,
  delegee: Identity,
  permissions: Permission[] = [Permission.ATTEST, Permission.DELEGATE]
): Promise<DelegationNode> {
  const delegationNode = DelegationNode.newNode({
    hierarchyId,
    parentId,
    account: delegee.address,
    permissions,
  })

  await delegationNode
    .store(delegee.signStr(delegationNode.generateHash()))
    .then((tx) =>
      BlockchainUtils.signAndSubmitTx(tx, delegator, {
        resolveOn: BlockchainUtils.IS_IN_BLOCK,
        reSign: true,
      })
    )
  return delegationNode
}

let root: Identity
let claimer: Identity
let attester: Identity

beforeAll(async () => {
  config({ address: WS_ADDRESS })
  root = wannabeFaucet
  claimer = wannabeBob
  attester = wannabeAlice

  if (!(await CtypeOnChain(DriversLicense))) {
    await DriversLicense.store().then((tx) =>
      BlockchainUtils.signAndSubmitTx(tx, attester, {
        resolveOn: BlockchainUtils.IS_IN_BLOCK,
        reSign: true,
      })
    )
  }
}, 30_000)

it('should be possible to delegate attestation rights', async () => {
  const rootNode = await writeHierarchy(root, DriversLicense.hash)
  const delegatedNode = await addDelegation(
    rootNode.id,
    rootNode.id,
    root,
    attester
  )
  await Promise.all([
    expect(rootNode.verify()).resolves.toBeTruthy(),
    expect(delegatedNode.verify()).resolves.toBeTruthy(),
  ])
}, 60_000)

describe('and attestation rights have been delegated', () => {
  let rootNode: DelegationNode
  let delegatedNode: DelegationNode

  beforeAll(async () => {
    rootNode = await writeHierarchy(root, DriversLicense.hash)
    delegatedNode = await addDelegation(
      rootNode.id,
      rootNode.id,
      root,
      attester
    )

    await Promise.all([
      expect(rootNode.verify()).resolves.toBeTruthy(),
      expect(delegatedNode.verify()).resolves.toBeTruthy(),
    ])
  }, 75_000)

  it("should be possible to attest a claim in the root's name and revoke it by the root", async () => {
    const content = {
      name: 'Ralph',
      age: 12,
    }
    const claim = Claim.fromCTypeAndClaimContents(
      DriversLicense,
      content,
      claimer.address
    )
    const request = RequestForAttestation.fromClaimAndIdentity(claim, claimer, {
      delegationId: delegatedNode.id,
    })
    expect(request.verifyData()).toBeTruthy()
    expect(request.verifySignature()).toBeTruthy()

    const attestation = Attestation.fromRequestAndPublicIdentity(
      request,
      attester.getPublicIdentity()
    )
    await attestation.store().then((tx) =>
      BlockchainUtils.signAndSubmitTx(tx, attester, {
        resolveOn: BlockchainUtils.IS_IN_BLOCK,
        reSign: true,
      })
    )

    const attClaim = AttestedClaim.fromRequestAndAttestation(
      request,
      attestation
    )
    expect(attClaim.verifyData()).toBeTruthy()
    await expect(attClaim.verify()).resolves.toBeTruthy()

    // revoke attestation through root
    await attClaim.attestation.revoke(1).then((tx) =>
      BlockchainUtils.signAndSubmitTx(tx, root, {
        resolveOn: BlockchainUtils.IS_IN_BLOCK,
        reSign: true,
      })
    )
    await expect(attClaim.verify()).resolves.toBeFalsy()
  }, 75_000)
})

describe('revocation', () => {
  let delegator: Identity = root
  let firstDelegee: Identity = attester
  let secondDelegee: Identity = claimer

  beforeAll(() => {
    delegator = root
    firstDelegee = attester
    secondDelegee = claimer
  })

  it('delegator can revoke delegation', async () => {
    const rootNode = await writeHierarchy(delegator, DriversLicense.hash)
    const delegationA = await addDelegation(
      rootNode.id,
      rootNode.id,
      delegator,
      firstDelegee
    )
    await expect(
      delegationA.revoke(delegator.address).then((tx) =>
        BlockchainUtils.signAndSubmitTx(tx, delegator, {
          resolveOn: BlockchainUtils.IS_IN_BLOCK,
          reSign: true,
        })
      )
    ).resolves.not.toThrow()
    await expect(delegationA.verify()).resolves.toBe(false)
  }, 40_000)

  it('delegee cannot revoke root but can revoke own delegation', async () => {
    const delegationRoot = await writeHierarchy(delegator, DriversLicense.hash)
    const delegationA = await addDelegation(
      delegationRoot.id,
      delegationRoot.id,
      delegator,
      firstDelegee
    )
    await expect(
      delegationRoot.revoke(firstDelegee.address).then((tx) =>
        BlockchainUtils.signAndSubmitTx(tx, firstDelegee, {
          resolveOn: BlockchainUtils.IS_IN_BLOCK,
          reSign: true,
        })
      )
    ).rejects.toThrow()
    await expect(delegationRoot.verify()).resolves.toBe(true)

    await expect(
      delegationA.revoke(firstDelegee.address).then((tx) =>
        BlockchainUtils.signAndSubmitTx(tx, firstDelegee, {
          resolveOn: BlockchainUtils.IS_IN_BLOCK,
          reSign: true,
        })
      )
    ).resolves.not.toThrow()
    await expect(delegationA.verify()).resolves.toBe(false)
  }, 60_000)

  it('delegator can revoke root, revoking all delegations in tree', async () => {
    let delegationRoot = await writeHierarchy(delegator, DriversLicense.hash)
    const delegationA = await addDelegation(
      delegationRoot.id,
      delegationRoot.id,
      delegator,
      firstDelegee
    )
    const delegationB = await addDelegation(
      delegationRoot.id,
      delegationA.id,
      firstDelegee,
      secondDelegee
    )
    delegationRoot = await delegationRoot.getLatestState()
    await expect(
      delegationRoot.revoke(delegator.address).then((tx) =>
        BlockchainUtils.signAndSubmitTx(tx, delegator, {
          resolveOn: BlockchainUtils.IS_IN_BLOCK,
          reSign: true,
        })
      )
    ).resolves.not.toThrow()

    await Promise.all([
      expect(delegationRoot.verify()).resolves.toBe(false),
      expect(delegationA.verify()).resolves.toBe(false),
      expect(delegationB.verify()).resolves.toBe(false),
    ])
  }, 60_000)
})

describe('handling queries to data not on chain', () => {
  it('DelegationNode query on empty', async () => {
    return expect(DelegationNode.query('0x012012012')).resolves.toBeNull()
  })

  it('getAttestationHashes on empty', async () => {
    return expect(getAttestationHashes('0x012012012')).resolves.toEqual([])
  })
})

afterAll(() => {
  disconnect()
})
