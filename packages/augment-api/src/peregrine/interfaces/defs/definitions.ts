/* eslint-disable */

import {
  types10800,
  didCalls,
  stakingCalls,
  publicCredentialsCalls,
} from '@kiltprotocol/type-definitions'

// Only types and runtime calls can be exported from here.
export default {
  types: {
    ...types10800,
  },
  runtime: {
    ...didCalls,
    ...stakingCalls,
    ...publicCredentialsCalls,
  },
}
