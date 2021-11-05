/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group integration/delegation
 */

import type { ICType, IDelegationNode, KeyringPair } from '@kiltprotocol/types'
import { Permission } from '@kiltprotocol/types'
import { BlockchainUtils } from '@kiltprotocol/chain-helpers'
import {
  createOnChainDidFromSeed,
  DemoKeystore,
  FullDidDetails,
} from '@kiltprotocol/did'
import { randomAsHex } from '@polkadot/util-crypto'
import { BN } from '@polkadot/util'
import Attestation from '../attestation/Attestation'
import Claim from '../claim/Claim'
import RequestForAttestation from '../requestforattestation/RequestForAttestation'
import { AttestedClaim } from '..'
import { disconnect, init } from '../kilt'
import DelegationNode from '../delegation/DelegationNode'
import { CtypeOnChain, DriversLicense, devFaucet, WS_ADDRESS } from './utils'
import { getAttestationHashes } from '../delegation/DelegationNode.chain'

let paymentAccount: KeyringPair
let signer: DemoKeystore
let root: FullDidDetails
let claimer: FullDidDetails
let attester: FullDidDetails

async function writeHierarchy(
  delegator: FullDidDetails,
  ctypeHash: ICType['hash']
): Promise<DelegationNode> {
  const rootNode = DelegationNode.newRoot({
    account: delegator.did,
    permissions: [Permission.DELEGATE],
    cTypeHash: ctypeHash,
  })

  await rootNode
    .store()
    .then((tx) =>
      delegator.authorizeExtrinsic(tx, signer, paymentAccount.address)
    )
    .then((tx) =>
      BlockchainUtils.signAndSubmitTx(tx, paymentAccount, {
        resolveOn: BlockchainUtils.IS_IN_BLOCK,
        reSign: true,
      })
    )

  return rootNode
}

async function addDelegation(
  hierarchyId: IDelegationNode['id'],
  parentId: DelegationNode['id'],
  delegator: FullDidDetails,
  delegee: FullDidDetails,
  permissions: Permission[] = [Permission.ATTEST, Permission.DELEGATE]
): Promise<DelegationNode> {
  const delegationNode = DelegationNode.newNode({
    hierarchyId,
    parentId,
    account: delegee.did,
    permissions,
  })
  const signature = await delegationNode.delegeeSign(delegee, signer)
  await delegationNode
    .store(signature)
    .then((tx) =>
      delegator.authorizeExtrinsic(tx, signer, paymentAccount.address)
    )
    .then((tx) =>
      BlockchainUtils.signAndSubmitTx(tx, paymentAccount, {
        resolveOn: BlockchainUtils.IS_IN_BLOCK,
        reSign: true,
      })
    )
  return delegationNode
}

beforeAll(async () => {
  await init({ address: WS_ADDRESS })
  paymentAccount = devFaucet

  signer = new DemoKeystore()
  ;[attester, root, claimer] = await Promise.all([
    createOnChainDidFromSeed(paymentAccount, signer, randomAsHex()),
    createOnChainDidFromSeed(paymentAccount, signer, randomAsHex()),
    createOnChainDidFromSeed(paymentAccount, signer, randomAsHex()),
  ])

  if (!(await CtypeOnChain(DriversLicense))) {
    await DriversLicense.store()
      .then((tx) =>
        attester.authorizeExtrinsic(tx, signer, paymentAccount.address)
      )
      .then((tx) =>
        BlockchainUtils.signAndSubmitTx(tx, paymentAccount, {
          resolveOn: BlockchainUtils.IS_IN_BLOCK,
          reSign: true,
        })
      )
  }
}, 30_000)

beforeEach(async () => {
  await Promise.all([attester, root, claimer].map((i) => i.refreshTxIndex()))
})

it('fetches the correct deposit amount', async () => {
  const depositAmount = await DelegationNode.queryDepositAmount()
  expect(depositAmount.toString()).toStrictEqual(
    new BN(1000000000000000).toString()
  )
})

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
      claimer.did
    )
    const request = RequestForAttestation.fromClaim(claim, {
      delegationId: delegatedNode.id,
    })
    await request.signWithDid(signer, claimer)
    expect(request.verifyData()).toBeTruthy()
    await expect(request.verifySignature()).resolves.toBeTruthy()

    const attestation = Attestation.fromRequestAndDid(request, attester.did)
    await attestation
      .store()
      .then((tx) =>
        attester.authorizeExtrinsic(tx, signer, paymentAccount.address)
      )
      .then((tx) =>
        BlockchainUtils.signAndSubmitTx(tx, paymentAccount, {
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
    await attClaim.attestation
      .revoke(1)
      .then((tx) => root.authorizeExtrinsic(tx, signer, paymentAccount.address))
      .then((tx) =>
        BlockchainUtils.signAndSubmitTx(tx, paymentAccount, {
          resolveOn: BlockchainUtils.IS_IN_BLOCK,
          reSign: true,
        })
      )
    await expect(attClaim.verify()).resolves.toBeFalsy()
  }, 75_000)
})

