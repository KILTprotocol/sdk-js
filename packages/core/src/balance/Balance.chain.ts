/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * Balance provides the accounts and balances of the KILT protocol.
 *
 *  * Checking Balances between accounts
 *  * Transfer of assets between accounts.
 *
 * @packageDocumentation
 */

import type { UnsubscribePromise } from '@polkadot/api/types'
import { BN } from '@polkadot/util'
import type {
  Balances,
  KeyringPair,
  SubmittableExtrinsic,
} from '@kiltprotocol/types'
import { BlockchainApiConnection } from '@kiltprotocol/chain-helpers'
import * as BalanceUtils from './Balance.utils.js'

/**
 * Fetches the current balances of the account with [accountAddress].
 * <B>Note that the balance amounts are in Femto-Kilt (1e-15)and must be translated to Kilt-Coin</B>.
 *
 * @param accountAddress Address of the account for which to get the balances.
 * @returns A promise containing the current balances of the account.
 */
export async function getBalances(
  accountAddress: KeyringPair['address']
): Promise<Balances> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()

  return (await blockchain.api.query.system.account(accountAddress)).data
}

/**
 * Attaches the given [listener] for balance changes on the account with [accountAddress].
 * <B>Note that the balance amounts are in Femto-Kilt (1e-15) and must be translated to Kilt-Coin</B>.
 *
 * @param accountAddress Address of the account on which to listen for all balance changes.
 * @param listener Listener to receive all balance change updates.
 * @returns A promise containing a function that let's you unsubscribe from all balance changes.
 */
export async function listenToBalanceChanges(
  accountAddress: KeyringPair['address'],
  listener: (
    account: KeyringPair['address'],
    balances: Balances,
    changes: Balances
  ) => void
): Promise<UnsubscribePromise> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  let previousBalances = await getBalances(accountAddress)

  return blockchain.api.query.system.account(
    accountAddress,
    ({ data: { free, reserved, miscFrozen, feeFrozen } }) => {
      const balancesChange = {
        free: free.sub(previousBalances.free),
        reserved: reserved.sub(previousBalances.reserved),
        miscFrozen: miscFrozen.sub(previousBalances.miscFrozen),
        feeFrozen: feeFrozen.sub(previousBalances.feeFrozen),
      }

      const current = {
        free: new BN(free),
        reserved: new BN(reserved),
        miscFrozen: new BN(miscFrozen),
        feeFrozen: new BN(feeFrozen),
      }
      previousBalances = current

      listener(accountAddress, current, balancesChange)
    }
  )
}

/**
 * Transfer Kilt [amount] tokens to [toAccountAddress].
 * <B>Note that the value of the transferred currency and the balance amount reported by the chain is in Femto-Kilt (1e-15), and must be translated to Kilt-Coin</B>.
 *
 * @param accountAddressTo Address of the receiver account.
 * @param amount Amount of Units to transfer.
 * @param exponent Magnitude of the amount. Default magnitude of -15 represents Femto-Kilt. Use 0 for KILT.
 * @returns Promise containing unsigned SubmittableExtrinsic.
 */
export async function getTransferTx(
  accountAddressTo: KeyringPair['address'],
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
  return transfer
}
