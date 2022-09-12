/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group integration/accountLinking
 */

import { AccountLinks, Web3Names } from '@kiltprotocol/did'
import * as Did from '@kiltprotocol/did'
import {
  createFullDidFromSeed,
  KeyTool,
  makeSigningKeyTool,
} from '@kiltprotocol/testing'
import { ss58Format } from '@kiltprotocol/utils'
import type {
  DidDocument,
  KeyringPair,
  KiltKeyringPair,
} from '@kiltprotocol/types'
import { Keyring } from '@polkadot/keyring'
import { BN } from '@polkadot/util'
import { mnemonicGenerate } from '@polkadot/util-crypto'
import { Balance } from '../balance'
import { convertToTxUnit } from '../balance/Balance.utils'
import {
  createEndowedTestAccount,
  fundAccount,
  initializeApi,
  submitExtrinsic,
} from './utils'
import { disconnect } from '../kilt'

let paymentAccount: KiltKeyringPair
let linkDeposit: BN
let sign: AccountLinks.LinkingSignCallback

beforeAll(async () => {
  await initializeApi()
  paymentAccount = await createEndowedTestAccount()
  linkDeposit = await AccountLinks.queryDepositAmount()
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
        await AccountLinks.queryConnectedDidForAccount(paymentAccount.address)
      ).toBeNull()
      expect(
        await AccountLinks.queryConnectedAccountsForDid(did.uri)
      ).toStrictEqual([])
      expect(
        await AccountLinks.queryIsConnected(did.uri, paymentAccount.address)
      ).toBe(false)

      const associateSenderTx = await AccountLinks.getAssociateSenderExtrinsic()
      const signedTx = await Did.authorizeExtrinsic(
        did.uri,
        associateSenderTx,
        didKey.sign(did),
        paymentAccount.address
      )
      const balanceBefore = await Balance.getBalances(paymentAccount.address)
      await submitExtrinsic(signedTx, paymentAccount)

      // Check that the deposit has been taken from the sender's balance.
      const balanceAfter = await Balance.getBalances(paymentAccount.address)
      // Lookup reserve - deposit == 0
      expect(
        balanceAfter.reserved
          .sub(balanceBefore.reserved)
          .sub(linkDeposit)
          .toString()
      ).toMatchInlineSnapshot('"0"')
      // Check that the link has been created correctly
      expect(
        await AccountLinks.queryConnectedDidForAccount(paymentAccount.address)
      ).toStrictEqual(did.uri)
      expect(
        await AccountLinks.queryConnectedAccountsForDid(did.uri, ss58Format)
      ).toStrictEqual([paymentAccount.address])
      expect(
        await AccountLinks.queryIsConnected(did.uri, paymentAccount.address)
      ).toBe(true)
    }, 30_000)
    it('should be possible to associate the tx sender to a new DID', async () => {
      const associateSenderTx = await AccountLinks.getAssociateSenderExtrinsic()
      const signedTx = await Did.authorizeExtrinsic(
        newDid.uri,
        associateSenderTx,
        newDidKey.sign(newDid),
        paymentAccount.address
      )
      const balanceBefore = await Balance.getBalances(paymentAccount.address)
      await submitExtrinsic(signedTx, paymentAccount)

      // Reserve should not change when replacing the link
      const balanceAfter = await Balance.getBalances(paymentAccount.address)
      expect(
        balanceAfter.reserved.sub(balanceBefore.reserved).toString()
      ).toMatchInlineSnapshot('"0"')
      // Check that account is linked to new DID
      expect(
        await AccountLinks.queryConnectedDidForAccount(paymentAccount.address)
      ).toStrictEqual(newDid.uri)
      // Check that old DID has no accounts linked
      expect(
        await AccountLinks.queryConnectedAccountsForDid(did.uri)
      ).toStrictEqual([])
      expect(
        await AccountLinks.queryIsConnected(did.uri, paymentAccount.address)
      ).toBe(false)
      // Check that new DID has the account linked
      expect(
        await AccountLinks.queryConnectedAccountsForDid(newDid.uri, ss58Format)
      ).toStrictEqual([paymentAccount.address])
      expect(
        await AccountLinks.queryIsConnected(newDid.uri, paymentAccount.address)
      ).toBe(true)
    }, 30_000)
    it('should be possible for the sender to remove the link', async () => {
      const removeSenderTx = await AccountLinks.getLinkRemovalByAccountTx()
      const balanceBefore = await Balance.getBalances(paymentAccount.address)
      await submitExtrinsic(removeSenderTx, paymentAccount)

      // Check that the deposit has been returned to the sender's balance.
      const balanceAfter = await Balance.getBalances(paymentAccount.address)
      expect(
        balanceBefore.reserved.sub(balanceAfter.reserved).toString()
      ).toStrictEqual(linkDeposit.toString())
      expect(
        await AccountLinks.queryConnectedDidForAccount(paymentAccount.address)
      ).toBeNull()
      expect(
        await AccountLinks.queryConnectedAccountsForDid(did.uri)
      ).toStrictEqual([])
      expect(
        await AccountLinks.queryIsConnected(did.uri, paymentAccount.address)
      ).toBe(false)
    })
  })

  describe.each(['ed25519', 'sr25519', 'ecdsa', 'ethereum'])(
    'and an %s account different than the sender to link',
    (keyType) => {
      // TODO: remove this line to test against ethereum linking enabled chains
      const it = keyType === 'ethereum' ? test.skip : test

      let keypair: KeyringPair
      beforeAll(async () => {
        // TODO: remove this line to test against ethereum linking enabled chains
        if (keyType === 'ethereum') return

        const keyTool = makeSigningKeyTool(
          Did.Utils.signatureAlgForKeyType[keyType]
        )
        keypair = keyTool.keypair
        sign = AccountLinks.makeLinkingSignCallback(keypair)
        didKey = makeSigningKeyTool()
        newDidKey = makeSigningKeyTool()
        did = await createFullDidFromSeed(paymentAccount, didKey.keypair)
        newDid = await createFullDidFromSeed(paymentAccount, newDidKey.keypair)
      }, 40_000)

      it('should be possible to associate the account while the sender pays the deposit', async () => {
        const linkAuthorization =
          await AccountLinks.getAuthorizeLinkWithAccountExtrinsic(
            keypair.address,
            did.uri,
            sign
          )
        const signedTx = await Did.authorizeExtrinsic(
          did.uri,
          linkAuthorization,
          didKey.sign(did),
          paymentAccount.address
        )
        const balanceBefore = await Balance.getBalances(paymentAccount.address)
        await submitExtrinsic(signedTx, paymentAccount)

        // Check that the deposit has been taken from the sender's balance.
        const balanceAfter = await Balance.getBalances(paymentAccount.address)
        // Lookup reserve - deposit == 0
        expect(
          balanceAfter.reserved
            .sub(balanceBefore.reserved)
            .sub(linkDeposit)
            .toString()
        ).toMatchInlineSnapshot('"0"')
        expect(
          await AccountLinks.queryConnectedDidForAccount(keypair.address)
        ).toStrictEqual(did.uri)
        expect(
          await AccountLinks.queryConnectedDidForAccount(paymentAccount.address)
        ).toBeNull()
        expect(
          await AccountLinks.queryConnectedAccountsForDid(did.uri, ss58Format)
        ).toStrictEqual([keypair.address])
        expect(
          await AccountLinks.queryIsConnected(did.uri, paymentAccount.address)
        ).toBe(false)
        expect(
          await AccountLinks.queryIsConnected(did.uri, keypair.address)
        ).toBe(true)
      })
      it('should be possible to associate the account to a new DID while the sender pays the deposit', async () => {
        const linkAuthorization =
          await AccountLinks.getAuthorizeLinkWithAccountExtrinsic(
            keypair.address,
            newDid.uri,
            sign
          )
        const signedTx = await Did.authorizeExtrinsic(
          newDid.uri,
          linkAuthorization,
          newDidKey.sign(newDid),
          paymentAccount.address
        )
        const balanceBefore = await Balance.getBalances(paymentAccount.address)
        await submitExtrinsic(signedTx, paymentAccount)

        // Reserve should not change when replacing the link
        const balanceAfter = await Balance.getBalances(paymentAccount.address)
        expect(
          balanceAfter.reserved.sub(balanceBefore.reserved).toString()
        ).toMatchInlineSnapshot('"0"')
        expect(
          await AccountLinks.queryConnectedDidForAccount(paymentAccount.address)
        ).toBeNull()
        expect(
          await AccountLinks.queryConnectedDidForAccount(keypair.address)
        ).toStrictEqual(newDid.uri)
        expect(
          await AccountLinks.queryConnectedAccountsForDid(did.uri)
        ).toStrictEqual([])
        expect(
          await AccountLinks.queryIsConnected(did.uri, paymentAccount.address)
        ).toBe(false)
        expect(
          await AccountLinks.queryIsConnected(did.uri, keypair.address)
        ).toBe(false)
        // Check that new DID has the account linked
        expect(
          await AccountLinks.queryConnectedAccountsForDid(
            newDid.uri,
            ss58Format
          )
        ).toStrictEqual([keypair.address])
        expect(
          await AccountLinks.queryIsConnected(
            newDid.uri,
            paymentAccount.address
          )
        ).toBe(false)
        expect(
          await AccountLinks.queryIsConnected(newDid.uri, keypair.address)
        ).toBe(true)
      })
      it('should be possible for the DID to remove the link', async () => {
        const removeLinkTx = await AccountLinks.getLinkRemovalByDidExtrinsic(
          keypair.address
        )
        const signedTx = await Did.authorizeExtrinsic(
          newDid.uri,
          removeLinkTx,
          newDidKey.sign(newDid),
          paymentAccount.address
        )
        const balanceBefore = await Balance.getBalances(paymentAccount.address)
        await submitExtrinsic(signedTx, paymentAccount)

        // Check that the deposit has been returned to the sender's balance.
        const balanceAfter = await Balance.getBalances(paymentAccount.address)
        expect(
          balanceBefore.reserved.sub(balanceAfter.reserved).toString()
        ).toStrictEqual(linkDeposit.toString())
        // Check that the link has been removed completely
        expect(
          await AccountLinks.queryConnectedDidForAccount(paymentAccount.address)
        ).toBeNull()
        expect(
          await AccountLinks.queryConnectedDidForAccount(keypair.address)
        ).toBeNull()
        expect(
          await AccountLinks.queryConnectedAccountsForDid(newDid.uri)
        ).toStrictEqual([])
        expect(
          await AccountLinks.queryIsConnected(did.uri, paymentAccount.address)
        ).toBe(false)
        expect(
          await AccountLinks.queryIsConnected(did.uri, keypair.address)
        ).toBe(false)
      })
    }
  )

  describe('and a generic Ecdsa Substrate account different than the sender to link', () => {
    let genericAccount: KeyringPair
    beforeAll(async () => {
      genericAccount = new Keyring({ type: 'ecdsa' }).addFromMnemonic(
        mnemonicGenerate()
      )
      // also testing that signing with type bitflag works, like the polkadot extension does it
      sign = async (payload) => genericAccount.sign(payload, { withType: true })

      await fundAccount(genericAccount.address, convertToTxUnit(new BN(10), 1))
      didKey = makeSigningKeyTool()
      newDidKey = makeSigningKeyTool()
      did = await createFullDidFromSeed(paymentAccount, didKey.keypair)
      newDid = await createFullDidFromSeed(paymentAccount, newDidKey.keypair)
    }, 40_000)

    it('should be possible to associate the account while the sender pays the deposit', async () => {
      const linkAuthorization =
        await AccountLinks.getAuthorizeLinkWithAccountExtrinsic(
          genericAccount.address,
          did.uri,
          sign
        )
      const signedTx = await Did.authorizeExtrinsic(
        did.uri,
        linkAuthorization,
        didKey.sign(did),
        paymentAccount.address
      )
      const balanceBefore = await Balance.getBalances(paymentAccount.address)
      await submitExtrinsic(signedTx, paymentAccount)

      // Check that the deposit has been taken from the sender's balance.
      const balanceAfter = await Balance.getBalances(paymentAccount.address)
      // Lookup reserve - deposit == 0
      expect(
        balanceAfter.reserved
          .sub(balanceBefore.reserved)
          .sub(linkDeposit)
          .toString()
      ).toMatchInlineSnapshot('"0"')
      expect(
        await AccountLinks.queryConnectedDidForAccount(genericAccount.address)
      ).toStrictEqual(did.uri)
      expect(
        await AccountLinks.queryConnectedDidForAccount(paymentAccount.address)
      ).toBeNull()
      expect(
        // Wildcard substrate encoding. Account should match the generated one.
        await AccountLinks.queryConnectedAccountsForDid(did.uri, 42)
      ).toStrictEqual([genericAccount.address])
      expect(
        await AccountLinks.queryIsConnected(did.uri, paymentAccount.address)
      ).toBe(false)
      expect(
        await AccountLinks.queryIsConnected(did.uri, genericAccount.address)
      ).toBe(true)
    })

    it('should be possible to add a Web3 name for the linked DID and retrieve it starting from the linked account', async () => {
      const web3NameClaimTx = await Web3Names.getClaimTx('test-name')
      const signedTx = await Did.authorizeExtrinsic(
        did.uri,
        web3NameClaimTx,
        didKey.sign(did),
        paymentAccount.address
      )
      await submitExtrinsic(signedTx, paymentAccount)

      // Check that the Web3 name has been linked to the DID
      expect(await Web3Names.queryDidForWeb3Name('test-name')).toStrictEqual(
        did.uri
      )
      // Check that it is possible to retrieve the web3 name from the account linked to the DID
      expect(
        await AccountLinks.queryWeb3Name(genericAccount.address)
      ).toStrictEqual('test-name')
    })

    it('should be possible for the sender to remove the link', async () => {
      // No need for DID-authorizing this.
      const reclaimDepositTx = await AccountLinks.getLinkRemovalByAccountTx()
      const balanceBefore = await Balance.getBalances(paymentAccount.address)
      await submitExtrinsic(reclaimDepositTx, genericAccount)

      // Check that the deposit has been returned to the sender's balance.
      const balanceAfter = await Balance.getBalances(paymentAccount.address)
      expect(
        balanceBefore.reserved.sub(balanceAfter.reserved).toString()
      ).toStrictEqual(linkDeposit.toString())
      // Check that the link has been removed completely
      expect(
        await AccountLinks.queryConnectedDidForAccount(paymentAccount.address)
      ).toBeNull()
      expect(
        await AccountLinks.queryConnectedDidForAccount(genericAccount.address)
      ).toBeNull()
      expect(
        await AccountLinks.queryConnectedAccountsForDid(newDid.uri)
      ).toStrictEqual([])
      expect(
        await AccountLinks.queryIsConnected(did.uri, paymentAccount.address)
      ).toBe(false)
      expect(
        await AccountLinks.queryIsConnected(did.uri, genericAccount.address)
      ).toBe(false)
    })
  })
})

afterAll(disconnect)
