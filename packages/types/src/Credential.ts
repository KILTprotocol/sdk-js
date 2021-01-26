/**
 * @packageDocumentation
 * @module ICredential
 */

import * as gabi from '@kiltprotocol/portablegabi'
import { IAttestation } from './Attestation'
import { IRequestForAttestation } from './RequestForAttestation'

export interface ICredential {
  readonly reqForAtt: IRequestForAttestation
  readonly attestation: IAttestation
  readonly privacyCredential: gabi.Credential | null
}
