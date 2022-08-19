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
  DidDetails,
  KeyringPair,
  KiltKeyringPair,
} from '@kiltprotocol/types'
import { Keyring } from '@polkadot/keyring'
import { BN, u8aToHex } from '@polkadot/util'
import { mnemonicGenerate } from '@polkadot/util-crypto'
import type { KeypairType } from '@polkadot/util-crypto/types'
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
let keyring: Keyring
let signingCallback: AccountLinks.LinkingSignerCallback

beforeAll(async () => {
  await initializeApi()
  paymentAccount = await createEndowedTestAccount()
  linkDeposit = await AccountLinks.queryDepositAmount()
  keyring = new Keyring({ ss58Format })
  signingCallback = AccountLinks.defaultSignerCallback(keyring)
}, 40_000)

describe('When there is an on-chain DID', () => {
  let did: DidDetails
  let didKey: KeyTool
  let newDid: DidDetails
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
        await AccountLinks.queryConnectedAccountsForDid(did.identifier)
      ).toStrictEqual([])
      expect(
        await AccountLinks.queryIsConnected(
          did.identifier,
          paymentAccount.address
        )
      ).toBe(false)

      const associateSenderTx = await AccountLinks.getAssociateSenderExtrinsic()
      const signedTx = await Did.authorizeExtrinsic(
        did,
        associateSenderTx,
        didKey.sign,
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
      ).toStrictEqual(did.identifier)
      expect(
        await AccountLinks.queryConnectedAccountsForDid(
          did.identifier,
          ss58Format
        )
      ).toStrictEqual([paymentAccount.address])
      expect(
        await AccountLinks.queryIsConnected(
          did.identifier,
          paymentAccount.address
        )
      ).toBe(true)
    }, 30_000)
    it('should be possible to associate the tx sender to a new DID', async () => {
      const associateSenderTx = await AccountLinks.getAssociateSenderExtrinsic()
      const signedTx = await Did.authorizeExtrinsic(
        newDid,
        associateSenderTx,
        newDidKey.sign,
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
      ).toStrictEqual(newDid.identifier)
      // Check that old DID has no accounts linked
      expect(
        await AccountLinks.queryConnectedAccountsForDid(did.identifier)
      ).toStrictEqual([])
      expect(
        await AccountLinks.queryIsConnected(
          did.identifier,
          paymentAccount.address
        )
      ).toBe(false)
      // Check that new DID has the account linked
      expect(
        await AccountLinks.queryConnectedAccountsForDid(
          newDid.identifier,
          ss58Format
        )
      ).toStrictEqual([paymentAccount.address])
      expect(
        await AccountLinks.queryIsConnected(
          newDid.identifier,
          paymentAccount.address
        )
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
        await AccountLinks.queryConnectedAccountsForDid(did.identifier)
      ).toStrictEqual([])
      expect(
        await AccountLinks.queryIsConnected(
          did.identifier,
          paymentAccount.address
        )
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
        keypair = keyring.addFromMnemonic(
          mnemonicGenerate(),
          undefined,
          keyType as KeypairType
        )
        didKey = makeSigningKeyTool()
        newDidKey = makeSigningKeyTool()
        did = await createFullDidFromSeed(paymentAccount, didKey.keypair)
        newDid = await createFullDidFromSeed(paymentAccount, newDidKey.keypair)
      }, 40_000)

      it('should be possible to associate the account while the sender pays the deposit', async () => {
        const linkAuthorization =
          await AccountLinks.getAuthorizeLinkWithAccountExtrinsic(
            keypair.address,
            did.identifier,
            signingCallback
          )
        const signedTx = await Did.authorizeExtrinsic(
          did,
          linkAuthorization,
          didKey.sign,
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
        ).toStrictEqual(did.identifier)
        expect(
          await AccountLinks.queryConnectedDidForAccount(paymentAccount.address)
        ).toBeNull()
        expect(
          await AccountLinks.queryConnectedAccountsForDid(
            did.identifier,
            ss58Format
          )
        ).toStrictEqual([keypair.address])
        expect(
          await AccountLinks.queryIsConnected(
            did.identifier,
            paymentAccount.address
          )
        ).toBe(false)
        expect(
          await AccountLinks.queryIsConnected(did.identifier, keypair.address)
        ).toBe(true)
      })
      it('should be possible to associate the account to a new DID while the sender pays the deposit', async () => {
        const linkAuthorization =
          await AccountLinks.getAuthorizeLinkWithAccountExtrinsic(
            keypair.address,
            newDid.identifier,
            signingCallback
          )
        const signedTx = await Did.authorizeExtrinsic(
          newDid,
          linkAuthorization,
          newDidKey.sign,
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
        ).toStrictEqual(newDid.identifier)
        expect(
          await AccountLinks.queryConnectedAccountsForDid(did.identifier)
        ).toStrictEqual([])
        expect(
          await AccountLinks.queryIsConnected(
            did.identifier,
            paymentAccount.address
          )
        ).toBe(false)
        expect(
          await AccountLinks.queryIsConnected(did.identifier, keypair.address)
        ).toBe(false)
        // Check that new DID has the account linked
        expect(
          await AccountLinks.queryConnectedAccountsForDid(
            newDid.identifier,
            ss58Format
          )
        ).toStrictEqual([keypair.address])
        expect(
          await AccountLinks.queryIsConnected(
            newDid.identifier,
            paymentAccount.address
          )
        ).toBe(false)
        expect(
          await AccountLinks.queryIsConnected(
            newDid.identifier,
            keypair.address
          )
        ).toBe(true)
      })
      it('should be possible for the DID to remove the link', async () => {
        const removeLinkTx = await AccountLinks.getLinkRemovalByDidExtrinsic(
          keypair.address
        )
        const signedTx = await Did.authorizeExtrinsic(
          newDid,
          removeLinkTx,
          newDidKey.sign,
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
          await AccountLinks.queryConnectedAccountsForDid(newDid.identifier)
        ).toStrictEqual([])
        expect(
          await AccountLinks.queryIsConnected(
            did.identifier,
            paymentAccount.address
          )
        ).toBe(false)
        expect(
          await AccountLinks.queryIsConnected(did.identifier, keypair.address)
        ).toBe(false)
      })
    }
  )

  describe('and a generic Ecdsa Substrate account different than the sender to link', () => {
    let genericAccount: KeyringPair
    beforeAll(async () => {
      const genericKeyring = new Keyring()
      // also testing that signing with type bitflag works, like the polkadot extension does it
      signingCallback = async (payload, address) =>
        u8aToHex(
          genericKeyring.getPair(address).sign(payload, { withType: true })
        )
      genericAccount = genericKeyring.addFromMnemonic(
        mnemonicGenerate(),
        undefined,
        'ecdsa'
      )
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
          did.identifier,
          signingCallback
        )
      const signedTx = await Did.authorizeExtrinsic(
        did,
        linkAuthorization,
        didKey.sign,
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
      ).toStrictEqual(did.identifier)
      expect(
        await AccountLinks.queryConnectedDidForAccount(paymentAccount.address)
      ).toBeNull()
      expect(
        // Wildcard substrate encoding. Account should match the generated one.
        await AccountLinks.queryConnectedAccountsForDid(did.identifier, 42)
      ).toStrictEqual([genericAccount.address])
      expect(
        await AccountLinks.queryIsConnected(
          did.identifier,
          paymentAccount.address
        )
      ).toBe(false)
      expect(
        await AccountLinks.queryIsConnected(
          did.identifier,
          genericAccount.address
        )
      ).toBe(true)
    })

    it('should be possible to add a Web3 name for the linked DID and retrieve it starting from the linked account', async () => {
      const web3NameClaimTx = await Web3Names.getClaimTx('test-name')
      const signedTx = await Did.authorizeExtrinsic(
        did,
        web3NameClaimTx,
        didKey.sign,
        paymentAccount.address
      )
      await submitExtrinsic(signedTx, paymentAccount)

      // Check that the Web3 name has been linked to the DID
      expect(
        await Web3Names.queryDidAddressForWeb3Name('test-name')
      ).toStrictEqual(did.identifier)
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
        await AccountLinks.queryConnectedAccountsForDid(newDid.identifier)
      ).toStrictEqual([])
      expect(
        await AccountLinks.queryIsConnected(
          did.identifier,
          paymentAccount.address
        )
      ).toBe(false)
      expect(
        await AccountLinks.queryIsConnected(
          did.identifier,
          genericAccount.address
        )
      ).toBe(false)
    })
  })
})

afterAll(disconnect)
