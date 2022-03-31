/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group integration/accountLinking
 */

import { BlockchainApiConnection } from '@kiltprotocol/chain-helpers'
import { AccountLinks, DemoKeystore, FullDidDetails } from '@kiltprotocol/did'
import { KeyringPair } from '@kiltprotocol/types'
import { ApiPromise } from '@polkadot/api'
import { Keyring } from '@polkadot/keyring'
import { BN } from '@polkadot/util'
import { mnemonicGenerate, randomAsHex } from '@polkadot/util-crypto'
import { Balance } from '../balance'
import {
  createEndowedTestAccount,
  createFullDidFromSeed,
  initializeApi,
  SingleAccountSigner,
  submitExtrinsicWithResign,
} from './utils'

let paymentAccount: KeyringPair
let keystore: DemoKeystore
let linkDeposit: BN
let api: ApiPromise
let keyring: Keyring

beforeAll(async () => {
  await initializeApi()
  paymentAccount = await createEndowedTestAccount()
  keystore = new DemoKeystore()
  linkDeposit = await AccountLinks.queryDepositAmount()
  keyring = new Keyring({ ss58Format: 38 })
  ;({ api } = await BlockchainApiConnection.getConnectionOrConnect())
}, 40_000)

describe('When there is an on-chain DID', () => {
  let did: FullDidDetails

  beforeEach(async () => {
    did = await createFullDidFromSeed(paymentAccount, keystore, randomAsHex(32))
  }, 30_000)

  describe.skip('and a tx sender willing to link its account', () => {
    it('should be possible to associate the tx sender', async () => {
      await expect(
        AccountLinks.getConnectedDidForAccount(paymentAccount.address)
      ).resolves.toBeNull()
      await expect(
        AccountLinks.getConnectedAccountsForDid(did.identifier)
      ).resolves.toStrictEqual([])
      await expect(
        AccountLinks.checkConnected(did.identifier, paymentAccount.address)
      ).resolves.toBeFalsy()

      const associateSenderTx = await AccountLinks.getAssociateSenderTx()
      const signedTx = await did.authorizeExtrinsic(
        associateSenderTx,
        keystore,
        paymentAccount.address
      )
      const balanceBefore = await Balance.getBalances(paymentAccount.address)
      const submissionPromise = submitExtrinsicWithResign(
        signedTx,
        paymentAccount
      )
      await expect(submissionPromise).resolves.not.toThrow()
      // Check that the deposit has been taken from the sender's balance.
      const balanceAfter = await Balance.getBalances(paymentAccount.address)
      // Lookup reserve - deposit == 0
      expect(
        balanceAfter.reserved
          .sub(balanceBefore.reserved)
          .sub(linkDeposit)
          .toString()
      ).toMatchInlineSnapshot('"0"')
      await expect(
        AccountLinks.getConnectedDidForAccount(paymentAccount.address)
      ).resolves.toStrictEqual(did.identifier)
      await expect(
        AccountLinks.getConnectedAccountsForDid(did.identifier)
      ).resolves.toStrictEqual([paymentAccount.address])
      await expect(
        AccountLinks.checkConnected(did.identifier, paymentAccount.address)
      ).resolves.toBeTruthy()
    }, 30_000)
    it('should be possible to associate the tx sender to a new DID', async () => {
      const newDid = await createFullDidFromSeed(
        paymentAccount,
        keystore,
        randomAsHex(32)
      )
      const associateSenderTx = await AccountLinks.getAssociateSenderTx()
      const signedTx = await newDid.authorizeExtrinsic(
        associateSenderTx,
        keystore,
        paymentAccount.address
      )
      const balanceBefore = await Balance.getBalances(paymentAccount.address)
      const submissionPromise = submitExtrinsicWithResign(
        signedTx,
        paymentAccount
      )
      await expect(submissionPromise).resolves.not.toThrow()
      // Check that the deposit has been taken from the sender's balance.
      const balanceAfter = await Balance.getBalances(paymentAccount.address)
      // Reserve should not change when replacing the link
      expect(
        balanceAfter.reserved.sub(balanceBefore.reserved).toString()
      ).toMatchInlineSnapshot('"0"')
      await expect(
        AccountLinks.getConnectedDidForAccount(paymentAccount.address)
      ).resolves.toStrictEqual(newDid.identifier)
      await expect(
        AccountLinks.getConnectedAccountsForDid(did.identifier)
      ).resolves.toStrictEqual([])
      await expect(
        AccountLinks.checkConnected(did.identifier, paymentAccount.address)
      ).resolves.toBeFalsy()
      await expect(
        AccountLinks.getConnectedAccountsForDid(newDid.identifier)
      ).resolves.toStrictEqual([paymentAccount.address])
      await expect(
        AccountLinks.checkConnected(newDid.identifier, paymentAccount.address)
      ).resolves.toBeTruthy()
    }, 30_000)
    it('should be possible for the sender to remove the link', async () => {
      const removeSenderTx = await AccountLinks.getLinkRemovalByAccountTx()
      const balanceBefore = await Balance.getBalances(paymentAccount.address)
      const submissionPromise = submitExtrinsicWithResign(
        removeSenderTx,
        paymentAccount
      )
      await expect(submissionPromise).resolves.not.toThrow()
      // Check that the deposit has been returned from the sender's balance.
      const balanceAfter = await Balance.getBalances(paymentAccount.address)
      expect(
        balanceBefore.reserved.sub(balanceAfter.reserved).toString()
      ).toStrictEqual(linkDeposit.toString())
      await expect(
        AccountLinks.getConnectedDidForAccount(paymentAccount.address)
      ).resolves.toBeNull()
      await expect(
        AccountLinks.getConnectedAccountsForDid(did.identifier)
      ).resolves.toStrictEqual([])
      await expect(
        AccountLinks.checkConnected(did.identifier, paymentAccount.address)
      ).resolves.toBeFalsy()
    })
  })

  describe('and an Ed25519 account different than the sender to link', () => {
    let ed25519Account: KeyringPair
    beforeAll(async () => {
      ed25519Account = keyring.addFromMnemonic(
        mnemonicGenerate(),
        undefined,
        'ed25519'
      )
    })
    it('should be possible to associate the account while the sender pays the deposit', async () => {
      const linkAuthorisation = await AccountLinks.authorizeLinkWithAccount(
        ed25519Account.address,
        new SingleAccountSigner(api.registry, ed25519Account),
        did.identifier
      )
      const signedTx = await did.authorizeExtrinsic(
        linkAuthorisation,
        keystore,
        paymentAccount.address
      )
      const balanceBefore = await Balance.getBalances(paymentAccount.address)
      const submissionPromise = submitExtrinsicWithResign(
        signedTx,
        paymentAccount
      )
      await expect(submissionPromise).resolves.not.toThrow()
      // Check that the deposit has been taken from the sender's balance.
      const balanceAfter = await Balance.getBalances(paymentAccount.address)
      expect(
        balanceAfter.reserved
          .sub(balanceBefore.reserved)
          .sub(linkDeposit)
          .toString()
      ).toMatchInlineSnapshot('"0"')
      await expect(
        AccountLinks.getConnectedDidForAccount(ed25519Account.address)
      ).resolves.toStrictEqual(did.identifier)
      await expect(
        AccountLinks.getConnectedDidForAccount(paymentAccount.address)
      ).resolves.toBeNull()
      await expect(
        AccountLinks.getConnectedAccountsForDid(did.identifier)
      ).resolves.toStrictEqual([ed25519Account.address])
      await expect(
        AccountLinks.checkConnected(did.identifier, paymentAccount.address)
      ).resolves.toBeFalsy()
      await expect(
        AccountLinks.checkConnected(did.identifier, ed25519Account.address)
      ).resolves.toBeTruthy()
    })
    it.todo(
      'should be possible to associate the account to a new DID while the sender pays the deposit'
    )
    it.todo('should be possible for the DID to remove the link')
  })

  describe.skip('and an Sr25519 account different than the sender to link', () => {
    let sr25519Account: KeyringPair
    beforeAll(async () => {
      sr25519Account = keyring.addFromMnemonic(
        mnemonicGenerate(),
        undefined,
        'sr25519'
      )
    })
    // TODO: Fix origin error
    it('should be possible to associate the account while the sender pays the deposit', async () => {
      const linkAuthorisation = await AccountLinks.authorizeLinkWithAccount(
        sr25519Account.address,
        new SingleAccountSigner(api.registry, sr25519Account),
        did.identifier
      )
      const signedTx = await did.authorizeExtrinsic(
        linkAuthorisation,
        keystore,
        paymentAccount.address
      )
      const balanceBefore = await Balance.getBalances(paymentAccount.address)
      const submissionPromise = submitExtrinsicWithResign(
        signedTx,
        paymentAccount
      )
      await expect(submissionPromise).resolves.not.toThrow()
      // Check that the deposit has been taken from the sender's balance.
      const balanceAfter = await Balance.getBalances(paymentAccount.address)
      // Reserve should not change when replacing the link
      expect(
        balanceAfter.reserved.sub(balanceBefore.reserved).toString()
      ).toMatchInlineSnapshot('"0"')
      await expect(
        AccountLinks.getConnectedDidForAccount(sr25519Account.address)
      ).resolves.toStrictEqual(did.identifier)
      await expect(
        AccountLinks.getConnectedDidForAccount(paymentAccount.address)
      ).resolves.toBeNull()
      await expect(
        AccountLinks.getConnectedAccountsForDid(did.identifier)
      ).resolves.toStrictEqual([sr25519Account.address])
      await expect(
        AccountLinks.checkConnected(did.identifier, paymentAccount.address)
      ).resolves.toBeFalsy()
      await expect(
        AccountLinks.checkConnected(did.identifier, sr25519Account.address)
      ).resolves.toBeTruthy()
    })
    it.todo(
      'should be possible to associate the account to a new DID while the sender pays the deposit'
    )
    it.todo('should be possible for the sender to remove the link')
  })

  describe.skip('and an Ecdsa account different than the sender to link', () => {
    it.todo(
      'should be possible to associate the account while the sender pays the deposit'
    )
    it.todo(
      'should be possible to associate the account to a new DID while the sender pays the deposit'
    )
    it.todo('should be possible for the deposit payer to remove the link')
  })

  describe.skip('and an Ethereum account different than the sender to link', () => {
    it.todo(
      'should be possible to associate the account while the sender pays the deposit'
    )
    it.todo(
      'should be possible to associate the account to a new DID while the sender pays the deposit'
    )
  })
})
