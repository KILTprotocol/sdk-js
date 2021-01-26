import * as core from '@kiltprotocol/core'
import * as Actors from '@kiltprotocol/actors-api'
import {
  Credential,
  Claimer,
  Attester,
  Verifier,
} from '@kiltprotocol/actors-api'
import * as Types from '@kiltprotocol/types'

export * from '@kiltprotocol/types'
export * from '@kiltprotocol/core'
export { Actors }

export default {
  Types,
  ...core,
  Actors,
  Credential,
  Claimer,
  Attester,
  Verifier,
}
