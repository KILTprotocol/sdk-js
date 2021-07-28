/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group integration/delegation
 */

import type { ICType } from '@kiltprotocol/types'
import { Permission } from '@kiltprotocol/types'
import { UUID } from '@kiltprotocol/utils'
import { BlockchainUtils } from '@kiltprotocol/chain-helpers'
import { AttestedClaim, Identity } from '..'
import Attestation from '../attestation/Attestation'
import { config, disconnect } from '../kilt'
import Claim from '../claim/Claim'
import {
  fetchChildren,
  getAttestationHashes,
  getChildIds,
} from '../delegation/Delegation.chain'
import { decodeDelegationNode } from '../delegation/DelegationDecoder'
import DelegationNode from '../delegation/DelegationNode'
import DelegationRootNode from '../delegation/DelegationRootNode'
import RequestForAttestation from '../requestforattestation/RequestForAttestation'
import {
  CtypeOnChain,
  DriversLicense,
  wannabeAlice,
  wannabeBob,
  wannabeFaucet,
  WS_ADDRESS,
} from './utils'

async function writeRoot(
  delegator: Identity,
  ctypeHash: ICType['hash']
): Promise<DelegationRootNode> {
  const root = new DelegationRootNode({
    id: UUID.generate(),
    cTypeHash: ctypeHash,
    account: delegator.address,
    revoked: false,
  })

  await root.store().then((tx) =>
    BlockchainUtils.signAndSubmitTx(tx, delegator, {
      resolveOn: BlockchainUtils.IS_IN_BLOCK,
      reSign: true,
    })
  )
  return root
}
async function addDelegation(
  parentNode: DelegationRootNode | DelegationNode,
  delegator: Identity,
  delegee: Identity,
  permissions: Permission[] = [Permission.ATTEST, Permission.DELEGATE]
): Promise<DelegationNode> {
  const rootId =
    parentNode instanceof DelegationRootNode ? parentNode.id : parentNode.hierarchyId
  const delegation = new DelegationNode({
    id: UUID.generate(),
    hierarchyId: rootId,
    account: delegee.address,
    permissions,
    parentId: parentNode.id,
    revoked: false,
  })
  await delegation
    .store(delegee.signStr(delegation.generateHash()))
    .then((tx) =>
      BlockchainUtils.signAndSubmitTx(tx, delegator, {
        resolveOn: BlockchainUtils.IS_IN_BLOCK,
        reSign: true,
      })
    )
  return delegation
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
  const rootNode = await writeRoot(root, DriversLicense.hash)
  const delegatedNode = await addDelegation(rootNode, root, attester)
  await Promise.all([
    expect(rootNode.verify()).resolves.toBeTruthy(),
    expect(delegatedNode.verify()).resolves.toBeTruthy(),
  ])
}, 60_000)

describe('and attestation rights have been delegated', () => {
  let rootNode: DelegationRootNode
  let delegatedNode: DelegationNode

  beforeAll(async () => {
    rootNode = await writeRoot(root, DriversLicense.hash)
    delegatedNode = await addDelegation(rootNode, root, attester)

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
    const delegationRoot = await writeRoot(delegator, DriversLicense.hash)
    const delegationA = await addDelegation(
      delegationRoot,
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
    const delegationRoot = await writeRoot(delegator, DriversLicense.hash)
    const delegationA = await addDelegation(
      delegationRoot,
      delegator,
      firstDelegee
    )
    await expect(
      delegationRoot.revoke().then((tx) =>
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
    const delegationRoot = await writeRoot(delegator, DriversLicense.hash)
    const delegationA = await addDelegation(
      delegationRoot,
      delegator,
      firstDelegee
    )
    const delegationB = await addDelegation(
      delegationA,
      firstDelegee,
      secondDelegee
    )
    await expect(
      delegationRoot.revoke().then((tx) =>
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
  disconnect()
})
