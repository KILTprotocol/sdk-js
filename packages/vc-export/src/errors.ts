/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/* eslint-disable max-classes-per-file */

import { SDKErrors } from '@kiltprotocol/utils'

export class CredentialMalformedError extends SDKErrors.SDKError {}

export class ProofMalformedError extends SDKErrors.SDKError {}
