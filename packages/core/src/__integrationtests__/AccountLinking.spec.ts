/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group integration/accountLinking
 */

import {
  AccountLinks,
  DemoKeystore,
  FullDidDetails,
  Web3Names,
} from '@kiltprotocol/did'
import type { KeyringPair } from '@kiltprotocol/types'
import { Keyring } from '@polkadot/keyring'
import { BN, u8aToHex } from '@polkadot/util'
import { mnemonicGenerate, randomAsHex } from '@polkadot/util-crypto'
import type { KeypairType } from '@polkadot/util-crypto/types'
import { Balance } from '../balance'
import { convertToTxUnit } from '../balance/Balance.utils'
import {
  createEndowedTestAccount,
  createFullDidFromSeed,
  fundAccount,
  initializeApi,
  submitExtrinsicWithResign,
} from './utils'
import { disconnect } from '../kilt'

let paymentAccount: KeyringPair
let keystore: DemoKeystore
let linkDeposit: BN
let keyring: Keyring
let signingCallback: AccountLinks.LinkingSignerCallback

beforeAll(async () => {
  await initializeApi()
  paymentAccount = await createEndowedTestAccount()
  keystore = new DemoKeystore()
  linkDeposit = await AccountLinks.queryDepositAmount()
  keyring = new Keyring({ ss58Format: 38 })
  signingCallback = AccountLinks.defaultSignerCallback(keyring)
}, 40_000)

