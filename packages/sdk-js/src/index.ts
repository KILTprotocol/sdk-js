import * as core from '@kiltprotocol/core'
import * as Actors from '@kiltprotocol/actors-api'
import Message, * as Messaging from '@kiltprotocol/messaging'
import { Claimer, Attester, Verifier } from '@kiltprotocol/actors-api'
import { BlockchainUtils } from '@kiltprotocol/chain-helpers'
import * as ChainHelpers from '@kiltprotocol/chain-helpers'
import * as Utils from '@kiltprotocol/utils'

export * from '@kiltprotocol/types'
export * from '@kiltprotocol/core'
export {
  Message,
  Messaging,
  Actors,
  Claimer,
  Attester,
  Verifier,
  BlockchainUtils,
  ChainHelpers,
  Utils,
}

export default {
  ...core,
  Message,
  Messaging,
  Actors,
  Claimer,
  Attester,
  Verifier,
  BlockchainUtils,
  ChainHelpers,
  Utils,
}
