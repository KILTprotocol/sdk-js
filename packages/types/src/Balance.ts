/**
 * @packageDocumentation
 * @module IBalance
 */

import BN from 'bn.js'

export type Balances = {
  free: BN
  reserved: BN
  miscFrozen: BN
  feeFrozen: BN
}
