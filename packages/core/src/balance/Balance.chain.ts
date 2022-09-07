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

import type { Balances, KeyringPair } from '@kiltprotocol/types'
import { ConfigService } from '@kiltprotocol/config'
import { SDKErrors } from '@kiltprotocol/utils'

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
  const api = ConfigService.get('api')

  return (await api.query.system.account(accountAddress)).data
}

/**
 * Attaches the given [listener] for balance changes on the account with [accountAddress].
 * <B>Note that the balance amounts are in Femto-Kilt (1e-15) and must be translated to Kilt-Coin</B>.
 *
 * @param accountAddress Address of the account on which to listen for all balance changes.
 * @param listener Listener to receive all balance change updates.
 * @returns A promise containing a function that lets you unsubscribe from all balance changes.
 */
export async function listenToBalanceChanges(
  accountAddress: KeyringPair['address'],
  listener: (
    account: KeyringPair['address'],
    balances: Balances,
    changes: Balances
  ) => void
): Promise<UnsubscribePromise> {
  const api = ConfigService.get('api')
  if (!api.hasSubscriptions) {
    throw new SDKErrors.SubscriptionsNotSupportedError()
  }

  let previousBalances = await getBalances(accountAddress)

  return api.query.system.account(
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
