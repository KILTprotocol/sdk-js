/**
 * Balance provides the accounts and balances of the KILT protocol.
 *
 *  * Checking Balances between accounts
 *  * Transfer of assets between accounts.
 *
 * @packageDocumentation
 * @module Balance
 * @preferred
 */

import { SubmittableExtrinsic } from '@polkadot/api/promise/types'
import { UnsubscribePromise } from '@polkadot/api/types'
import BN from 'bn.js'
import { IPublicIdentity } from '@kiltprotocol/types'
import { blockchainApiConnection } from '@kiltprotocol/chain-helpers'
import Identity from '../identity/Identity'
import BalanceUtils from './Balance.utils'

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
 * import * as sdk from '@kiltprotocol/prototype-sdk';
 *
 * const address = ...
 * sdk.Balance.getBalance(address)
 *   .then((balance: BN) => {
 *     console.log(`balance is ${balance.toNumber()}`)
 *   })
 * ```
 */
export async function getBalance(
  accountAddress: IPublicIdentity['address']
): Promise<BN> {
  const blockchain = await blockchainApiConnection.getCached()
  return (await blockchain.api.query.system.account(accountAddress)).data.free
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
 * import * as sdk from '@kiltprotocol/prototype-sdk';
 *
 * const address = ...
 * const unsubscribe = sdk.Balance.listenToBalanceChanges(address,
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
    balance: BN,
    change: BN
  ) => void
): Promise<UnsubscribePromise> {
  const blockchain = await blockchainApiConnection.getCached()
  let previous = await getBalance(accountAddress)

  return blockchain.api.query.system.account(
    accountAddress,
    ({ data: { free: current } }) => {
      const change = current.sub(previous)
      previous = current
      listener(accountAddress, current, change)
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
 * import * as sdk from '@kiltprotocol/prototype-sdk';
 *
 * const identity = ...
 * const address = ...
 * const amount: BN = new BN(42)
 * const blockchain = await sdk.getCached()
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
  const blockchain = await blockchainApiConnection.getCached()
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
