/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type {
  DidKey,
  IIdentity,
  KeystoreSigner,
  SubmittableExtrinsic,
} from '@kiltprotocol/types'
import type { FullDidDetails } from '../DidDetails/FullDidDetails'
import type { FullDidBuilderCreationDetails } from './FullDidBuilder'
import { FullDidBuilder } from './FullDidBuilder'

export type FullDidCreationBuilderCreationDetails =
  FullDidBuilderCreationDetails & { authenticationKey: DidKey }

export class FullDidCreationBuilder extends FullDidBuilder {
  private authenticationKey: DidKey

  public constructor(details: FullDidCreationBuilderCreationDetails) {
    super(details)
    this.authenticationKey = details.authenticationKey
  }

  public async create(
    submitter: IIdentity,
    keystore: KeystoreSigner
  ): Promise<FullDidDetails> {
    const creation
    return Promise.reject()
  }

  public async generateCreationTx(
    submitter: IIdentity,
    keystore: KeystoreSigner
  ): Promise<SubmittableExtrinsic> {
    const a = this.oldAssertionKey
    return Promise.reject()
  }
}
