import { Struct } from '@polkadot/types'
import { Codec, AnyJson } from '@polkadot/types/types'
import { QueryResult } from '../blockchain/Blockchain'

/**
 * Helps decoding data received when querying blockchain state.
 *
 * @module Decoder
 */

/**
 * Dummy comment needed for correct doc display, do not remove.
 */

/**
 * Checks QueryResult for evidence that the query identified a record on chain.
 * In most cases, returns true if the QueryResult is a Codec where .isEmpty evaluates to false.
 * If the Codec is a bool, returns true if its value is true (.isEmpty is always false here).
 * If the Codec is a nested type (e.g. Struct, Tuple & Vec), returns true if any of its elements
 * returns true on the conditions above.
 * Bool Codecs alone will never suffice as conclusive evidence on this matter!
 *
 * @param qr QueryResult to evaluate.
 * @returns Boolean True if QueryResult contains evidence that the query matched data on chain, false otherwise.
 */
export function isNotEmpty(qr: QueryResult): boolean {
  if (!qr || qr.isEmpty || qr.toJSON() === false) {
    return false
  }
  if (qr instanceof Struct || qr instanceof Array) {
    let notEmpty = false
    qr.forEach((el: Codec) => {
      if (isNotEmpty(el as QueryResult)) {
        notEmpty = true
      }
    })
    return notEmpty
  }
  return true
}

/**
 * Calls el.toJSON() but replaces every element where .isEmpty === true with null in nested Codecs.
 *
 * @param el Codec to decode to JSON.
 */
export function emptiesToNull(encoded: Codec): AnyJson {
  const recursor = function(enc: Codec, json: AnyJson): AnyJson {
    if (enc.isEmpty) {
      return null
    }
    if (enc instanceof Struct || enc instanceof Array) {
      const modifiedJson = json
      enc.forEach((e: Codec, ind: any) => {
        if (modifiedJson && modifiedJson[ind] !== undefined) {
          modifiedJson[ind] = recursor(e, modifiedJson[ind])
        }
      })
      return modifiedJson
    }
    return json
  }
  return recursor(encoded, encoded.toJSON())
}
