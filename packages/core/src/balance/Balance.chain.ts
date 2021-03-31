/**
 * Balance provides the accounts and balances of the KILT protocol.
 *
 *  * Checking Balances between accounts
 *  * Transfer of assets between accounts.
 *
 * @packageDocumentation
 * @module Balance
 */

import { UnsubscribePromise } from '@polkadot/api/types'
import BN from 'bn.js'
import type { IPublicIdentity, SubmittableExtrinsic } from '@kiltprotocol/types'
import {
  BlockchainApiConnection,
  // BlockchainUtils,
} from '@kiltprotocol/chain-helpers'
import { AccountData } from '@polkadot/types/interfaces'

import Identity from '../identity/Identity'
import BalanceUtils from './Balance.utils'

export type Balance = {
  free: BN
  reserved: BN
  miscFrozen: BN
  feeFrozen: BN
}

/**
 * Fetches the current balance of the account with [accountAddress].
 * <B>Note that balance amount is in Femto-Kilt (1e-15)and must be translated to Kilt-Coin</B>.
 *
 * @param accountAddress Address of the account for which to get the balance.
 * @returns A promise containing the current balance of the account.
 *
 * @example
 * <BR>
 *
 * ```javascript
 *
 * const address = ...
 * sdk.Balance.getBalances(address)
 *   .then((balance: BN) => {
 *     console.log(`balance is ${balance.toNumber()}`)
 *   })
 * ```
 */
export async function getBalances(
  accountAddress: IPublicIdentity['address']
): Promise<AccountData> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()

  return (await blockchain.api.query.system.account(accountAddress)).data
}

/**
 * Attaches the given [listener] for balance changes on the account with [accountAddress].
 * <B>Note that balance amount is in Femto-Kilt (1e-15) and must be translated to Kilt-Coin</B>.
 *
 * @param accountAddress Address of the account on which to listen for balance changes.
 * @param listener Listener to receive balance change updates.
 * @returns A promise containing a function that let's you unsubscribe from balance changes.
 *
 * @example
 * <BR>
 *
 * ```javascript
 * const address = ...
 * const unsubscribe = await sdk.Balance.listenToBalanceChanges(address,
 *   (account: IPublicIdentity['address'], balance: BN, change: BN) => {
 *     console.log(`Balance has changed by ${change.toNumber()} to ${balance.toNumber()}`)
 *   });
 * // later
 * unsubscribe();
 * ```
 */
export async function listenToBalanceChanges(
  accountAddress: IPublicIdentity['address'],
  listener: (
    account: IPublicIdentity['address'],
    balance: Balance,
    change: Balance
  ) => void
): Promise<UnsubscribePromise> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  const previous = await getBalances(accountAddress)

  const previousFree = new BN(previous.free.toString())
  const previousReserved = new BN(previous.reserved.toString())
  const previousMiscFrozen = new BN(previous.miscFrozen.toString())
  const previousFeeFrozen = new BN(previous.feeFrozen.toString())

  return blockchain.api.query.system.account(
    accountAddress,
    ({ data: { free, reserved, miscFrozen, feeFrozen } }) => {
      const balanceChange = {
        free: free.sub(previousFree),
        reserved: reserved.sub(previousReserved),
        miscFrozen: miscFrozen.sub(previousMiscFrozen),
        feeFrozen: feeFrozen.sub(previousFeeFrozen),
      }
      const current = {
        free: new BN(free),
        reserved: new BN(reserved),
        miscFrozen: new BN(miscFrozen),
        feeFrozen: new BN(feeFrozen),
      }
      listener(accountAddress, current, balanceChange)
    }
  )
}

/**
 * Transfer Kilt [amount] tokens to [toAccountAddress] using the given [[Identity]].
 * <B>Note that the value of the transferred currency and the balance amount reported by the chain is in Femto-Kilt (1e-15), and must be translated to Kilt-Coin</B>.
 *
 * @param identity Identity to use for token transfer.
 * @param accountAddressTo Address of the receiver account.
 * @param amount Amount of Units to transfer.
 * @param exponent Magnitude of the amount. Default magnitude of Femto-Kilt.
 * @returns Promise containing the transaction status.
 *
 * @example
 * <BR>
 *
 * ```javascript
 * const identity = ...
 * const address = ...
 * const amount: BN = new BN(42)
 * const blockchain = await sdk.getConnectionOrConnect()
 * sdk.Balance.makeTransfer(identity, address, amount)
 *   .then(tx => blockchain.sendTx(tx))
 *   .then(() => console.log('Successfully transferred ${amount.toNumber()} tokens'))
 *   .catch(err => {
 *     console.log('Transfer failed')
 *   })
 * ```
 */
export async function makeTransfer(
  identity: Identity,
  accountAddressTo: IPublicIdentity['address'],
  amount: BN,
  exponent = -15
): Promise<SubmittableExtrinsic> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  const cleanExponent =
    (exponent >= 0 ? 1 : -1) * Math.floor(Math.abs(exponent))
  const transfer = blockchain.api.tx.balances.transfer(
    accountAddressTo,
    cleanExponent === -15
      ? amount
      : BalanceUtils.convertToTxUnit(amount, cleanExponent)
  )
  return blockchain.signTx(identity, transfer)
}
