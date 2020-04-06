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
import TxStatus from '../blockchain/TxStatus'
import { getCached } from '../blockchainApiConnection'
import Identity from '../identity/Identity'
import IPublicIdentity from '../types/PublicIdentity'

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
 * sdk.Balance.listenToBalanceChanges(address,
 *   (account: IPublicIdentity['address'], balance: BN, change: BN) => {
 *     console.log(`Balance has changed by ${change.toNumber()} to ${balance.toNumber()}`)
 *   });
 * ```
 */
export async function listenToBalanceChanges(
  accountAddress: IPublicIdentity['address'],
  listener?: (
    account: IPublicIdentity['address'],
    balance: BN,
    change: BN
  ) => void
): Promise<BN> {
  const blockchain = await getCached()
  const { data: accountInfo } = await blockchain.api.query.system.account(
    accountAddress
  )
  let previous = accountInfo.free

  if (listener) {
    blockchain.api.query.system.account(
      accountAddress,
      ({ data: currentData }) => {
        const current = currentData.free
        const change = current.sub(previous)
        previous = current
        listener(accountAddress, current, change)
      }
    )
  }
  return previous
}

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
  return listenToBalanceChanges(accountAddress)
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
 *   .then((status: TxStatus) => {
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
): Promise<TxStatus> {
  const blockchain = await getCached()
  const transfer = blockchain.api.tx.balances.transfer(accountAddressTo, amount)
  return blockchain.submitTx(identity, transfer)
}
