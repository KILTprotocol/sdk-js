/**
 * @packageDocumentation
 * @module ICredential
 */

import * as gabi from '@kiltprotocol/portablegabi'
import IRequestForAttestation from './RequestForAttestation'
import IAttestation from './Attestation'

export default interface ICredential {
  readonly reqForAtt: IRequestForAttestation
  readonly attestation: IAttestation
  readonly privacyCredential: gabi.Credential | null
}
