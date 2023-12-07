/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { ApiPromise } from '@polkadot/api'
import { randomAsHex } from '@polkadot/util-crypto'

import { Attestation, CType, DelegationNode } from '@kiltprotocol/core'
import { disconnect } from '@kiltprotocol/chain-helpers'
import { Claim, Credential } from '@kiltprotocol/legacy-credentials'
import * as Did from '@kiltprotocol/did'
import type {
  DidDocument,
  ICType,
  IDelegationNode,
  KiltKeyringPair,
  SignerInterface,
} from '@kiltprotocol/types'
import { Permission, PermissionType } from '@kiltprotocol/types'

import {
  KeyTool,
  createFullDidFromSeed,
  makeSigningKeyTool,
} from '../testUtils/index.js'
import {
  createEndowedTestAccount,
  devBob,
  driversLicenseCType,
  initializeApi,
  isCtypeOnChain,
  submitTx,
} from './utils.js'

let api: ApiPromise

let paymentAccount: KiltKeyringPair
let root: DidDocument
let rootKey: KeyTool

let claimer: DidDocument
let claimerKey: KeyTool

let attester: DidDocument
let attesterKey: KeyTool

async function writeHierarchy(
  delegator: DidDocument,
  cTypeId: ICType['$id'],
  signers: readonly SignerInterface[]
): Promise<DelegationNode> {
  const rootNode = DelegationNode.newRoot({
    account: delegator.id,
    permissions: [Permission.DELEGATE],
    cTypeHash: CType.idToHash(cTypeId),
  })

  const storeTx = await rootNode.getStoreTx()
  const authorizedStoreTx = await Did.authorizeTx(
    delegator.id,
    storeTx,
    signers,
    paymentAccount.address
  )
  await submitTx(authorizedStoreTx, paymentAccount)

  return rootNode
}

async function addDelegation(
  hierarchyId: IDelegationNode['id'],
  parentId: DelegationNode['id'],
  delegator: DidDocument,
  delegate: DidDocument,
  delegatorSign: SignerInterface[],
  delegateSign: SignerInterface[],
  permissions: PermissionType[] = [Permission.ATTEST, Permission.DELEGATE]
): Promise<DelegationNode> {
  const delegationNode = DelegationNode.newNode({
    hierarchyId,
    parentId,
    account: delegate.id,
    permissions,
  })
  const signature = await delegationNode.delegateSign(delegate, delegateSign)
  const storeTx = await delegationNode.getStoreTx(signature)
  const authorizedStoreTx = await Did.authorizeTx(
    delegator.id,
    storeTx,
    delegatorSign,
    paymentAccount.address
  )
  await submitTx(authorizedStoreTx, paymentAccount)
  return delegationNode
}

beforeAll(async () => {
  api = await initializeApi()
}, 30_000)

beforeAll(async () => {
  paymentAccount = await createEndowedTestAccount()
  rootKey = await makeSigningKeyTool()
  claimerKey = await makeSigningKeyTool()
  attesterKey = await makeSigningKeyTool()
  attester = await createFullDidFromSeed(paymentAccount, attesterKey.keypair)
  root = await createFullDidFromSeed(paymentAccount, rootKey.keypair)
  claimer = await createFullDidFromSeed(paymentAccount, claimerKey.keypair)

  if (await isCtypeOnChain(driversLicenseCType)) return

  const storeTx = api.tx.ctype.add(CType.toChain(driversLicenseCType))
  const authorizedStoreTx = await Did.authorizeTx(
    attester.id,
    storeTx,
    await attesterKey.getSigners(attester),
    paymentAccount.address
  )
  await submitTx(authorizedStoreTx, paymentAccount)
}, 60_000)

it('fetches the correct deposit amount', async () => {
  const depositAmount = api.consts.delegation.deposit.toBn()
  expect(depositAmount.toString()).toMatchInlineSnapshot('"1000000000000000"')
})

it('should be possible to delegate attestation rights', async () => {
  const rootNode = await writeHierarchy(
    root,
    driversLicenseCType.$id,
    await rootKey.getSigners(root)
  )
  const delegatedNode = await addDelegation(
    rootNode.id,
    rootNode.id,
    root,
    attester,
    await rootKey.getSigners(root),
    await attesterKey.getSigners(attester)
  )
  await expect(rootNode.verify()).resolves.not.toThrow()
  await expect(delegatedNode.verify()).resolves.not.toThrow()
}, 60_000)

