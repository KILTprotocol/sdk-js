import * as core from '@kiltprotocol/core'
import {
  Credential,
  Claimer,
  Attester,
  Verifier,
} from '@kiltprotocol/actors-api'

export * from '@kiltprotocol/core'
export * as Actors from '@kiltprotocol/actors-api'

export default { ...core, Credential, Claimer, Attester, Verifier }
