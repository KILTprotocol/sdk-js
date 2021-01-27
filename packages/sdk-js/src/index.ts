import * as core from '@kiltprotocol/core'
import * as Actors from '@kiltprotocol/actors-api'
import {
  Credential,
  Claimer,
  Attester,
  Verifier,
} from '@kiltprotocol/actors-api'
import * as types from '@kiltprotocol/types'

export * from '@kiltprotocol/types'
export * from '@kiltprotocol/core'
export { Actors }

export default {
  types,
  ...core,
  Actors,
  Credential,
  Claimer,
  Attester,
  Verifier,
}
