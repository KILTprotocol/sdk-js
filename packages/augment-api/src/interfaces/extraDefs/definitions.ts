import type { Definitions } from '@polkadot/types/types'

// TODO: Replace locally-linked yalc package with released one, once the new version 0.2 of the type-definitions package has been released.
import { latest, runtime } from '@kiltprotocol/type-definitions'

/*
  This module contains all the extra definitions for types and state_calls (i.e., runtime APIs).
  No rpc definition must be declared in here, as that has to be properly namespaced in folders that have
  the same name as the RPC module (see ./credentials for an example).
*/

/* eslint-disable */
export default {
  types: latest,
  runtime,
} as Definitions
