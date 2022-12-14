/* eslint-disable */

import {
  types10720 as types,
  didCalls,
  stakingCalls,
  publicCredentialsCalls,
} from '@kiltprotocol/type-definitions'

// Only types and runtime calls can be exported from here.
export default {
  types,
  runtime: {
    ...didCalls,
    ...stakingCalls,
    ...publicCredentialsCalls,
  },
}
