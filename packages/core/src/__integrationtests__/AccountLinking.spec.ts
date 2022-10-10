/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group integration/accountLinking
 */

import * as Did from '@kiltprotocol/did'
import {
  createFullDidFromSeed,
  KeyTool,
  makeSigningKeyTool,
} from '@kiltprotocol/testing'
import type {
  DidDocument,
  KeyringPair,
  KiltKeyringPair,
} from '@kiltprotocol/types'
import { Keyring } from '@polkadot/keyring'
import { BN } from '@polkadot/util'
import type { ApiPromise } from '@polkadot/api'
import { mnemonicGenerate } from '@polkadot/util-crypto'
import { convertToTxUnit } from '../balance/Balance.utils'
import {
  createEndowedTestAccount,
  fundAccount,
  initializeApi,
  submitTx,
} from './utils'
import { disconnect } from '../kilt'

let paymentAccount: KiltKeyringPair
let paymentAccountChain: string
let linkDeposit: BN
let api: ApiPromise

beforeAll(async () => {
  api = await initializeApi()
  paymentAccount = await createEndowedTestAccount()
  paymentAccountChain = Did.accountToChain(paymentAccount.address)
  linkDeposit = api.consts.didLookup.deposit.toBn()
}, 40_000)

describe('When there is an on-chain DID', () => {
  let did: DidDocument
  let didChain: string
  let didKey: KeyTool
  let newDid: DidDocument
  let newDidChain: string
  let newDidKey: KeyTool

  describe('and a tx sender willing to link its account', () => {
    beforeAll(async () => {
      didKey = makeSigningKeyTool()
      newDidKey = makeSigningKeyTool()
      did = await createFullDidFromSeed(paymentAccount, didKey.keypair)
      didChain = Did.toChain(did.uri)
      newDid = await createFullDidFromSeed(paymentAccount, newDidKey.keypair)
      newDidChain = Did.toChain(newDid.uri)
    }, 40_000)
    it.only('should be possible to associate the tx sender', async () => {
      // Check that no links exist
      expect(
        (await api.query.didLookup.connectedDids(paymentAccountChain)).isNone
      ).toBe(true)
      expect(
        await api.query.didLookup.connectedAccounts.keys(didChain)
      ).toStrictEqual([])
      expect(
        (
          await api.query.didLookup.connectedAccounts(
            didChain,
            paymentAccountChain
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
      const para = {
        AccountId32: paymentAccount.address,
      } as any
      console.log(
        api
          .createType('PalletDidLookupLinkableAccountLinkableAccountId', {
            AccountId32: paymentAccount.address,
          })
          .toHuman()
      )
      const a = await api.rpc.did.queryByAccount(para)
      console.log(a)
      expect(
        Did.connectedDidFromChain(
          await api.query.didLookup.connectedDids(paymentAccountChain)
        ).did
      ).toStrictEqual(did.uri)
      const encoded = await api.query.didLookup.connectedAccounts.keys(didChain)
      expect(Did.connectedAccountsFromChain(encoded)).toStrictEqual([
        paymentAccount.address,
      ])
      expect(
        (
          await api.query.didLookup.connectedAccounts(
            didChain,
            paymentAccountChain
          )
        ).isSome
      ).toBe(true)
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
      expect(
        Did.connectedDidFromChain(
          await api.query.didLookup.connectedDids(paymentAccountChain)
        ).did
      ).toStrictEqual(newDid.uri)
      // Check that old DID has no accounts linked
      expect(
        await api.query.didLookup.connectedAccounts.keys(didChain)
      ).toStrictEqual([])
      expect(
        (
          await api.query.didLookup.connectedAccounts(
            didChain,
            paymentAccountChain
          )
        ).isNone
      ).toBe(true)
      // Check that new DID has the account linked
      const encoded = await api.query.didLookup.connectedAccounts.keys(
        newDidChain
      )
      expect(Did.connectedAccountsFromChain(encoded)).toStrictEqual([
        paymentAccount.address,
      ])
      expect(
        (
          await api.query.didLookup.connectedAccounts(
            newDidChain,
            paymentAccountChain
          )
        ).isSome
      ).toBe(true)
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
      expect(
        (await api.query.didLookup.connectedDids(paymentAccountChain)).isNone
      ).toBe(true)
      expect(
        await api.query.didLookup.connectedAccounts.keys(didChain)
      ).toStrictEqual([])
      expect(
        (
          await api.query.didLookup.connectedAccounts(
            didChain,
            paymentAccountChain
          )
        ).isNone
      ).toBe(true)
    })
  })

  describe.each(['ed25519', 'sr25519', 'ecdsa', 'ethereum'])(
    'and an %s account different than the sender to link',
    (keyType) => {
      // TODO: remove this line to test against ethereum linking enabled chains
      const it = keyType === 'ethereum' ? test.skip : test

      let keypair: KeyringPair
      let keypairChain: string
      beforeAll(async () => {
        // TODO: remove this line to test against ethereum linking enabled chains
        if (keyType === 'ethereum') return

        const keyTool = makeSigningKeyTool(keyType as KiltKeyringPair['type'])
        keypair = keyTool.keypair
        keypairChain = Did.accountToChain(keypair.address)
        didKey = makeSigningKeyTool()
        newDidKey = makeSigningKeyTool()
        did = await createFullDidFromSeed(paymentAccount, didKey.keypair)
        didChain = Did.toChain(did.uri)
        newDid = await createFullDidFromSeed(paymentAccount, newDidKey.keypair)
        newDidChain = Did.toChain(newDid.uri)
      }, 40_000)

      it('should be possible to associate the account while the sender pays the deposit', async () => {
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
        expect(
          Did.connectedDidFromChain(
            await api.query.didLookup.connectedDids(keypairChain)
          ).did
        ).toStrictEqual(did.uri)
        expect(
          (await api.query.didLookup.connectedDids(paymentAccountChain)).isNone
        ).toBe(true)
        const encoded = await api.query.didLookup.connectedAccounts.keys(
          didChain
        )
        expect(Did.connectedAccountsFromChain(encoded)).toStrictEqual([
          keypair.address,
        ])
        expect(
          (
            await api.query.didLookup.connectedAccounts(
              didChain,
              paymentAccountChain
            )
          ).isNone
        ).toBe(true)
        expect(
          (await api.query.didLookup.connectedAccounts(didChain, keypairChain))
            .isSome
        ).toBe(true)
      })
      it('should be possible to associate the account to a new DID while the sender pays the deposit', async () => {
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
        expect(
          (await api.query.didLookup.connectedDids(paymentAccountChain)).isNone
        ).toBe(true)
        expect(
          Did.connectedDidFromChain(
            await api.query.didLookup.connectedDids(keypairChain)
          ).did
        ).toStrictEqual(newDid.uri)
        expect(
          await api.query.didLookup.connectedAccounts.keys(didChain)
        ).toStrictEqual([])
        expect(
          (
            await api.query.didLookup.connectedAccounts(
              didChain,
              paymentAccountChain
            )
          ).isNone
        ).toBe(true)
        expect(
          (await api.query.didLookup.connectedAccounts(didChain, keypairChain))
            .isNone
        ).toBe(true)
        // Check that new DID has the account linked
        const encoded = await api.query.didLookup.connectedAccounts.keys(
          newDidChain
        )
        expect(Did.connectedAccountsFromChain(encoded)).toStrictEqual([
          keypair.address,
        ])
        expect(
          (
            await api.query.didLookup.connectedAccounts(
              newDidChain,
              paymentAccountChain
            )
          ).isNone
        ).toBe(true)
        expect(
          (
            await api.query.didLookup.connectedAccounts(
              newDidChain,
              keypairChain
            )
          ).isSome
        ).toBe(true)
      })
      it('should be possible for the DID to remove the link', async () => {
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
        expect(
          (await api.query.didLookup.connectedDids(paymentAccountChain)).isNone
        ).toBe(true)
        expect(
          (await api.query.didLookup.connectedDids(keypairChain)).isNone
        ).toBe(true)
        expect(
          await api.query.didLookup.connectedAccounts.keys(newDidChain)
        ).toStrictEqual([])
        expect(
          (
            await api.query.didLookup.connectedAccounts(
              didChain,
              paymentAccountChain
            )
          ).isNone
        ).toBe(true)
        expect(
          (await api.query.didLookup.connectedAccounts(didChain, keypairChain))
            .isNone
        ).toBe(true)
      })
    }
  )

  describe('and a generic Ecdsa Substrate account different than the sender to link', () => {
    let genericAccount: KeyringPair
    let genericAccountChain: string

    beforeAll(async () => {
      genericAccount = new Keyring({ type: 'ecdsa' }).addFromMnemonic(
        mnemonicGenerate()
      )
      genericAccountChain = Did.accountToChain(genericAccount.address)
      await fundAccount(genericAccount.address, convertToTxUnit(new BN(10), 1))
      didKey = makeSigningKeyTool()
      newDidKey = makeSigningKeyTool()
      did = await createFullDidFromSeed(paymentAccount, didKey.keypair)
      didChain = Did.toChain(did.uri)
      newDid = await createFullDidFromSeed(paymentAccount, newDidKey.keypair)
      newDidChain = Did.toChain(newDid.uri)
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
      expect(
        Did.connectedDidFromChain(
          await api.query.didLookup.connectedDids(genericAccountChain)
        ).did
      ).toStrictEqual(did.uri)
      expect(
        (await api.query.didLookup.connectedDids(paymentAccountChain)).isNone
      ).toBe(true)
      const encoded = await api.query.didLookup.connectedAccounts.keys(didChain)
      expect(
        // Wildcard substrate encoding. Account should match the generated one.
        Did.connectedAccountsFromChain(encoded, 42)
      ).toStrictEqual([genericAccount.address])
      expect(
        (
          await api.query.didLookup.connectedAccounts(
            didChain,
            paymentAccountChain
          )
        ).isNone
      ).toBe(true)
      expect(
        (
          await api.query.didLookup.connectedAccounts(
            didChain,
            genericAccountChain
          )
        ).isSome
      ).toBe(true)
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
      const { owner } = Did.web3NameOwnerFromChain(
        await api.query.web3Names.owner('test-name')
      )
      expect(owner).toStrictEqual(did.uri)
      // Check that it is possible to retrieve the web3 name from the account linked to the DID
      expect(await Did.fetchWeb3Name(genericAccount.address)).toStrictEqual(
        'test-name'
      )
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
      expect(
        (await api.query.didLookup.connectedDids(paymentAccountChain)).isNone
      ).toBe(true)
      expect(
        (await api.query.didLookup.connectedDids(genericAccountChain)).isNone
      ).toBe(true)
      expect(
        await api.query.didLookup.connectedAccounts.keys(newDidChain)
      ).toStrictEqual([])
      expect(
        (
          await api.query.didLookup.connectedAccounts(
            didChain,
            paymentAccountChain
          )
        ).isNone
      ).toBe(true)
      expect(
        (
          await api.query.didLookup.connectedAccounts(
            didChain,
            genericAccountChain
          )
        ).isNone
      ).toBe(true)
    })
  })
})

afterAll(disconnect)
