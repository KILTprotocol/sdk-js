/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { ICredential } from '@kiltprotocol/types'
import { Observable } from '@polkadot/types/types'
import { map } from 'rxjs'
import type { DeriveApi } from '@polkadot/api-derive/types'
import { memo } from '@polkadot/api-derive/util'
import * as Attestation from '../attestation/index.js'

type DeriveCreator<P extends any[], R> = (
  instanceId: string,
  api: DeriveApi
) => (...args: P) => Observable<R>

function makeDeriveCreator<P extends any[], R>(
  implementationFactory: (api: DeriveApi) => (...args: P) => Observable<R>
): DeriveCreator<P, R> {
  return (instanceId, api) => {
    return memo(instanceId, implementationFactory(api))
  }
}

export const verifyAttested = makeDeriveCreator((api) => {
  return (credential: ICredential) => {
    return api.query.attestation.attestations(credential.rootHash).pipe(
      map((attestationQueryResult) => {
        try {
          const attestation = Attestation.fromChain(
            attestationQueryResult,
            credential.rootHash
          )
          const { revoked, owner: attester } = attestation
          Attestation.verifyAgainstCredential(attestation, credential)
          return { attester, revoked }
        } catch (error) {
          return { error }
        }
      })
    )
  }
})
