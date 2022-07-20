/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group integration/delegation
 */

import type {
  ICType,
  IDelegationNode,
  KeyringPair,
  SignCallback,
} from '@kiltprotocol/types'
import { Permission, PermissionType } from '@kiltprotocol/types'
import {
  createFullDidFromSeed,
  KeyTool,
  makeSigningKeyTool,
} from '@kiltprotocol/testing'
import { FullDidDetails } from '@kiltprotocol/did'
import { randomAsHex } from '@polkadot/util-crypto'
import * as Attestation from '../attestation'
import * as Claim from '../claim'
import * as CType from '../ctype'
import * as Credential from '../credential'
import { disconnect } from '../kilt'
import { DelegationNode } from '../delegation/DelegationNode'
import {
  createEndowedTestAccount,
  devBob,
  driversLicenseCType,
  initializeApi,
  isCtypeOnChain,
  submitExtrinsic,
} from './utils'
import {
  getAttestationHashes,
  getRevokeTx,
} from '../delegation/DelegationNode.chain'

let paymentAccount: KeyringPair
let root: FullDidDetails
let rootKey: KeyTool

let claimer: FullDidDetails
let claimerKey: KeyTool

let attester: FullDidDetails
let attesterKey: KeyTool

async function writeHierarchy(
  delegator: FullDidDetails,
  ctypeHash: ICType['hash'],
  sign: SignCallback
): Promise<DelegationNode> {
  const rootNode = DelegationNode.newRoot({
    account: delegator.uri,
    permissions: [Permission.DELEGATE],
    cTypeHash: ctypeHash,
  })

  const storeTx = await rootNode.getStoreTx()
  const authorizedStoreTx = await delegator.authorizeExtrinsic(
    storeTx,
    sign,
    paymentAccount.address
  )
  await submitExtrinsic(authorizedStoreTx, paymentAccount)

  return rootNode
}

async function addDelegation(
  hierarchyId: IDelegationNode['id'],
  parentId: DelegationNode['id'],
  delegator: FullDidDetails,
  delegate: FullDidDetails,
  delegatorSign: SignCallback,
  delegateSign: SignCallback,
  permissions: PermissionType[] = [Permission.ATTEST, Permission.DELEGATE]
): Promise<DelegationNode> {
  const delegationNode = DelegationNode.newNode({
    hierarchyId,
    parentId,
    account: delegate.uri,
    permissions,
  })
  const signature = await delegationNode.delegateSign(delegate, delegateSign)
  const storeTx = await delegationNode.getStoreTx(signature)
  const authorizedStoreTx = await delegator.authorizeExtrinsic(
    storeTx,
    delegatorSign,
    paymentAccount.address
  )
  await submitExtrinsic(authorizedStoreTx, paymentAccount)
  return delegationNode
}

beforeAll(async () => {
  await initializeApi()
}, 30_000)

beforeAll(async () => {
  paymentAccount = await createEndowedTestAccount()
  rootKey = makeSigningKeyTool()
  claimerKey = makeSigningKeyTool()
  attesterKey = makeSigningKeyTool()
  attester = await createFullDidFromSeed(paymentAccount, attesterKey.keypair)
  root = await createFullDidFromSeed(paymentAccount, rootKey.keypair)
  claimer = await createFullDidFromSeed(paymentAccount, claimerKey.keypair)

  if (await isCtypeOnChain(driversLicenseCType)) return

  const storeTx = await CType.getStoreTx(driversLicenseCType)
  const authorizedStoreTx = await attester.authorizeExtrinsic(
    storeTx,
    attesterKey.sign,
    paymentAccount.address
  )
  await submitExtrinsic(authorizedStoreTx, paymentAccount)
}, 60_000)

it('fetches the correct deposit amount', async () => {
  const depositAmount = await DelegationNode.queryDepositAmount()
  expect(depositAmount.toString()).toMatchInlineSnapshot('"1000000000000000"')
})

it('should be possible to delegate attestation rights', async () => {
  const rootNode = await writeHierarchy(
    root,
    driversLicenseCType.hash,
    rootKey.sign
  )
  const delegatedNode = await addDelegation(
    rootNode.id,
    rootNode.id,
    root,
    attester,
    rootKey.sign,
    attesterKey.sign
  )
  expect(await rootNode.verify()).toBeTruthy()
  expect(await delegatedNode.verify()).toBeTruthy()
}, 60_000)