describe('and attestation rights have been delegated', () => {
  let rootNode: DelegationNode
  let delegatedNode: DelegationNode

  beforeAll(async () => {
    rootNode = await writeHierarchy(
      root,
      driversLicenseCType.$id,
      await rootKey.getSigners(root)
    )
    delegatedNode = await addDelegation(
      rootNode.id,
      rootNode.id,
      root,
      attester,
      await rootKey.getSigners(root),
      await attesterKey.getSigners(attester)
    )

    await expect(rootNode.verify()).resolves.not.toThrow()
    await expect(delegatedNode.verify()).resolves.not.toThrow()
  }, 75_000)

  it("should be possible to attest a claim in the root's name and revoke it by the root", async () => {
    const content = {
      name: 'Ralph',
      age: 12,
    }
    const claim = Claim.fromCTypeAndClaimContents(
      driversLicenseCType,
      content,
      claimer.id
    )
    const credential = Credential.fromClaim(claim, {
      delegationId: delegatedNode.id,
    })
    const presentation = await Credential.createPresentation({
      credential,
      signers: await claimerKey.getSigners(claimer),
    })
    expect(() => Credential.verifyDataIntegrity(credential)).not.toThrow()
    await expect(
      Credential.verifySignature(presentation)
    ).resolves.not.toThrow()
    Credential.verifyWellFormed(presentation, { ctype: driversLicenseCType })

    const attestation = Attestation.fromCredentialAndDid(
      credential,
      attester.id
    )
    const storeTx = api.tx.attestation.add(
      attestation.claimHash,
      attestation.cTypeHash,
      { Delegation: { subjectNodeId: delegatedNode.id } }
    )
    const authorizedStoreTx = await Did.authorizeTx(
      attester.id,
      storeTx,
      await attesterKey.getSigners(attester),
      paymentAccount.address
    )
    await submitTx(authorizedStoreTx, paymentAccount)

    const storedAttestation = Attestation.fromChain(
      await api.query.attestation.attestations(attestation.claimHash),
      attestation.claimHash
    )
    expect(storedAttestation).not.toBeNull()
    expect(storedAttestation?.revoked).toBe(false)

    // revoke attestation through root
    const revokeTx = api.tx.attestation.revoke(attestation.claimHash, {
      Delegation: { maxChecks: 1 },
    })
    const authorizedStoreTx2 = await Did.authorizeTx(
      root.id,
      revokeTx,
      await rootKey.getSigners(root),
      paymentAccount.address
    )
    await submitTx(authorizedStoreTx2, paymentAccount)

    const storedAttestationAfter = Attestation.fromChain(
      await api.query.attestation.attestations(attestation.claimHash),
      attestation.claimHash
    )
    expect(storedAttestationAfter).not.toBeNull()
    expect(storedAttestationAfter?.revoked).toBe(true)
  }, 75_000)
})

