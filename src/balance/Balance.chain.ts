/**
 *  Balance provides the accounts and balances of the KILT protocol.
 * ***
 *  * Checking Balances between accounts
 *  * Transfer of assets between accounts
 *
 * @module Balance
 * @preferred
 */

/**
 * Dummy comment needed for correct doc display, do not remove
 */
import BN from 'bn.js'
import { Balance } from '@polkadot/types/interfaces'
import TxStatus from '../blockchain/TxStatus'
import { getCached } from '../blockchainApiConnection'
import Identity from '../identity/Identity'
import IPublicIdentity from '../types/PublicIdentity'

/**
 * @description Attaches the given [listener] for balance changes on the account with [accountAddress].
 * <B>Note that balance amount is in µ-Kilt and must be translated to Kilt-Coin</B>
 *
 * @param accountAddress address of the account on which to listen for balance changes.
 * @param listener listener to receive balance change updates
 * @returns a promise containing the current balance of the account
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
  let previous = await blockchain.api.query.balances.freeBalance<Balance>(
    accountAddress
  )

  if (listener) {
    blockchain.api.query.balances.freeBalance<Balance>(
      accountAddress,
      (current: Balance) => {
        const change = current.sub(previous)
        previous = current
        listener(accountAddress, current, change)
      }
    )
  }
  return previous
}

/**
 * @description Fetches the current balance of the account with [accountAddress].
 * <B>Note that balance amount is in µ-Kilt and must be translated to Kilt-Coin</B>
 *
 * @param accountAddress address of the account for which to get the balance.
 * @returns a promise containing the current balance of the account
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
 * @description Transfer Kilt [amount] tokens to [toAccountAddress] using the given [[Identity]].
 * <B>Note that balance amount is in µ-Kilt and must be translated to Kilt-Coin</B>
 *
 * @param identity identity to use for token transfer
 * @param accountAddressTo address of the receiver account
 * @param amount amount of µ-Kilt to transfer
 * @returns promise containing the transaction status
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
