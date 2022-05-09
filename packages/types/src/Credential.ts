/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { IAttestation, CompressedAttestation } from './Attestation'
import type {
  IRequestForAttestation,
  CompressedRequestForAttestation,
} from './RequestForAttestation'

export interface ICredential {
  attestation: IAttestation
  request: IRequestForAttestation
}

export type CompressedCredential = [
  CompressedRequestForAttestation,
  CompressedAttestation
]