describe('and attestation rights have been delegated', () => {
  let rootNode: DelegationNode
  let delegatedNode: DelegationNode

  beforeAll(async () => {
    rootNode = await writeHierarchy(
      root,
      driversLicenseCType.hash,
      rootKey.sign
    )
    delegatedNode = await addDelegation(
      rootNode.id,
      rootNode.id,
      root,
      attester,
      rootKey.sign,
      attesterKey.sign
    )

    expect(await rootNode.verify()).toBeTruthy()
    expect(await delegatedNode.verify()).toBeTruthy()
  }, 75_000)

  it("should be possible to attest a claim in the root's name and revoke it by the root", async () => {
    const content = {
      name: 'Ralph',
      age: 12,
    }
    const claim = Claim.fromCTypeAndClaimContents(
      driversLicenseCType,
      content,
      claimer.uri
    )
    const credential = Credential.fromClaim(claim, {
      delegationId: delegatedNode.id,
    })
    await Credential.sign(
      credential,
      claimerKey.sign,
      claimer,
      claimer.authenticationKey.id
    )
    expect(Credential.verifyDataIntegrity(credential)).toBeTruthy()
    expect(await Credential.verifySignature(credential)).toBeTruthy()
    expect(await Credential.verify(credential)).toBeTruthy()

    const attestation = Attestation.fromCredentialAndDid(
      credential,
      attester.uri
    )
    const storeTx = await Attestation.getStoreTx(attestation)
    const authorizedStoreTx = await attester.authorizeExtrinsic(
      storeTx,
      attesterKey.sign,
      paymentAccount.address
    )
    await submitExtrinsic(authorizedStoreTx, paymentAccount)

    await expect(
      Attestation.checkValidity(attestation.claimHash)
    ).resolves.toBeTruthy()

    // revoke attestation through root
    const revokeTx = await Attestation.getRevokeTx(attestation.claimHash, 1)
    const authorizedStoreTx2 = await root.authorizeExtrinsic(
      revokeTx,
      rootKey.sign,
      paymentAccount.address
    )
    await submitExtrinsic(authorizedStoreTx2, paymentAccount)
    expect(await Attestation.checkValidity(attestation.claimHash)).toBeFalsy()
  }, 75_000)
})

describe('revocation', () => {
  let delegator: FullDidDetails
  let delegatorSign: SignCallback
  let firstDelegate: FullDidDetails
  let firstDelegateSign: SignCallback
  let secondDelegate: FullDidDetails
  let secondDelegateSign: SignCallback

  beforeAll(() => {
    delegator = root
    delegatorSign = rootKey.sign
    firstDelegate = attester
    firstDelegateSign = attesterKey.sign
    secondDelegate = claimer
    secondDelegateSign = claimerKey.sign
  })

  it('delegator can revoke but not remove delegation', async () => {
    const rootNode = await writeHierarchy(
      delegator,
      driversLicenseCType.hash,
      delegatorSign
    )
    const delegationA = await addDelegation(
      rootNode.id,
      rootNode.id,
      delegator,
      firstDelegate,
      delegatorSign,
      firstDelegateSign
    )

    // Test revocation
    const revokeTx = await delegationA.getRevokeTx(delegator.uri)
    const authorizedRevokeTx = await delegator.authorizeExtrinsic(
      revokeTx,
      delegatorSign,
      paymentAccount.address
    )
    await submitExtrinsic(authorizedRevokeTx, paymentAccount)
    expect(await delegationA.verify()).toBe(false)

    // Delegation removal can only be done by either the delegation owner themselves via DID call
    // or the deposit owner as a regular signed call.
    // Change introduced in https://github.com/KILTprotocol/mashnet-node/pull/304
    const removeTx = await delegationA.getRemoveTx()
    const authorizedRemoveTx = await delegator.authorizeExtrinsic(
      removeTx,
      delegatorSign,
      paymentAccount.address
    )
    await expect(
      submitExtrinsic(authorizedRemoveTx, paymentAccount)
    ).rejects.toMatchObject({
      section: 'delegation',
      name: 'UnauthorizedRemoval',
    })

    // Check that delegation fails to verify but that it is still on the blockchain (i.e., not removed)
    expect(await delegationA.verify()).toBeFalsy()
    expect(await DelegationNode.query(delegationA.id)).not.toBeNull()
  }, 60_000)

  it('delegate cannot revoke root but can revoke own delegation', async () => {
    const delegationRoot = await writeHierarchy(
      delegator,
      driversLicenseCType.hash,
      delegatorSign
    )
    const delegationA = await addDelegation(
      delegationRoot.id,
      delegationRoot.id,
      delegator,
      firstDelegate,
      delegatorSign,
      firstDelegateSign
    )
    const revokeTx = await getRevokeTx(delegationRoot.id, 1, 1)
    const authorizedRevokeTx = await firstDelegate.authorizeExtrinsic(
      revokeTx,
      firstDelegateSign,
      paymentAccount.address
    )
    await expect(
      submitExtrinsic(authorizedRevokeTx, paymentAccount)
    ).rejects.toMatchObject({
      section: 'delegation',
      name: 'UnauthorizedRevocation',
    })
    expect(await delegationRoot.verify()).toBe(true)

    const revokeTx2 = await delegationA.getRevokeTx(firstDelegate.uri)
    const authorizedRevokeTx2 = await firstDelegate.authorizeExtrinsic(
      revokeTx2,
      firstDelegateSign,
      paymentAccount.address
    )
    await submitExtrinsic(authorizedRevokeTx2, paymentAccount)
    expect(await delegationA.verify()).toBe(false)
  }, 60_000)

  it('delegator can revoke root, revoking all delegations in tree', async () => {
    let delegationRoot = await writeHierarchy(
      delegator,
      driversLicenseCType.hash,
      delegatorSign
    )
    const delegationA = await addDelegation(
      delegationRoot.id,
      delegationRoot.id,
      delegator,
      firstDelegate,
      delegatorSign,
      firstDelegateSign
    )
    const delegationB = await addDelegation(
      delegationRoot.id,
      delegationA.id,
      firstDelegate,
      secondDelegate,
      firstDelegateSign,
      secondDelegateSign
    )
    delegationRoot = await delegationRoot.getLatestState()
    const revokeTx = await delegationRoot.getRevokeTx(delegator.uri)
    const authorizedRevokeTx = await delegator.authorizeExtrinsic(
      revokeTx,
      delegatorSign,
      paymentAccount.address
    )
    await submitExtrinsic(authorizedRevokeTx, paymentAccount)

    expect(await delegationRoot.verify()).toBe(false)
    expect(await delegationA.verify()).toBe(false)
    expect(await delegationB.verify()).toBe(false)
  }, 60_000)
})