describe('When there is an on-chain DID', () => {
  let did: FullDidDetails
  let newDid: FullDidDetails

  describe('and a tx sender willing to link its account', () => {
    beforeAll(async () => {
      ;[did, newDid] = await Promise.all([
        createFullDidFromSeed(paymentAccount, keystore, randomAsHex(32)),
        createFullDidFromSeed(paymentAccount, keystore, randomAsHex(32)),
      ])
    }, 40_000)
    it('should be possible to associate the tx sender', async () => {
      // Check that no links exist
      await expect(
        AccountLinks.queryConnectedDidForAccount(paymentAccount.address)
      ).resolves.toBeNull()
      await expect(
        AccountLinks.queryConnectedAccountsForDid(did.identifier)
      ).resolves.toStrictEqual([])
      await expect(
        AccountLinks.queryIsConnected(did.identifier, paymentAccount.address)
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
      // Check that the link has been created correctly
      await expect(
        AccountLinks.queryConnectedDidForAccount(paymentAccount.address)
      ).resolves.toStrictEqual(did.identifier)
      await expect(
        AccountLinks.queryConnectedAccountsForDid(did.identifier, 38)
      ).resolves.toStrictEqual([paymentAccount.address])
      await expect(
        AccountLinks.queryIsConnected(did.identifier, paymentAccount.address)
      ).resolves.toBeTruthy()
    }, 30_000)
    it('should be possible to associate the tx sender to a new DID', async () => {
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
      // Reserve should not change when replacing the link
      const balanceAfter = await Balance.getBalances(paymentAccount.address)
      expect(
        balanceAfter.reserved.sub(balanceBefore.reserved).toString()
      ).toMatchInlineSnapshot('"0"')
      // Check that account is linked to new DID
      await expect(
        AccountLinks.queryConnectedDidForAccount(paymentAccount.address)
      ).resolves.toStrictEqual(newDid.identifier)
      // Check that old DID has no accounts linked
      await expect(
        AccountLinks.queryConnectedAccountsForDid(did.identifier)
      ).resolves.toStrictEqual([])
      await expect(
        AccountLinks.queryIsConnected(did.identifier, paymentAccount.address)
      ).resolves.toBeFalsy()
      // Check that new DID has the account linked
      await expect(
        AccountLinks.queryConnectedAccountsForDid(newDid.identifier, 38)
      ).resolves.toStrictEqual([paymentAccount.address])
      await expect(
        AccountLinks.queryIsConnected(newDid.identifier, paymentAccount.address)
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
      // Check that the deposit has been returned to the sender's balance.
      const balanceAfter = await Balance.getBalances(paymentAccount.address)
      expect(
        balanceBefore.reserved.sub(balanceAfter.reserved).toString()
      ).toStrictEqual(linkDeposit.toString())
      await expect(
        AccountLinks.queryConnectedDidForAccount(paymentAccount.address)
      ).resolves.toBeNull()
      await expect(
        AccountLinks.queryConnectedAccountsForDid(did.identifier)
      ).resolves.toStrictEqual([])
      await expect(
        AccountLinks.queryIsConnected(did.identifier, paymentAccount.address)
      ).resolves.toBeFalsy()
    })
  })

  describe.each(['ed25519', 'sr25519', 'ecdsa'])(
    'and an %s account different than the sender to link',
    (keytype) => {
      let keypair: KeyringPair
      beforeAll(async () => {
        keypair = keyring.addFromMnemonic(
          mnemonicGenerate(),
          undefined,
          keytype as KeypairType
        )
        ;[did, newDid] = await Promise.all([
          createFullDidFromSeed(paymentAccount, keystore, randomAsHex(32)),
          createFullDidFromSeed(paymentAccount, keystore, randomAsHex(32)),
        ])
      }, 40_000)

      it('should be possible to associate the account while the sender pays the deposit', async () => {
        const linkAuthorisation = await AccountLinks.authorizeLinkWithAccount(
          keypair.address,
          did.identifier,
          signingCallback
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
        // Lookup reserve - deposit == 0
        expect(
          balanceAfter.reserved
            .sub(balanceBefore.reserved)
            .sub(linkDeposit)
            .toString()
        ).toMatchInlineSnapshot('"0"')
        await expect(
          AccountLinks.queryConnectedDidForAccount(keypair.address)
        ).resolves.toStrictEqual(did.identifier)
        await expect(
          AccountLinks.queryConnectedDidForAccount(paymentAccount.address)
        ).resolves.toBeNull()
        await expect(
          AccountLinks.queryConnectedAccountsForDid(did.identifier, 38)
        ).resolves.toStrictEqual([keypair.address])
        await expect(
          AccountLinks.queryIsConnected(did.identifier, paymentAccount.address)
        ).resolves.toBeFalsy()
        await expect(
          AccountLinks.queryIsConnected(did.identifier, keypair.address)
        ).resolves.toBeTruthy()
      })
      it('should be possible to associate the account to a new DID while the sender pays the deposit', async () => {
        const linkAuthorisation = await AccountLinks.authorizeLinkWithAccount(
          keypair.address,
          newDid.identifier,
          signingCallback
        )
        const signedTx = await newDid.authorizeExtrinsic(
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
        // Reserve should not change when replacing the link
        const balanceAfter = await Balance.getBalances(paymentAccount.address)
        expect(
          balanceAfter.reserved.sub(balanceBefore.reserved).toString()
        ).toMatchInlineSnapshot('"0"')
        await expect(
          AccountLinks.queryConnectedDidForAccount(paymentAccount.address)
        ).resolves.toBeNull()
        await expect(
          AccountLinks.queryConnectedDidForAccount(keypair.address)
        ).resolves.toStrictEqual(newDid.identifier)
        await expect(
          AccountLinks.queryConnectedAccountsForDid(did.identifier)
        ).resolves.toStrictEqual([])
        await expect(
          AccountLinks.queryIsConnected(did.identifier, paymentAccount.address)
        ).resolves.toBeFalsy()
        await expect(
          AccountLinks.queryIsConnected(did.identifier, keypair.address)
        ).resolves.toBeFalsy()
        // Check that new DID has the account linked
        await expect(
          AccountLinks.queryConnectedAccountsForDid(newDid.identifier, 38)
        ).resolves.toStrictEqual([keypair.address])
        await expect(
          AccountLinks.queryIsConnected(
            newDid.identifier,
            paymentAccount.address
          )
        ).resolves.toBeFalsy()
        await expect(
          AccountLinks.queryIsConnected(newDid.identifier, keypair.address)
        ).resolves.toBeTruthy()
      })
      it('should be possible for the DID to remove the link', async () => {
        const removeLinkTx = await AccountLinks.getLinkRemovalByDidTx(
          keypair.address
        )
        const signedTx = await newDid.authorizeExtrinsic(
          removeLinkTx,
          keystore,
          paymentAccount.address
        )
        const balanceBefore = await Balance.getBalances(paymentAccount.address)
        const submissionPromise = submitExtrinsicWithResign(
          signedTx,
          paymentAccount
        )
        await expect(submissionPromise).resolves.not.toThrow()
        // Check that the deposit has been returned to the sender's balance.
        const balanceAfter = await Balance.getBalances(paymentAccount.address)
        expect(
          balanceBefore.reserved.sub(balanceAfter.reserved).toString()
        ).toStrictEqual(linkDeposit.toString())
        // Check that the link has been removed completely
        await expect(
          AccountLinks.queryConnectedDidForAccount(paymentAccount.address)
        ).resolves.toBeNull()
        await expect(
          AccountLinks.queryConnectedDidForAccount(keypair.address)
        ).resolves.toBeNull()
        await expect(
          AccountLinks.queryConnectedAccountsForDid(newDid.identifier)
        ).resolves.toStrictEqual([])
        await expect(
          AccountLinks.queryIsConnected(did.identifier, paymentAccount.address)
        ).resolves.toBeFalsy()
        await expect(
          AccountLinks.queryIsConnected(did.identifier, keypair.address)
        ).resolves.toBeFalsy()
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
      ;[did, newDid] = await Promise.all([
        createFullDidFromSeed(paymentAccount, keystore, randomAsHex(32)),
        createFullDidFromSeed(paymentAccount, keystore, randomAsHex(32)),
      ])
    }, 40_000)

    it('should be possible to associate the account while the sender pays the deposit', async () => {
      const linkAuthorisation = await AccountLinks.authorizeLinkWithAccount(
        genericAccount.address,
        did.identifier,
        signingCallback
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
      // Lookup reserve - deposit == 0
      expect(
        balanceAfter.reserved
          .sub(balanceBefore.reserved)
          .sub(linkDeposit)
          .toString()
      ).toMatchInlineSnapshot('"0"')
      await expect(
        AccountLinks.queryConnectedDidForAccount(genericAccount.address)
      ).resolves.toStrictEqual(did.identifier)
      await expect(
        AccountLinks.queryConnectedDidForAccount(paymentAccount.address)
      ).resolves.toBeNull()
      await expect(
        // Wildcard substrate encoding. Account should match the generated one.
        AccountLinks.queryConnectedAccountsForDid(did.identifier, 42)
      ).resolves.toStrictEqual([genericAccount.address])
      await expect(
        AccountLinks.queryIsConnected(did.identifier, paymentAccount.address)
      ).resolves.toBeFalsy()
      await expect(
        AccountLinks.queryIsConnected(did.identifier, genericAccount.address)
      ).resolves.toBeTruthy()
    })

    it('should be possible to add a Web3 name for the linked DID and retrieve it starting from the linked account', async () => {
      const web3NameClaimTx = await Web3Names.getClaimTx('test-name')
      const signedTx = await did.authorizeExtrinsic(
        web3NameClaimTx,
        keystore,
        paymentAccount.address
      )
      const submissionPromise = submitExtrinsicWithResign(
        signedTx,
        paymentAccount
      )
      await expect(submissionPromise).resolves.not.toThrow()
      // Check that the Web3 name has been linked to the DID
      await expect(
        Web3Names.queryDidIdentifierForWeb3Name('test-name')
      ).resolves.toStrictEqual(did.identifier)
      // Check that it is possible to retrieve the web3 name from the account linked to the DID
      await expect(
        AccountLinks.queryWeb3Name(genericAccount.address)
      ).resolves.toStrictEqual('test-name')
    })

    it('should be possible for the sender to remove the link', async () => {
      // No need for DID-authorizing this.
      const reclaimDepositTx = await AccountLinks.getLinkRemovalByAccountTx()
      const balanceBefore = await Balance.getBalances(paymentAccount.address)
      const submissionPromise = submitExtrinsicWithResign(
        reclaimDepositTx,
        genericAccount
      )
      await expect(submissionPromise).resolves.not.toThrow()
      // Check that the deposit has been returned to the sender's balance.
      const balanceAfter = await Balance.getBalances(paymentAccount.address)
      expect(
        balanceBefore.reserved.sub(balanceAfter.reserved).toString()
      ).toStrictEqual(linkDeposit.toString())
      // Check that the link has been removed completely
      await expect(
        AccountLinks.queryConnectedDidForAccount(paymentAccount.address)
      ).resolves.toBeNull()
      await expect(
        AccountLinks.queryConnectedDidForAccount(genericAccount.address)
      ).resolves.toBeNull()
      await expect(
        AccountLinks.queryConnectedAccountsForDid(newDid.identifier)
      ).resolves.toStrictEqual([])
      await expect(
        AccountLinks.queryIsConnected(did.identifier, paymentAccount.address)
      ).resolves.toBeFalsy()
      await expect(
        AccountLinks.queryIsConnected(did.identifier, genericAccount.address)
      ).resolves.toBeFalsy()
    })
  })
})

afterAll(disconnect)
