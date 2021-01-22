import * as core from '@kiltprotocol/core'
import * as Actors from '@kiltprotocol/actors-api'
import {
  Credential,
  Claimer,
  Attester,
  Verifier,
} from '@kiltprotocol/actors-api'

export * from '@kiltprotocol/core'
export { Actors }

export default { ...core, Actors, Credential, Claimer, Attester, Verifier }
