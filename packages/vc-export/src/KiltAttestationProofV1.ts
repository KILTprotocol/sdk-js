/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { Attestation, CType } from '@kiltprotocol/core'
import { validateUri } from '@kiltprotocol/did'
import type { ICredential } from '@kiltprotocol/types'
import { JsonSchema } from '@kiltprotocol/utils'
import type { ApiPromise } from '@polkadot/api'
import {
  hexToU8a,
  stringToU8a,
  u8aCmp,
  u8aConcatStrict,
  u8aSorted,
  u8aToHex,
} from '@polkadot/util'
import { base58Decode, base58Encode, blake2AsU8a } from '@polkadot/util-crypto'
import { Caip2, Caip19 } from './CAIP/index.js'
import {
  ATTESTATION_PROOF_V1_TYPE,
  KILT_ATTESTER_DELEGATION_V1_TYPE,
  KILT_ATTESTER_LEGITIMATION_V1_TYPE,
  KILT_REVOCATION_STATUS_V1_TYPE,
} from './constants.js'
import {
  credentialIdFromRootHash,
  credentialIdToRootHash,
  validateStructure as validateCredentialStructure,
} from './KiltCredentialV1.js'
import type { VerifiableCredential } from './types.js'
import {
  CredentialMalformedError,
  ProofMalformedError,
} from './verificationUtils.js'

export interface KiltAttestationProofV1 {
  type: typeof ATTESTATION_PROOF_V1_TYPE
  block: string
  commitments: string[]
  revealProof: string[]
}

/**
 * Produces an instance of [[KiltAttestationProofV1]] from an [[ICredential]].
 *
 * @param credential Input credential.
 * @param blockHash Hash of a block at which the proof must be verifiable.
 * @returns An embedded proof for a verifiable credential derived from the input.
 */
export function fromICredential(
  credential: ICredential,
  blockHash: Uint8Array
): KiltAttestationProofV1 {
  // `block` field is base58 encoding of block hash
  const block = base58Encode(blockHash)
  // `commitments` (claimHashes) are base58 encoded in new format
  const commitments = credential.claimHashes.map((i) =>
    base58Encode(hexToU8a(i))
  )
  // salt/nonces must be sorted by statment digest (keys) and base58 encoded
  const revealProof = Object.entries(credential.claimNonceMap)
    .map(([hash, salt]) => [hexToU8a(hash), stringToU8a(salt)])
    .sort((a, b) => u8aCmp(a[0], b[0]))
    .map((i) => base58Encode(i[1]))
  return {
    type: ATTESTATION_PROOF_V1_TYPE,
    block,
    commitments,
    revealProof,
  }
}

export const proofSchema: JsonSchema.Schema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  properties: {
    type: {
      type: 'string',
      const: ATTESTATION_PROOF_V1_TYPE,
    },
    block: {
      type: 'string',
    },
    commitments: {
      type: 'array',
      items: { type: 'string' },
    },
    revealProof: {
      type: 'array',
      items: { type: 'string' },
    },
  },

  additionalProperties: false,
  required: ['type', 'block', 'commitments', 'revealProof'],
}

const schemaValidator = new JsonSchema.Validator(proofSchema)

/**
 * @param credential
 */
export function validateStructure(credential: KiltAttestationProofV1): void {
  const { errors, valid } = schemaValidator.validate(credential)
  if (!valid)
    throw new ProofMalformedError(
      `Object not matching ${ATTESTATION_PROOF_V1_TYPE} data model`,
      {
        cause: errors,
      }
    )
}

export interface VerificationResult {
  verified: boolean
  errors: Error[]
}

/**
 * Verifies a KILT attestation proof by querying data from the KILT blockchain.
 * This includes querying the KILT blockchain with the credential id, which returns an attestation record if attested.
 * This record is then compared against attester address and delegation id (the latter of which is taken directly from the credential).
 *
 * @param credentialInput Verifiable Credential to verify proof against.
 * @param proof KiltAttestationProofV1 proof object to be verified. Any proofs embedded in the credentialInput are stripped and ignored.
 * @param api A polkadot-js/api instance connected to the blockchain network on which the credential is anchored.
 * @returns Object indicating whether proof could be verified.
 */
