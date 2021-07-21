import verification from './verificationUtils'
import presentation from './presentationUtils'
import { fromAttestedClaim } from './exportToVerifiableCredential'
import * as vcjsSuites from './vc-js'

export default {
  verification,
  presentation,
  fromAttestedClaim,
  vcjsSuites,
}

export { verification, presentation, fromAttestedClaim, vcjsSuites }

import type * as types from './types'
export type { types }