describe('revocation', () => {
  let delegator: DidDocument
  let delegatorSign: SignerInterface[]
  let firstDelegate: DidDocument
  let firstDelegateSign: SignerInterface[]
  let secondDelegate: DidDocument
  let secondDelegateSign: SignerInterface[]

  beforeAll(async () => {
    delegator = root
    delegatorSign = await rootKey.getSigners(root)
    firstDelegate = attester
    firstDelegateSign = await attesterKey.getSigners(attester)
    secondDelegate = claimer
    secondDelegateSign = await claimerKey.getSigners(claimer)
  })

  it('delegator can revoke but not remove delegation', async () => {
    const rootNode = await writeHierarchy(
      delegator,
      driversLicenseCType.$id,
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
    const revokeTx = await delegationA.getRevokeTx(delegator.id)
    const authorizedRevokeTx = await Did.authorizeTx(
      delegator.id,
      revokeTx,
      delegatorSign,
      paymentAccount.address
    )
    await submitTx(authorizedRevokeTx, paymentAccount)
    await expect(delegationA.verify()).rejects.toThrow()

    // Delegation removal can only be done by either the delegation owner themselves via DID call
    // or the deposit owner as a regular signed call.
    // Change introduced in https://github.com/KILTprotocol/mashnet-node/pull/304
    const removeTx = await delegationA.getRemoveTx()
    const authorizedRemoveTx = await Did.authorizeTx(
      delegator.id,
      removeTx,
      delegatorSign,
      paymentAccount.address
    )
    await expect(
      submitTx(authorizedRemoveTx, paymentAccount)
    ).rejects.toMatchObject({
      section: 'delegation',
      name: 'UnauthorizedRemoval',
    })

    // Check that delegation fails to verify but that it is still on the blockchain (i.e., not removed)
    await expect(delegationA.verify()).rejects.toThrow()
    expect(await DelegationNode.fetch(delegationA.id)).not.toBeNull()
  }, 60_000)

  it('delegate cannot revoke root but can revoke own delegation', async () => {
    const delegationRoot = await writeHierarchy(
      delegator,
      driversLicenseCType.$id,
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
    const revokeTx = api.tx.delegation.revokeDelegation(delegationRoot.id, 1, 1)
    const authorizedRevokeTx = await Did.authorizeTx(
      firstDelegate.id,
      revokeTx,
      firstDelegateSign,
      paymentAccount.address
    )
    await expect(
      submitTx(authorizedRevokeTx, paymentAccount)
    ).rejects.toMatchObject({
      section: 'delegation',
      name: 'UnauthorizedRevocation',
    })
    await expect(delegationRoot.verify()).resolves.not.toThrow()

    const revokeTx2 = await delegationA.getRevokeTx(firstDelegate.id)
    const authorizedRevokeTx2 = await Did.authorizeTx(
      firstDelegate.id,
      revokeTx2,
      firstDelegateSign,
      paymentAccount.address
    )
    await submitTx(authorizedRevokeTx2, paymentAccount)
    await expect(delegationA.verify()).rejects.toThrow()
  }, 60_000)

  it('delegator can revoke root, revoking all delegations in tree', async () => {
    let delegationRoot = await writeHierarchy(
      delegator,
      driversLicenseCType.$id,
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
    const revokeTx = await delegationRoot.getRevokeTx(delegator.id)
    const authorizedRevokeTx = await Did.authorizeTx(
      delegator.id,
      revokeTx,
      delegatorSign,
      paymentAccount.address
    )
    await submitTx(authorizedRevokeTx, paymentAccount)

    await expect(delegationRoot.verify()).rejects.toThrow()
    await expect(delegationA.verify()).rejects.toThrow()
    await expect(delegationB.verify()).rejects.toThrow()
  }, 60_000)
})

describe('Deposit claiming', () => {
  it('deposit payer should be able to claim back its own deposit and delete any children', async () => {
    // Delegation nodes are written on the chain using `paymentAccount`.
    const rootNode = await writeHierarchy(
      root,
      driversLicenseCType.$id,
      await rootKey.getSigners(root)
    )
    const delegatedNode = await addDelegation(
      rootNode.id,
      rootNode.id,
      root,
      root,
      await rootKey.getSigners(root),
      await rootKey.getSigners(root)
    )
    const subDelegatedNode = await addDelegation(
      rootNode.id,
      delegatedNode.id,
      root,
      root,
      await rootKey.getSigners(root),
      await rootKey.getSigners(root)
    )

    expect(await DelegationNode.fetch(delegatedNode.id)).not.toBeNull()
    expect(await DelegationNode.fetch(subDelegatedNode.id)).not.toBeNull()

    const depositClaimTx = await delegatedNode.getReclaimDepositTx()

    // Test removal failure with an account that is not the deposit payer.
    await expect(submitTx(depositClaimTx, devBob)).rejects.toMatchObject({
      section: 'delegation',
      name: 'UnauthorizedRemoval',
    })

    // Test removal success with the right account.
    await submitTx(depositClaimTx, paymentAccount)

    await expect(DelegationNode.fetch(delegatedNode.id)).rejects.toThrow()
    await expect(DelegationNode.fetch(subDelegatedNode.id)).rejects.toThrow()
  }, 80_000)
})

describe('handling queries to data not on chain', () => {
  it('DelegationNode fetch on empty', async () => {
    await expect(DelegationNode.fetch(randomAsHex(32))).rejects.toThrow()
  })

  it('getAttestationHashes on empty', async () => {
    expect(
      await DelegationNode.newNode({
        permissions: [0],
        hierarchyId: randomAsHex(32),
        parentId: randomAsHex(32),
        account: attester.id,
      }).getAttestationHashes()
    ).toEqual([])
  })
})

describe('hierarchyDetails', () => {
  it('can fetch hierarchyDetails', async () => {
    const rootNode = await writeHierarchy(
      root,
      driversLicenseCType.$id,
      await rootKey.getSigners(root)
    )
    const delegatedNode = await addDelegation(
      rootNode.id,
      rootNode.id,
      root,
      attester,
      await rootKey.getSigners(root),
      await attesterKey.getSigners(attester)
    )

    const details = await delegatedNode.getHierarchyDetails()

    expect(CType.hashToId(details.cTypeHash)).toBe(driversLicenseCType.$id)
    expect(details.id).toBe(rootNode.id)
  }, 60_000)
})

afterAll(async () => {
  await disconnect()
})
