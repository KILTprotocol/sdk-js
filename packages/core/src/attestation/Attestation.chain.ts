/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { Option } from '@polkadot/types'
import type {
  IAttestation,
  ICredential,
  KiltAddress,
} from '@kiltprotocol/types'
import { ConfigService } from '@kiltprotocol/config'
import { Utils as DidUtils } from '@kiltprotocol/did'
import type { AttestationAttestationsAttestationDetails } from '@kiltprotocol/augment-api'

const log = ConfigService.LoggingFactory.getLogger('Attestation')

/**
 * Decodes the attestation returned by `api.query.attestation.attestations()`.
 *
 * @param encoded Raw attestation data from blockchain.
 * @param claimHash The attestation claimHash.
 * @returns The attestation.
 */
export function decode(
  encoded: Option<AttestationAttestationsAttestationDetails>,
  claimHash: ICredential['rootHash'] // all the other decoders do not use extra data; they just return partial types
): IAttestation {
  const chainAttestation = encoded.unwrap()
  const delegationId = chainAttestation.authorizationId
    .unwrapOr(undefined)
    ?.value.toHex()
  const attestation: IAttestation = {
    claimHash,
    cTypeHash: chainAttestation.ctypeHash.toHex(),
    owner: DidUtils.getFullDidUri(
      chainAttestation.attester.toString() as KiltAddress
    ),
    delegationId: delegationId || null,
    revoked: chainAttestation.revoked.valueOf(),
  }
  log.info(`Decoded attestation: ${JSON.stringify(attestation)}`)
  return attestation
}