describe('revocation', () => {
  let delegator = root
  let firstDelegee = attester
  let secondDelegee = claimer

  beforeAll(() => {
    delegator = root
    firstDelegee = attester
    secondDelegee = claimer
  })

  it('delegator can revoke and remove delegation', async () => {
    const rootNode = await writeHierarchy(delegator, DriversLicense.hash)
    const delegationA = await addDelegation(
      rootNode.id,
      rootNode.id,
      delegator,
      firstDelegee
    )

    // Test revocation
    await expect(
      delegationA
        .revoke(delegator.did)
        .then((tx) =>
          delegator.authorizeExtrinsic(tx, signer, paymentAccount.address)
        )
        .then((tx) =>
          BlockchainUtils.signAndSubmitTx(tx, paymentAccount, {
            resolveOn: BlockchainUtils.IS_IN_BLOCK,
            reSign: true,
          })
        )
    ).resolves.not.toThrow()
    await expect(delegationA.verify()).resolves.toBe(false)

    // Test removal with deposit payer's account.
    await expect(
      delegationA
        .remove()
        .then((tx) =>
          delegator.authorizeExtrinsic(tx, signer, paymentAccount.address)
        )
        .then((tx) =>
          BlockchainUtils.signAndSubmitTx(tx, paymentAccount, {
            resolveOn: BlockchainUtils.IS_IN_BLOCK,
            reSign: true,
          })
        )
    ).resolves.not.toThrow()

    // Check that delegation fails to verify and that it is not stored on the blockchain anymore.
    await expect(DelegationNode.query(delegationA.id)).resolves.toBeNull()
    await expect(delegationA.verify()).resolves.toBe(false)
  }, 60_000)

  it('delegee cannot revoke root but can revoke own delegation', async () => {
    const delegationRoot = await writeHierarchy(delegator, DriversLicense.hash)
    const delegationA = await addDelegation(
      delegationRoot.id,
      delegationRoot.id,
      delegator,
      firstDelegee
    )
    await expect(
      delegationRoot
        .revoke(firstDelegee.did)
        .then((tx) =>
          firstDelegee.authorizeExtrinsic(tx, signer, paymentAccount.address)
        )
        .then((tx) =>
          BlockchainUtils.signAndSubmitTx(tx, paymentAccount, {
            resolveOn: BlockchainUtils.IS_IN_BLOCK,
            reSign: true,
          })
        )
    ).rejects.toThrow()
    await expect(delegationRoot.verify()).resolves.toBe(true)

    await expect(
      delegationA
        .revoke(firstDelegee.did)
        .then((tx) =>
          firstDelegee.authorizeExtrinsic(tx, signer, paymentAccount.address)
        )
        .then((tx) =>
          BlockchainUtils.signAndSubmitTx(tx, paymentAccount, {
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
      delegationRoot
        .revoke(delegator.did)
        .then((tx) =>
          delegator.authorizeExtrinsic(tx, signer, paymentAccount.address)
        )
        .then((tx) =>
          BlockchainUtils.signAndSubmitTx(tx, paymentAccount, {
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
    return expect(DelegationNode.query(randomAsHex(32))).resolves.toBeNull()
  })

  it('getAttestationHashes on empty', async () => {
    return expect(getAttestationHashes(randomAsHex(32))).resolves.toEqual([])
  })
})

describe('hierarchyDetails', () => {
  it('can fetch hierarchyDetails', async () => {
    const rootNode = await writeHierarchy(root, DriversLicense.hash)
    const delegatedNode = await addDelegation(
      rootNode.id,
      rootNode.id,
      root,
      attester
    )

    const details = await delegatedNode.getHierarchyDetails()

    expect(details.cTypeHash).toBe(DriversLicense.hash)
    expect(details.id).toBe(rootNode.id)
  }, 60_000)
})

afterAll(() => {
  disconnect()
})
