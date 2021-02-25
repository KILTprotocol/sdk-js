/**
 * @packageDocumentation
 * @module IIdentity
 */
import { KeyringPair } from '@polkadot/keyring/types'
import { SubmittableExtrinsic } from '@polkadot/api/promise/types'
import { BoxKeyPair } from 'tweetnacl'
import BN from 'bn.js'
import { Index } from '@polkadot/types/interfaces'

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
