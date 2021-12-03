/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type {
  IIdentity,
  KeystoreSigner,
  SubmittableExtrinsic,
} from '@kiltprotocol/types'
import { FullDidDetails } from '../DidDetails/FullDidDetails'
import { FullDidBuilder } from './FullDidBuilder'

export class FullDidUpdateBuilder extends FullDidBuilder {
  public async update(
    submitter: IIdentity,
    keystore: KeystoreSigner
  ): Promise<FullDidDetails> {
    const a = this.oldAssertionKey
    return Promise.reject()
  }

  public async generateUpdateTx(
    submitter: IIdentity,
    keystore: KeystoreSigner
  ): Promise<SubmittableExtrinsic> {
    const a = this.oldAssertionKey
    return Promise.reject()
  }
}
