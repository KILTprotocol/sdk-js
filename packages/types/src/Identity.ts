/**
 * @packageDocumentation
 * @module IIdentity
 */
import type { KeyringPair } from '@polkadot/keyring/types'
import type { SubmittableExtrinsic } from '@polkadot/api/promise/types'
import type { BoxKeyPair } from 'tweetnacl'
import type BN from 'bn.js'
import type { Index } from '@polkadot/types/interfaces'

export interface IIdentity {
  readonly signKeyringPair: KeyringPair
  readonly seed: Uint8Array
  readonly seedAsHex: string
  readonly signPublicKeyAsHex: string
  readonly boxKeyPair: BoxKeyPair
  address: KeyringPair['address']
  serviceAddress?: string
  signSubmittableExtrinsic(
    submittableExtrinsic: SubmittableExtrinsic,
    nonce: number | Index | BN
  ): Promise<SubmittableExtrinsic>
}