export async function verifyProof(
  credentialInput: VerifiableCredential,
  proof: KiltAttestationProofV1,
  api: ApiPromise
): Promise<VerificationResult> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { proof: _, ...credential } = credentialInput
    // 0. check proof structure
    validateStructure(proof)
    // 1 - 3. check credential structure
    validateCredentialStructure(credential)
    const {
      nonTransferable,
      credentialStatus,
      credentialSubject,
      issuer,
      federatedTrustModel = [],
    } = credential
    validateUri(issuer, 'Did')
    // 4. check nonTransferable
    if (nonTransferable !== true)
      throw new CredentialMalformedError('nonTransferable must be true')
    // 5. check credentialStatus type
    if (credentialStatus.type !== KILT_REVOCATION_STATUS_V1_TYPE)
      throw new CredentialMalformedError(
        `credentialStatus must have type ${KILT_REVOCATION_STATUS_V1_TYPE}`
      )
    // 6. json-ld expand credentialSubject
    const expandedContents = {}
    const vocabulary = credentialSubject['@context']['@vocab']
    Object.entries(credentialSubject).forEach(([key, value]) => {
      if (key.startsWith('@')) return
      if (key === 'id') {
        expandedContents['@id'] = value
      } else {
        expandedContents[vocabulary + key] = value
      }
    })
    // 7. Transform to normalized statments and hash
    const statements = Object.entries(expandedContents).map(([key, value]) =>
      JSON.stringify({ [key]: value }).normalize('NFC')
    )
    if (statements.length !== proof.revealProof.length)
      throw new Error(
        'Violated expectation: number of normalized statements === number of revealProofs'
      )
    const digests = u8aSorted(
      statements.map((s) => blake2AsU8a(stringToU8a(s), 256))
    )
    // 8. Re-compute commitments
    digests.forEach((digest, index) => {
      // initialize array with 36 + 2 + 64 bytes
      const bytes = new Uint8Array(102)
      // decode salt and add to array
      const salt = proof.revealProof[index]
      bytes.set(base58Decode(salt))
      // add bytes 0x30 & 0x78
      bytes.set([48, 120], 36)
      // add hex encoded digest
      bytes.set(stringToU8a(u8aToHex(digest, undefined, false)), 38)
      // recompute commitment
      const recomputed = blake2AsU8a(bytes, 256)
      if (!proof.commitments.includes(base58Encode(recomputed)))
        throw new Error(
          `No commitment for statement with digest ${u8aToHex(
            digest
          )} and salt ${salt}`
        )
    })
    const rootHashInputs = [
      // 9. Collect commitments for root hash
      ...proof.commitments.map((i) => base58Decode(i)),
      // 10. Collect trust model items for root hash
      ...federatedTrustModel.map(({ type, id }) => {
        if (type === KILT_ATTESTER_LEGITIMATION_V1_TYPE) {
          // get root hash from credential id
          return credentialIdToRootHash(id as VerifiableCredential['id'])
        }
        if (type === KILT_ATTESTER_DELEGATION_V1_TYPE) {
          // get on-chain id from delegation id
          const { assetInstance } = Caip19.parse(id)
          if (!assetInstance)
            throw new Error(
              `not a valid id for type ${KILT_ATTESTER_DELEGATION_V1_TYPE}: ${id}`
            )
          return base58Decode(id)
        }
        throw new Error(`unknown type ${type} in federatedTrustModel`)
      }),
    ]
    // 11. Concatenate and hash
    const rootHash = blake2AsU8a(u8aConcatStrict(rootHashInputs), 256)
    // 12. Compare against credential id
    if (credentialIdFromRootHash(rootHash) !== credential.id)
      throw new Error('root hash not verifiable')

    // 13. check that api is connected to the right network
    const apiChainId = Caip2.chainIdFromGenesis(api.genesisHash)
    if (apiChainId !== credential.credentialStatus.id)
      throw new Error(
        `api must be connected to network ${credential.credentialStatus.id} to verify this credential`
      )
    // 14. query info from chain
    const apiAtBlock = await api.at(proof.block)
    const [timestamp, attestation] = await Promise.all([
      apiAtBlock.query.timestamp.now(),
      apiAtBlock.query.attestation.attestations(rootHash),
    ])
    if (timestamp.isEmpty || attestation.isNone)
      throw new Error("Attestation data not found at 'block'")
    // 15. compare attestation info to credential
    const onChain = Attestation.fromChain(attestation, u8aToHex(rootHash))
    const onChainCType = CType.hashToId(onChain.cTypeHash)
    if (
      onChain.owner !== issuer ||
      onChainCType !== credential.credentialSchema.id
    ) {
      throw new Error(
        `Credential not matching on-chain data: issuer "${onChain.owner}", CType: "${onChainCType}"`
      )
    }
    // if proof data is valid but attestation is flagged as revoked, credential is no longer valid
    if (onChain.revoked !== false) {
      throw new Error('Attestation revoked')
    }
    // 16. Check timestamp
    if (!timestamp.eqn(new Date(credential.issuanceDate).getTime()))
      throw new Error(
        `block time ${new Date(
          timestamp.toNumber()
        ).toISOString()} does not match issuedAt`
      )
    // 17. + 18. validate federatedTrustModel items
    await Promise.all(
      credential.federatedTrustModel?.map(async (i) => {
        if (i.type === KILT_ATTESTER_DELEGATION_V1_TYPE) {
          // make sure on-chain delegation matches delegation on credential
          const { assetInstance, chainId, assetNamespace, assetReference } =
            Caip19.parse(i.id)
          if (
            !assetInstance ||
            assetNamespace !== 'kilt' ||
            assetReference !== 'delegation'
          )
            throw new Error(
              `not a valid id for type ${KILT_ATTESTER_DELEGATION_V1_TYPE}: ${i.id}`
            )
          if (
            chainId !== apiChainId ||
            u8aCmp(
              base58Decode(assetInstance),
              hexToU8a(onChain.delegationId)
            ) !== 0
          )
            throw new Error(
              `Delegation ${i.id} does not match on-chain records`
            )
          // TODO: check delegators
          if (i.delegators) {
            // const node = await DelegationNode.fetch(onChain.delegationId as string)
            throw new Error('not implemented')
          }
          return
        }
        if (
          i.type === KILT_ATTESTER_LEGITIMATION_V1_TYPE &&
          i.verifiableCredential
        ) {
          const { proof: legitimationProof, ...legitimation } =
            i.verifiableCredential
          const { verified, errors } = await verifyProof(
            legitimation,
            legitimationProof as KiltAttestationProofV1,
            api
          )
          if (!verified)
            throw new Error(`failed to verify legitimation ${i.id}`, {
              cause: errors,
            })
          return
        }
        throw new Error(`unknown type ${i.type} in federatedTrustModel`)
      }) ?? []
    )
  } catch (e) {
    return {
      verified: false,
      errors: [e as Error],
    }
  }
  return { verified: true, errors: [] }
}
