/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { ApiPromise } from '@polkadot/api'
import { Keyring } from '@polkadot/keyring'
import { BN } from '@polkadot/util'
import { mnemonicGenerate } from '@polkadot/util-crypto'

import { BalanceUtils, Did, disconnect } from '@kiltprotocol/sdk-js'
import type {
  DidDocument,
  KeyringPair,
  KiltKeyringPair,
} from '@kiltprotocol/types'

import {
  createFullDidFromSeed,
  KeyTool,
  makeSigningKeyTool,
} from '../testUtils/index.js'
import {
  createEndowedTestAccount,
  fundAccount,
  initializeApi,
  submitTx,
} from './utils.js'

let paymentAccount: KiltKeyringPair
let linkDeposit: BN
let api: ApiPromise

beforeAll(async () => {
  api = await initializeApi()
  paymentAccount = await createEndowedTestAccount()
  linkDeposit = api.consts.didLookup.deposit.toBn()
}, 40_000)

describe('When there is an on-chain DID', () => {
  let did: DidDocument
  let didKey: KeyTool
  let newDid: DidDocument
  let newDidKey: KeyTool

  describe('and a tx sender willing to link its account', () => {
    beforeAll(async () => {
      didKey = makeSigningKeyTool()
      newDidKey = makeSigningKeyTool()
      did = await createFullDidFromSeed(paymentAccount, didKey.keypair)
      newDid = await createFullDidFromSeed(paymentAccount, newDidKey.keypair)
    }, 40_000)
    it('should be possible to associate the tx sender', async () => {
      // Check that no links exist
      expect(
        (
          await api.call.did.queryByAccount(
            Did.accountToChain(paymentAccount.address)
          )
        ).isNone
      ).toBe(true)

      const associateSenderTx = api.tx.didLookup.associateSender()
      const signedTx = await Did.authorizeTx(
        did.uri,
        associateSenderTx,
        didKey.getSignCallback(did),
        paymentAccount.address
      )
      const balanceBefore = (
        await api.query.system.account(paymentAccount.address)
      ).data
      await submitTx(signedTx, paymentAccount)

      // Check that the deposit has been taken from the sender's balance.
      const balanceAfter = (
        await api.query.system.account(paymentAccount.address)
      ).data
      // Lookup reserve - deposit == 0
      expect(
        balanceAfter.reserved
          .sub(balanceBefore.reserved)
          .sub(linkDeposit)
          .toString()
      ).toMatchInlineSnapshot('"0"')
      // Check that the link has been created correctly
      const encodedQueryByAccount = await api.call.did.queryByAccount(
        Did.accountToChain(paymentAccount.address)
      )
      const queryByAccount = Did.linkedInfoFromChain(encodedQueryByAccount)
      expect(queryByAccount.accounts).toStrictEqual([paymentAccount.address])
      expect(queryByAccount.document.uri).toStrictEqual(did.uri)
    }, 30_000)
    it('should be possible to associate the tx sender to a new DID', async () => {
      const associateSenderTx = api.tx.didLookup.associateSender()
      const signedTx = await Did.authorizeTx(
        newDid.uri,
        associateSenderTx,
        newDidKey.getSignCallback(newDid),
        paymentAccount.address
      )
      const balanceBefore = (
        await api.query.system.account(paymentAccount.address)
      ).data
      await submitTx(signedTx, paymentAccount)

      // Reserve should not change when replacing the link
      const balanceAfter = (
        await api.query.system.account(paymentAccount.address)
      ).data
      expect(
        balanceAfter.reserved.sub(balanceBefore.reserved).toString()
      ).toMatchInlineSnapshot('"0"')
      // Check that account is linked to new DID
      const encodedQueryByAccount = await api.call.did.queryByAccount(
        Did.accountToChain(paymentAccount.address)
      )
      const queryByAccount = Did.linkedInfoFromChain(encodedQueryByAccount)
      expect(queryByAccount.accounts).toStrictEqual([paymentAccount.address])
      expect(queryByAccount.document.uri).toStrictEqual(newDid.uri)
    }, 30_000)
    it('should be possible for the sender to remove the link', async () => {
      const removeSenderTx = api.tx.didLookup.removeSenderAssociation()
      const balanceBefore = (
        await api.query.system.account(paymentAccount.address)
      ).data
      await submitTx(removeSenderTx, paymentAccount)

      // Check that the deposit has been returned to the sender's balance.
      const balanceAfter = (
        await api.query.system.account(paymentAccount.address)
      ).data
      expect(
        balanceBefore.reserved.sub(balanceAfter.reserved).toString()
      ).toStrictEqual(linkDeposit.toString())
      const encodedQueryByAccount = await api.call.did.queryByAccount(
        Did.accountToChain(paymentAccount.address)
      )
      expect(encodedQueryByAccount.isNone).toBe(true)
    })
  })

  describe.each(['ed25519', 'sr25519', 'ecdsa', 'ethereum'])(
    'and an %s account different than the sender to link',
    (keyType) => {
      let skip = false
      let keypair: KeyringPair
      let keypairChain: string
      beforeAll(async () => {
        if (
          keyType === 'ethereum' &&
          // @ts-ignore palletVersion exists but is not augmented
          (await api.query.didLookup.palletVersion()) < 3
        ) {
          console.warn('skipping ethereum tests')
          skip = true
          return
        }
        const keyTool = makeSigningKeyTool(keyType as KiltKeyringPair['type'])
        keypair = keyTool.keypair
        keypairChain = Did.accountToChain(keypair.address)
        didKey = makeSigningKeyTool()
        newDidKey = makeSigningKeyTool()
        did = await createFullDidFromSeed(paymentAccount, didKey.keypair)
        newDid = await createFullDidFromSeed(paymentAccount, newDidKey.keypair)
      }, 40_000)

      it('should be possible to associate the account while the sender pays the deposit', async () => {
        if (skip) {
          return
        }
        const args = await Did.associateAccountToChainArgs(
          keypair.address,
          did.uri,
          async (payload) => keypair.sign(payload, { withType: false })
        )
        const signedTx = await Did.authorizeTx(
          did.uri,
          api.tx.didLookup.associateAccount(...args),
          didKey.getSignCallback(did),
          paymentAccount.address
        )
        const balanceBefore = (
          await api.query.system.account(paymentAccount.address)
        ).data
        await submitTx(signedTx, paymentAccount)

        // Check that the deposit has been taken from the sender's balance.
        const balanceAfter = (
          await api.query.system.account(paymentAccount.address)
        ).data
        // Lookup reserve - deposit == 0
        expect(
          balanceAfter.reserved
            .sub(balanceBefore.reserved)
            .sub(linkDeposit)
            .toString()
        ).toMatchInlineSnapshot('"0"')
        const encodedQueryByAccount = await api.call.did.queryByAccount(
          Did.accountToChain(keypair.address)
        )
        const queryByAccount = Did.linkedInfoFromChain(encodedQueryByAccount)
        expect(queryByAccount.accounts).toStrictEqual([keypair.address])
        expect(queryByAccount.document.uri).toStrictEqual(did.uri)
      })
      it('should be possible to associate the account to a new DID while the sender pays the deposit', async () => {
        if (skip) {
          return
        }
        const args = await Did.associateAccountToChainArgs(
          keypair.address,
          newDid.uri,
          async (payload) => keypair.sign(payload, { withType: false })
        )
        const signedTx = await Did.authorizeTx(
          newDid.uri,
          api.tx.didLookup.associateAccount(...args),
          newDidKey.getSignCallback(newDid),
          paymentAccount.address
        )
        const balanceBefore = (
          await api.query.system.account(paymentAccount.address)
        ).data
        await submitTx(signedTx, paymentAccount)

        // Reserve should not change when replacing the link
        const balanceAfter = (
          await api.query.system.account(paymentAccount.address)
        ).data
        expect(
          balanceAfter.reserved.sub(balanceBefore.reserved).toString()
        ).toMatchInlineSnapshot('"0"')

        const encodedQueryByAccount = await api.call.did.queryByAccount(
          Did.accountToChain(keypair.address)
        )
        const queryByAccount = Did.linkedInfoFromChain(encodedQueryByAccount)
        expect(queryByAccount.accounts).toStrictEqual([keypair.address])
        expect(queryByAccount.document.uri).toStrictEqual(newDid.uri)
      })
      it('should be possible for the DID to remove the link', async () => {
        if (skip) {
          return
        }
        const removeLinkTx =
          api.tx.didLookup.removeAccountAssociation(keypairChain)
        const signedTx = await Did.authorizeTx(
          newDid.uri,
          removeLinkTx,
          newDidKey.getSignCallback(newDid),
          paymentAccount.address
        )
        const balanceBefore = (
          await api.query.system.account(paymentAccount.address)
        ).data
        await submitTx(signedTx, paymentAccount)

        // Check that the deposit has been returned to the sender's balance.
        const balanceAfter = (
          await api.query.system.account(paymentAccount.address)
        ).data
        expect(
          balanceBefore.reserved.sub(balanceAfter.reserved).toString()
        ).toStrictEqual(linkDeposit.toString())
        // Check that the link has been removed completely
        const encodedQueryByAccount = await api.call.did.queryByAccount(
          Did.accountToChain(paymentAccount.address)
        )
        expect(encodedQueryByAccount.isNone).toBe(true)
        const encodedQueryByDid = await api.call.did.query(
          Did.toChain(newDid.uri)
        )
        const queryByDid = Did.linkedInfoFromChain(encodedQueryByDid)
        expect(queryByDid.accounts).toStrictEqual([])
      })
    }
  )

  describe('and a generic Ecdsa Substrate account different than the sender to link', () => {
    let genericAccount: KeyringPair

    beforeAll(async () => {
      genericAccount = new Keyring({ type: 'ecdsa' }).addFromMnemonic(
        mnemonicGenerate()
      )
      await fundAccount(
        genericAccount.address,
        BalanceUtils.convertToTxUnit(new BN(10), 1)
      )
      didKey = makeSigningKeyTool()
      newDidKey = makeSigningKeyTool()
      did = await createFullDidFromSeed(paymentAccount, didKey.keypair)
      newDid = await createFullDidFromSeed(paymentAccount, newDidKey.keypair)
    }, 40_000)

    it('should be possible to associate the account while the sender pays the deposit', async () => {
      const args = await Did.associateAccountToChainArgs(
        genericAccount.address,
        did.uri,
        async (payload) => genericAccount.sign(payload, { withType: true })
      )
      const signedTx = await Did.authorizeTx(
        did.uri,
        api.tx.didLookup.associateAccount(...args),
        didKey.getSignCallback(did),
        paymentAccount.address
      )
      const balanceBefore = (
        await api.query.system.account(paymentAccount.address)
      ).data
      await submitTx(signedTx, paymentAccount)

      // Check that the deposit has been taken from the sender's balance.
      const balanceAfter = (
        await api.query.system.account(paymentAccount.address)
      ).data
      // Lookup reserve - deposit == 0
      expect(
        balanceAfter.reserved
          .sub(balanceBefore.reserved)
          .sub(linkDeposit)
          .toString()
      ).toMatchInlineSnapshot('"0"')
      const encodedQueryByAccount = await api.call.did.queryByAccount(
        Did.accountToChain(genericAccount.address)
      )
      // Use generic substrate address prefix
      const queryByAccount = Did.linkedInfoFromChain(encodedQueryByAccount, 42)
      expect(queryByAccount.accounts).toStrictEqual([genericAccount.address])
      expect(queryByAccount.document.uri).toStrictEqual(did.uri)
    })

    it('should be possible to add a Web3 name for the linked DID and retrieve it starting from the linked account', async () => {
      const web3NameClaimTx = api.tx.web3Names.claim('test-name')
      const signedTx = await Did.authorizeTx(
        did.uri,
        web3NameClaimTx,
        didKey.getSignCallback(did),
        paymentAccount.address
      )
      await submitTx(signedTx, paymentAccount)

      // Check that the Web3 name has been linked to the DID
      const encodedQueryByW3n = await api.call.did.queryByWeb3Name('test-name')
      const queryByW3n = Did.linkedInfoFromChain(encodedQueryByW3n)
      expect(queryByW3n.document.uri).toStrictEqual(did.uri)
      // Check that it is possible to retrieve the web3 name from the account linked to the DID
      const encodedQueryByAccount = await api.call.did.queryByAccount(
        Did.accountToChain(genericAccount.address)
      )
      const queryByAccount = Did.linkedInfoFromChain(encodedQueryByAccount)
      expect(queryByAccount.web3Name).toStrictEqual('test-name')
    })

    it('should be possible for the sender to remove the link', async () => {
      // No need for DID-authorizing this.
      const reclaimDepositTx = api.tx.didLookup.removeSenderAssociation()
      const balanceBefore = (
        await api.query.system.account(paymentAccount.address)
      ).data
      await submitTx(reclaimDepositTx, genericAccount)

      // Check that the deposit has been returned to the sender's balance.
      const balanceAfter = (
        await api.query.system.account(paymentAccount.address)
      ).data
      expect(
        balanceBefore.reserved.sub(balanceAfter.reserved).toString()
      ).toStrictEqual(linkDeposit.toString())
      // Check that the link has been removed completely
      const encodedQueryByAccount = await api.call.did.queryByAccount(
        Did.accountToChain(genericAccount.address)
      )
      expect(encodedQueryByAccount.isNone).toBe(true)
    })
  })
})

afterAll(disconnect)
