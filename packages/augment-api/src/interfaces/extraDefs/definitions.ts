/* eslint-disable */

import { types, parachainStakingCalls, didCalls } from '@kiltprotocol/type-definitions'

// Only types and runtime calls can be exported from here.
export default {
  types,
  runtime: {
    ...parachainStakingCalls,
    ...didCalls
  }
}
