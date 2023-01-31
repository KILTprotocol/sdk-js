/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { Option } from '@polkadot/types'
import type { IAttestation, ICredential } from '@kiltprotocol/types'
import { ConfigService } from '@kiltprotocol/config'
import * as Did from '@kiltprotocol/did'
import type { AttestationAttestationsAttestationDetails } from '@kiltprotocol/augment-api'
import { SDKErrors } from '@kiltprotocol/utils'
import { verifyAgainstCredential } from './Attestation.js'

const log = ConfigService.LoggingFactory.getLogger('Attestation')

/**
 * Decodes the attestation returned by `api.query.attestation.attestations()` and matches it against the corresponing credential.
 *
 * @param encoded Raw attestation data from blockchain.
 * @param credential The credential for which the attestation record was queried.
 * The credential, CType, and delegation node references in the attestation record are compared against the (integrity-protected) data contained within the credential to avoid decoding an invalid attestation.
 * @returns The attestation record.
 */
export function fromChain(
  encoded: Option<AttestationAttestationsAttestationDetails>,
  credential: ICredential | Pick<ICredential, 'rootHash'>
): IAttestation {
  if (encoded.isNone) {
    throw new SDKErrors.CredentialUnverifiableError(
      'No attestation record for this credential'
    )
  }
  const { authorizationId, ctypeHash, attester, revoked } = encoded.unwrap()
  const delegationId = authorizationId.unwrapOr(undefined)?.value.toHex()
  const attestation: IAttestation = {
    claimHash: credential.rootHash,
    cTypeHash: ctypeHash.toHex(),
    owner: Did.fromChain(attester),
    delegationId: delegationId || null,
    revoked: revoked.valueOf(),
  }
  log.info(`Decoded attestation: ${JSON.stringify(attestation)}`)
  if ('cTypeHash' in credential || 'delegationId' in credential) {
    verifyAgainstCredential(attestation, credential as ICredential)
  }
  return attestation
}
