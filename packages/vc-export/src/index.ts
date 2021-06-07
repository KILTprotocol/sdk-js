import verification from './verificationUtils'
import presentation from './presentationUtils'
import { fromAttestedClaim } from './exportToVerifiableCredential'
import type * as types from './types'
import * as vcjsSuites from './vc-js'

export default {
  verification,
  presentation,
  fromAttestedClaim,
  types,
  vcjsSuites,
}