describe('Deposit claiming', () => {
  it('deposit payer should be able to claim back its own deposit and delete any children', async () => {
    // Delegation nodes are written on the chain using `paymentAccount`.
    const rootNode = await writeHierarchy(
      root,
      driversLicenseCType.hash,
      rootKey.sign
    )
    const delegatedNode = await addDelegation(
      rootNode.id,
      rootNode.id,
      root,
      root,
      rootKey.sign,
      rootKey.sign
    )
    const subDelegatedNode = await addDelegation(
      rootNode.id,
      delegatedNode.id,
      root,
      root,
      rootKey.sign,
      rootKey.sign
    )

    expect(await DelegationNode.query(delegatedNode.id)).not.toBeNull()
    expect(await DelegationNode.query(subDelegatedNode.id)).not.toBeNull()

    const depositClaimTx = await delegatedNode.getReclaimDepositTx()

    // Test removal failure with an account that is not the deposit payer.
    await expect(submitExtrinsic(depositClaimTx, devBob)).rejects.toMatchObject(
      {
        section: 'delegation',
        name: 'UnauthorizedRemoval',
      }
    )

    // Test removal success with the right account.
    await submitExtrinsic(depositClaimTx, paymentAccount)

    expect(await DelegationNode.query(delegatedNode.id)).toBeNull()
    expect(await DelegationNode.query(subDelegatedNode.id)).toBeNull()
  }, 80_000)
})

describe('handling queries to data not on chain', () => {
  it('DelegationNode query on empty', async () => {
    expect(await DelegationNode.query(randomAsHex(32))).toBeNull()
  })

  it('getAttestationHashes on empty', async () => {
    expect(await getAttestationHashes(randomAsHex(32))).toEqual([])
  })
})

describe('hierarchyDetails', () => {
  it('can fetch hierarchyDetails', async () => {
    const rootNode = await writeHierarchy(
      root,
      driversLicenseCType.hash,
      rootKey.sign
    )
    const delegatedNode = await addDelegation(
      rootNode.id,
      rootNode.id,
      root,
      attester,
      rootKey.sign,
      attesterKey.sign
    )

    const details = await delegatedNode.getHierarchyDetails()

    expect(details.cTypeHash).toBe(driversLicenseCType.hash)
    expect(details.id).toBe(rootNode.id)
  }, 60_000)
})

afterAll(async () => {
  await disconnect()
})
