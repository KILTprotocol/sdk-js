/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { ApiPromise } from '@polkadot/api'

import type {
  DidKey,
  IIdentity,
  KeystoreSigner,
  SubmittableExtrinsic,
} from '@kiltprotocol/types'

import { generateCreateTxFromDidDetails } from '../Did.chain.js'

import type { FullDidBuilderCreationDetails } from './FullDidBuilder.js'
import { FullDidBuilder } from './FullDidBuilder.js'

export type FullDidCreationBuilderCreationDetails =
  FullDidBuilderCreationDetails & { authenticationKey: DidKey }

export class FullDidCreationBuilder extends FullDidBuilder {
  private authenticationKey: DidKey

  public constructor(
    api: ApiPromise,
    details: FullDidCreationBuilderCreationDetails
  ) {
    super(api, details)
    this.authenticationKey = details.authenticationKey
  }

  // eslint-disable-next-line class-methods-use-this
  public async build(
    submitter: IIdentity['address'],
    keystore: KeystoreSigner
  ): Promise<SubmittableExtrinsic> {
    return Promise.reject()
  }
}
