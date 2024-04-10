/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { Did, DidDocument, KeyringPair } from '@kiltprotocol/types'
import { Derives } from '@kiltprotocol/utils'
import { DeriveCustom } from '@polkadot/types/types'
import { Extrinsic } from '@polkadot/types/interfaces'
import { map, mergeAll, from, Observable, first, combineLatest } from 'rxjs'
import { SubmittableResult } from '@polkadot/api'
import { getVerificationRelationshipForTx } from './DidDetails/index.js'
import { toChain } from './Did.chain.js'
import { linkedInfoFromChain } from './Did.rpc.js'

export type CreateArgs = {
  authentication: KeyringPair
  assertionMethod?: KeyringPair
  capabilityDelegation?: KeyringPair
  submitter?: KeyringPair
}

function formatError(
  err: SubmittableResult['dispatchError'],
  api: Derives.DeriveApi
) {
  if (err?.isModule) {
    const { method, section, docs } = api.registry.findMetaError(err.asModule)
    return `${section}.${method}: ${docs.join(' ')}`
  }
  if (err) {
    return `${err.type}: ${err.value.toHuman()}`
  }
  return undefined
}

const create = Derives.makeDerive(
  (api) =>
    ({
      authentication,
      assertionMethod,
      capabilityDelegation,
      submitter,
    }: CreateArgs): Observable<{
      didDocument?: DidDocument
      error?: string
    }> => {
      let result
      if (submitter) {
        let tx = api.tx.did.create(
          {
            did: authentication.address,
            submitter: submitter.address,
            newAttestationKey: assertionMethod
              ? { [assertionMethod?.type]: assertionMethod.publicKey }
              : undefined,
            newDelegationKey: capabilityDelegation
              ? {
                  [capabilityDelegation?.type]: capabilityDelegation.publicKey,
                }
              : undefined,
          },
          { ed25519: new Uint8Array(64) }
        )
        const encoded = tx.args[0].toU8a()
        const signature = authentication.sign(encoded)
        tx = api.tx.did.create(encoded, {
          [authentication.type as 'ed25519']: signature,
        })
        result = tx.signAsync(submitter)
      } else {
        let tx = api.tx.did.createFromAccount({
          [authentication.type as 'ed25519']: authentication.publicKey,
        })
        const additionals = []
        if (assertionMethod) {
          additionals.push(
            api.tx.did.setAttestationKey({
              [assertionMethod.type as 'ed25519']: assertionMethod.publicKey,
            })
          )
        }
        if (capabilityDelegation) {
          additionals.push(
            api.tx.did.setAttestationKey({
              [capabilityDelegation.type as 'ed25519']:
                capabilityDelegation.publicKey,
            })
          )
        }
        if (additionals.length > 0) {
          const didAuthorized = api.tx.did.dispatchAs(
            authentication.address,
            api.tx.utility.batchAll(additionals)
          )
          tx = api.tx.utility.batchAll([tx, didAuthorized])
        }
        result = tx.signAsync(authentication)
      }

      const results = from(result).pipe(
        map((ex) => Derives.fixSubmittable(ex, api).send()),
        mergeAll(),
        first((result) => result.isCompleted)
      )
      const document = results.pipe(
        map(() =>
          api.call.did
            .query(authentication.address)
            .pipe(
              map((didInfo) =>
                didInfo.isSome
                  ? linkedInfoFromChain(didInfo).document
                  : undefined
              )
            )
        ),
        mergeAll()
      )
      const error = results.pipe(
        map((result) => formatError(result.dispatchError, api))
      )

      return combineLatest([error, document]).pipe(
        map(([error, didDocument]) => ({ error, didDocument }))
      )
    }
)

const resolve = Derives.makeDerive(function (api) {
  return (did: Did) =>
    api.call.did
      .query(toChain(did))
      .pipe(
        map((info) =>
          info.isSome ? linkedInfoFromChain(info).document : undefined
        )
      )
})

const verificationMethodsForTransaction = Derives.makeDerive(function (api) {
  return function (did: Did, transaction: Extrinsic) {
    const verificationRelationship =
      getVerificationRelationshipForTx(transaction) ?? 'unknown'
    return api.call.did.query(toChain(did)).pipe(
      map((i) => {
        if (!i.isSome) {
          return {
            verificationRelationship,
            verificationMethods: [],
            didNonce: 0,
          }
        }
        const { document } = linkedInfoFromChain(i)
        const ids = document[verificationRelationship] ?? []
        const verificationMethods =
          document.verificationMethod?.filter(({ id }) => ids?.includes(id)) ??
          []
        const didNonce = i.unwrap().details.lastTxCounter.toNumber()
        return { verificationRelationship, verificationMethods, didNonce }
      })
    )
  }
})

const _derives = {
  did: { create, verificationMethodsForTransaction, resolve },
}

export const derives: DeriveCustom & typeof _derives = _derives
