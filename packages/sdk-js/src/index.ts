import * as core from '@kiltprotocol/core'
import * as Actors from '@kiltprotocol/actors-api'
import Message, * as Messaging from '@kiltprotocol/messaging'
import {
  Credential,
  Claimer,
  Attester,
  Verifier,
} from '@kiltprotocol/actors-api'

export * from '@kiltprotocol/types'
export * from '@kiltprotocol/core'
export { Actors }

export default {
  ...core,
  Message,
  Messaging,
  Actors,
  Credential,
  Claimer,
  Attester,
  Verifier,
}
