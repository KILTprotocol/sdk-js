/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { Observable } from 'rxjs'
import type { ApiInterfaceRx } from '@polkadot/api/types'
import type { DeriveCustom } from '@polkadot/types/types'
// import type { IPublicCredential } from '@kiltprotocol/types'

import { of } from 'rxjs'
import { memo } from '@polkadot/api-derive/util'

export function getCredential(
  instanceId: string,
  api: ApiInterfaceRx
): () => Observable<null> {
  return memo(instanceId, (): Observable<null> => {
    return of(null)
  })
}

export const derives: DeriveCustom = {
  publicCredentials: {
    getCredential,
  },
}
