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

import BN from 'bn.js'
import { Balance } from '@polkadot/types/interfaces'
import { SubmittableResult } from '@polkadot/api'
import { getCached } from '../blockchainApiConnection'
import Identity from '../identity/Identity'
import IPublicIdentity from '../types/PublicIdentity'

export type UnsubscribeHandle = () => void

/**
 * Fetches the current balance of the account with [accountAddress].
 * <B>Note that balance amount is in µ-Kilt and must be translated to Kilt-Coin</B>.
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
  const blockchain = await getCached()
  return blockchain.api.query.balances.freeBalance<Balance>(accountAddress)
}

/**
 * Attaches the given [listener] for balance changes on the account with [accountAddress].
 * <B>Note that balance amount is in µ-Kilt and must be translated to Kilt-Coin</B>.
 *
 * @param accountAddress Address of the account on which to listen for balance changes.
 * @param listener Listener to receive balance change updates.
 * @returns A promise containing the current balance of the account.
 *
 * @example
 * <BR>
 *
 * ```javascript
 * import * as sdk from '@kiltprotocol/prototype-sdk';
 *
 * const address = ...
 * const unsub = sdk.Balance.listenToBalanceChanges(address,
 *   (account: IPublicIdentity['address'], balance: BN, change: BN) => {
 *     console.log(`Balance has changed by ${change.toNumber()} to ${balance.toNumber()}`)
 *   });
 * // later
 * unsub();
 * ```
 */
export async function listenToBalanceChanges(
  accountAddress: IPublicIdentity['address'],
  listener: (
    account: IPublicIdentity['address'],
    balance: BN,
    change: BN
  ) => void
): Promise<UnsubscribeHandle> {
  const blockchain = await getCached()
  let previous = await getBalance(accountAddress)
  return blockchain.api.query.balances.freeBalance<Balance>(
    accountAddress,
    (current: Balance) => {
      const change = current.sub(previous)
      previous = current
      listener(accountAddress, current, change)
    }
  )
}

/**
 * Transfer Kilt [amount] tokens to [toAccountAddress] using the given [[Identity]].
 * <B>Note that balance amount is in µ-Kilt and must be translated to Kilt-Coin</B>.
 *
 * @param identity Identity to use for token transfer.
 * @param accountAddressTo Address of the receiver account.
 * @param amount Amount of µ-Kilt to transfer.
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
 * sdk.Balance.makeTransfer(identity, address, amount)
 *   .then((status: SubmittableResult) => {
 *     console.log('Successfully transferred ${amount.toNumber()} tokens')
 *   })
 *   .catch(err => {
 *     console.log('Transfer failed')
 *   })
 * ```
 */
export async function makeTransfer(
  identity: Identity,
  accountAddressTo: IPublicIdentity['address'],
  amount: BN
): Promise<SubmittableResult> {
  const blockchain = await getCached()
  const transfer = blockchain.api.tx.balances.transfer(accountAddressTo, amount)
  return blockchain.submitTx(identity, transfer)
}
