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
import { map, tap, mergeAll, from, Observable, filter, first } from 'rxjs'
import { getVerificationRelationshipForTx } from './DidDetails/index.js'
import { toChain } from './Did.chain.js'
import { linkedInfoFromChain } from './Did.rpc.js'

export type CreateArgs = {
  authentication: KeyringPair
  assertionMethod?: KeyringPair
  capabilityDelegation?: KeyringPair
  submitter?: KeyringPair
}

const create = Derives.makeDerive(
  (api) =>
    ({
      authentication,
      assertionMethod,
      capabilityDelegation,
      submitter,
    }: CreateArgs): Observable<DidDocument> => {
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

      // let txHash: Hash
      return from(result).pipe(
        tap({
          next: (ex) => {
            console.log(ex.toHuman())
            // txHash = ex.hash
          },
          error: console.error,
        }),
        map((ex) => api.rpc.author.submitAndWatchExtrinsic(ex)),
        mergeAll(),
        // map((status) => new SubmittableResult({ status, txHash }))
        filter((status) => status.isFinalized),
        map(() => api.call.did.query(authentication.address)),
        mergeAll(),
        first(),
        map((didInfo) => linkedInfoFromChain(didInfo).document)
      )

      // return result
      //   return result.pipe(() => {
      //     const query = api.call.did
      //       .query(authentication.address)
      //       .pipe(first())
      //       .pipe(map((queried) => linkedInfoFromChain(queried)))
      //   })
    }
)

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

const _derives = { did: { create, verificationMethodsForTransaction } }

export const derives: DeriveCustom & typeof _derives = _derives
