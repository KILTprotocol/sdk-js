/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import {
  hexToU8a,
  stringToU8a,
  u8aCmp,
  u8aToHex,
  u8aToString,
} from '@polkadot/util'
import { base58Decode, base58Encode, blake2AsU8a } from '@polkadot/util-crypto'

import { CType, Credential } from '@kiltprotocol/core'
import type { ICType, IClaim, ICredential } from '@kiltprotocol/types'

import { makeStatementsJsonLD } from './Claim.js'

/**
 * Produces an instance of [[KiltAttestationProofV1]] from an [[ICredential]].
 *
 * @param credential Input credential.
 * @param opts Additional parameters required for creating a proof from an [[ICredential]].
 * @param opts.blockHash Hash of a block at which the proof must be verifiable.
 * @returns An embedded proof for a verifiable credential derived from the input.
 */
export function proofFromICredential(
  credential: ICredential,
  { blockHash }: { blockHash: Uint8Array }
): Credential.Types.KiltAttestationProofV1 {
  // `block` field is base58 encoding of block hash
  const block = base58Encode(blockHash)
  // `commitments` (claimHashes) are base58 encoded in new format
  const commitments = credential.claimHashes.map((i) =>
    base58Encode(hexToU8a(i))
  )
  // salt/nonces must be sorted by statement digest (keys) and base58 encoded
  const salt = Object.entries(credential.claimNonceMap)
    .map(([hsh, slt]) => [hexToU8a(hsh), stringToU8a(slt)])
    .sort((a, b) => u8aCmp(a[0], b[0]))
    .map((i) => base58Encode(i[1]))
  return {
    type: Credential.ATTESTATION_PROOF_V1_TYPE,
    block,
    commitments,
    salt,
  }
}

/**
 * Transforms an [[ICredential]] object to conform to the KiltCredentialV1 data model.
 *
 * @param input An [[ICredential]] object.
 * @param options Additional required and optional parameters for producing a VC from an [[ICredential]].
 * @param options.issuer The issuer of the attestation to this credential (attester).
 * @param options.timestamp Timestamp of the block referenced by blockHash in milliseconds since January 1, 1970, UTC (UNIX epoch).
 * @param options.chainGenesisHash Optional: Genesis hash of the chain against which this credential is verifiable. Defaults to the spiritnet genesis hash.
 * @returns A KiltCredentialV1 with embedded KiltAttestationProofV1 proof.
 */
export function vcFromICredential(
  input: ICredential,
  {
    issuer,
    timestamp,
    chainGenesisHash,
  }: Pick<
    Credential.KiltCredentialV1.CredentialInput,
    'chainGenesisHash' | 'timestamp' | 'issuer'
  >
): Omit<Credential.Types.KiltCredentialV1, 'proof'> {
  const {
    legitimations: legitimationsInput,
    delegationId,
    rootHash: claimHash,
    claim,
  } = input
  const { cTypeHash, owner: subject, contents: claims } = claim
  const cType = CType.hashToId(cTypeHash)

  const legitimations = legitimationsInput.map(({ rootHash: legHash }) =>
    Credential.KiltCredentialV1.idFromRootHash(legHash)
  )

  const vc = Credential.KiltCredentialV1.fromInput({
    claimHash,
    subject,
    claims,
    chainGenesisHash,
    cType,
    issuer,
    timestamp,
    legitimations,
    ...(delegationId && { delegationId }),
  })

  return vc
}

type Params = Parameters<typeof vcFromICredential>[1] &
  Parameters<typeof proofFromICredential>[1]

/**
 * Transforms an [[ICredential]] object to conform to the KiltCredentialV1 data model.
 *
 * @param input An [[ICredential]] object.
 * @param opts Additional required and optional parameters for producing a VC from an [[ICredential]].
 * @param opts.issuer The issuer of the attestation to this credential (attester).
 * @param opts.blockHash Hash of any block at which the credential is verifiable (i.e. Attested and not revoked).
 * @param opts.timestamp Timestamp of the block referenced by blockHash in milliseconds since January 1, 1970, UTC (UNIX epoch).
 * @param opts.chainGenesisHash Optional: Genesis hash of the chain against which this credential is verifiable. Defaults to the spiritnet genesis hash.
 * @returns A KiltCredentialV1 with embedded KiltAttestationProofV1 proof.
 */
export function ICredentialToVC(
  input: ICredential,
  { blockHash, issuer, chainGenesisHash, timestamp }: Params
): Credential.Types.KiltCredentialV1 {
  const proof = proofFromICredential(input, { blockHash })
  return {
    ...vcFromICredential(input, { issuer, chainGenesisHash, timestamp }),
    proof,
  }
}

/**
 * @param input
 */
export function VcToICredential(
  input: Credential.Types.KiltCredentialV1
): ICredential {
  const {
    id: owner,
    '@context': { '@vocab': vocab },
    ...contents
  } = input.credentialSubject
  const cTypeId = vocab.slice(0, -1) as ICType['$id']
  const claim: IClaim = {
    owner,
    cTypeHash: CType.idToHash(cTypeId),
    contents,
  }
  const { commitments, salt } = input.proof
  const claimHashes = commitments.map((c) => u8aToHex(base58Decode(c)))
  const hashedStatements = makeStatementsJsonLD(claim)
    .map((c) => blake2AsU8a(c))
    .sort(u8aCmp)
  const claimNonceMap = hashedStatements.reduce((reduced, hash, idx) => {
    return {
      ...reduced,
      [u8aToHex(hash)]: u8aToString(base58Decode(salt[idx])),
    }
  }, {})
  const rootHash = Credential.KiltCredentialV1.idToRootHash(input)
  const delegationId = Credential.KiltCredentialV1.getDelegation(input)
  const legitimationVcs = input.federatedTrustModel?.filter(
    (i): i is Credential.Types.KiltAttesterLegitimationV1 =>
      i.type === Credential.KILT_ATTESTER_LEGITIMATION_V1_TYPE
  )
  const legitimations = (legitimationVcs ?? []).map(
    ({ id, verifiableCredential }) =>
      verifiableCredential
        ? VcToICredential(verifiableCredential)
        : ({
            rootHash: Credential.KiltCredentialV1.idToRootHash({ id }),
          } as ICredential)
  )
  return {
    rootHash,
    claim,
    claimHashes,
    claimNonceMap,
    delegationId,
    legitimations,
  }
}
