/* eslint-disable */

import { types, didCalls, parachainStakingCalls } from '@kiltprotocol/type-definitions'

// Only types and runtime calls can be exported from here.
export default {
  types,
  runtime: {
    ...didCalls,
    ...parachainStakingCalls
  }
}
