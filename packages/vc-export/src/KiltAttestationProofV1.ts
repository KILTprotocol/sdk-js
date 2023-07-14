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
  u8aConcatStrict,
  u8aEq,
  u8aToHex,
} from '@polkadot/util'
import {
  base58Decode,
  base58Encode,
  blake2AsU8a,
  encodeAddress,
  randomAsU8a,
} from '@polkadot/util-crypto'
import type { ApiPromise } from '@polkadot/api'
import type { QueryableStorageEntry } from '@polkadot/api/types'
import type { Option, u64, Vec } from '@polkadot/types'
import type {
  AccountId,
  Extrinsic,
  Hash,
} from '@polkadot/types/interfaces/types.js'
import type { IEventData } from '@polkadot/types/types'

import { CType } from '@kiltprotocol/core'
import {
  authorizeTx,
  getFullDidUri,
  validateUri,
  fromChain as didFromChain,
} from '@kiltprotocol/did'
import { JsonSchema, SDKErrors } from '@kiltprotocol/utils'
import { ConfigService } from '@kiltprotocol/config'
import type {
  FrameSystemEventRecord,
  RuntimeCommonAuthorizationAuthorizationId,
} from '@kiltprotocol/augment-api'
import type {
  DidUri,
  ICredential,
  ICType,
  IDelegationNode,
  KiltAddress,
  SignExtrinsicCallback,
} from '@kiltprotocol/types'

import { Caip19 } from './CAIP/index.js'
import {
  ATTESTATION_PROOF_V1_TYPE,
  DEFAULT_CREDENTIAL_CONTEXTS,
  KILT_ATTESTER_DELEGATION_V1_TYPE,
  KILT_ATTESTER_LEGITIMATION_V1_TYPE,
  KILT_CREDENTIAL_IRI_PREFIX,
  KILT_REVOCATION_STATUS_V1_TYPE,
  spiritnetGenesisHash,
} from './constants.js'
import {
  validateStructure as validateCredentialStructure,
  CTypeLoader,
  validateSubject,
} from './KiltCredentialV1.js'
import { fromGenesisAndRootHash } from './KiltRevocationStatusV1.js'
import {
  jsonLdExpandCredentialSubject,
  ExpandedContents,
  delegationIdFromAttesterDelegation,
  getDelegationNodeIdForCredential,
  assertMatchingConnection,
  credentialIdFromRootHash,
  credentialIdToRootHash,
} from './common.js'
import { CredentialMalformedError, ProofMalformedError } from './errors.js'
import type {
  CredentialSubject,
  KiltAttestationProofV1,
  KiltAttesterLegitimationV1,
  KiltCredentialV1,
} from './types.js'

/**
 * Produces an instance of [[KiltAttestationProofV1]] from an [[ICredential]].
 *
 * @param credential Input credential.
 * @param opts Additional parameters required for creating a proof from an [[ICredential]].
 * @param opts.blockHash Hash of a block at which the proof must be verifiable.
 * @returns An embedded proof for a verifiable credential derived from the input.
 */
export function fromICredential(
  credential: ICredential,
  { blockHash }: { blockHash: Uint8Array }
): KiltAttestationProofV1 {
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
    type: ATTESTATION_PROOF_V1_TYPE,
    block,
    commitments,
    salt,
  }
}

export const proofSchema: JsonSchema.Schema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  properties: {
    '@context': {
      type: 'array',
      const: DEFAULT_CREDENTIAL_CONTEXTS,
    },
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
    salt: {
      type: 'array',
      items: { type: 'string' },
    },
  },

  additionalProperties: false,
  required: ['type', 'block', 'commitments', 'salt'],
}

// draft version '7' should align with $schema property of the schema above
const schemaValidator = new JsonSchema.Validator(proofSchema, '7')

/**
 * Validates a proof object against the KiltAttestationProofV1 data model.
 * Throws if object violates the [[proofSchema]].
 *
 * @param proof Proof object to be validated.
 */
export function validateStructure(proof: KiltAttestationProofV1): void {
  const { errors, valid } = schemaValidator.validate(proof)
  if (!valid)
    throw new ProofMalformedError(
      `Object not matching ${ATTESTATION_PROOF_V1_TYPE} data model`,
      {
        cause: errors,
      }
    )
}

/**
 * Normalizes claims in credentialSubject for the commitment scheme of this proof method.
 * This involves sorting the normalized representation of claims by their blake2b digests.
 *
 * @param expandedContents JSON-LD expansion of credentialSubject, where keys are either '@id' or full URIs.
 * @returns An array of normalized `statements` sorted by their digests, and the sorted array of `digests`.
 */
function normalizeClaims(
  expandedContents: ExpandedContents<CredentialSubject>
): { statements: string[]; digests: Uint8Array[] } {
  const statements = Object.entries(expandedContents).map(([key, value]) =>
    JSON.stringify({ [key]: value }).normalize('NFC')
  )
  const statementsAndDigests = statements.map((statement) => ({
    digest: blake2AsU8a(stringToU8a(statement), 256),
    statement,
  }))
  const sorted = statementsAndDigests.sort((a, b) => {
    return u8aCmp(a.digest, b.digest)
  })
  return {
    statements: sorted.map(({ statement }) => statement),
    digests: sorted.map(({ digest }) => digest),
  }
}

const OX = stringToU8a('0x')
function makeCommitments(
  statementDigests: Uint8Array[],
  salt: Uint8Array[]
): Uint8Array[] {
  return statementDigests.map((digest, index) => {
    // hex encoded digest, encoded as UTF-8
    const digestAsHex = stringToU8a(u8aToHex(digest, undefined, false))
    // concatenate salt, 0x, and hex-encoded digest to yield input for commitment
    const bytes = u8aConcatStrict([salt[index], OX, digestAsHex])
    // compute commitment
    return blake2AsU8a(bytes, 256)
  })
}

/**
 * (Re-)computes the root hash / credential hash from a credential and proof.
 *
 * @param credential A [[KiltCredentialV1]] type credential.
 * @param proof A [[KiltAttestationProofV1]] type proof for this credential.
 * @returns The root hash.
 */
export function calculateRootHash(
  credential: Pick<KiltCredentialV1, 'federatedTrustModel'> &
    Partial<KiltCredentialV1>,
  proof: Pick<KiltAttestationProofV1, 'commitments'> &
    Partial<KiltAttestationProofV1>
): Uint8Array {
  const { federatedTrustModel = [] } = credential
  const { commitments } = proof
  const rootHashInputs = [
    // Collect commitments for root hash
    ...commitments.map((i) => base58Decode(i)),
    // Collect trust model items for root hash
    ...federatedTrustModel.map((entry) => {
      if (entry.type === KILT_ATTESTER_LEGITIMATION_V1_TYPE) {
        // get root hash from credential id
        return credentialIdToRootHash(entry.id)
      }
      if (entry.type === KILT_ATTESTER_DELEGATION_V1_TYPE) {
        // get on-chain id from delegation id
        return delegationIdFromAttesterDelegation(entry)
      }
      throw new CredentialMalformedError(
        `unknown type ${
          (entry as { type: string }).type
        } in federatedTrustModel`
      )
    }),
  ]
  // Concatenate and hash to produce root hash
  return blake2AsU8a(u8aConcatStrict(rootHashInputs), 256)
}

async function verifyAttestedAt(
  claimHash: Uint8Array,
  blockHash: Uint8Array,
  opts: { api?: ApiPromise } = {}
): Promise<{
  verified: boolean
  timestamp: number
  attester: DidUri
  cTypeId: ICType['$id']
  delegationId: IDelegationNode['id'] | null
}> {
  const { api = ConfigService.get('api') } = opts
  const apiAt = await api.at(blockHash)
  // TODO: should we look up attestation storage as well and take attestation info from there? That gives us the definitive attestation state in this block (e.g. makes sure it hasn't been removed after)
  const [events, time] = await apiAt.queryMulti<
    [Vec<FrameSystemEventRecord>, u64]
  >([
    [api.query.system.events as QueryableStorageEntry<'promise'>],
    [api.query.timestamp.now as QueryableStorageEntry<'promise'>],
  ])

  const timestamp = time.toNumber()
  const attestationEvent = events
    .reverse()
    .find(
      ({ phase, event }) =>
        phase.isApplyExtrinsic &&
        api.events.attestation.AttestationCreated.is(event) &&
        u8aEq(event.data[1], claimHash)
    )
  if (!attestationEvent)
    throw new SDKErrors.CredentialUnverifiableError(
      `Matching attestation event for root hash ${u8aToHex(
        claimHash
      )} not found at block ${u8aToHex(blockHash)}`
    )
  const [att, , cTypeHash, authorization] = attestationEvent.event.data as [
    AccountId,
    Hash,
    Hash,
    Option<Hash> | Option<RuntimeCommonAuthorizationAuthorizationId>
  ] &
    IEventData
  const attester = getFullDidUri(encodeAddress(att.toU8a(), 38))
  const cTypeId = CType.hashToId(cTypeHash.toHex())
  const delegationId = authorization.isSome
    ? (
        (authorization.unwrap() as RuntimeCommonAuthorizationAuthorizationId)
          .value ?? authorization.unwrap()
      ).toHex()
    : null
  return {
    verified: true,
    timestamp,
    attester,
    cTypeId,
    delegationId,
  }
}

async function verifyAuthoritiesInHierarchy(
  api: ApiPromise,
  nodeId: Uint8Array | string,
  delegators: Set<DidUri>
): Promise<void> {
  const node = (await api.query.delegation.delegationNodes(nodeId)).unwrapOr(
    null
  )
  if (node === null) {
    throw new SDKErrors.DelegationIdMissingError()
  }
  delegators.delete(didFromChain(node.details.owner))
  if (delegators.size === 0) {
    return
  }
  if (node.parent.isSome) {
    await verifyAuthoritiesInHierarchy(api, node.parent.unwrap(), delegators)
    return
  }
  throw new SDKErrors.CredentialUnverifiableError(
    `The following delegators are not in the attestation's delegation hierarchy: ${[
      ...delegators,
    ]}`
  )
}

async function verifyLegitimation(
  { verifiableCredential, id }: KiltAttesterLegitimationV1,
  api: ApiPromise
): Promise<void> {
  if (verifiableCredential) {
    try {
      // eslint-disable-next-line no-use-before-define
      await verify(
        verifiableCredential,
        verifiableCredential.proof as KiltAttestationProofV1,
        { api }
      )
    } catch (cause) {
      throw new SDKErrors.CredentialUnverifiableError(
        `failed to verify legitimation ${id}`,
        {
          cause,
        }
      )
    }
  }
}

/**
 * Verifies a KILT attestation proof by querying data from the KILT blockchain.
 * This includes querying the KILT blockchain with the credential id, which returns an attestation record if attested.
 * This record is then compared against attester address and delegation id (the latter of which is taken directly from the credential).
 *
 * @param credentialInput Verifiable Credential to verify proof against.
 * @param proof KiltAttestationProofV1 proof object to be verified. Any proofs embedded in the credentialInput are stripped and ignored.
 * @param opts Additional parameters.
 * @param opts.api A polkadot-js/api instance connected to the blockchain network on which the credential is anchored.
 * @param opts.cTypes One or more CType definitions to be used for validation. If `loadCTypes` is set to `false`, validation will fail if the definition of the credential's CType is not given.
 * @param opts.loadCTypes A function to load CType definitions that are not in `cTypes`. Defaults to using the [[CachingCTypeLoader]]. If set to `false` or `undefined`, no additional CTypes will be loaded.
 */
export async function verify(
  credentialInput: Omit<KiltCredentialV1, 'proof'>,
  proof: KiltAttestationProofV1,
  opts: { api?: ApiPromise; cTypes?: ICType[]; loadCTypes?: CTypeLoader } = {}
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { proof: _, ...credential } = credentialInput as KiltCredentialV1
  // 0. check proof structure
  validateStructure(proof)
  // 1 - 3. check credential structure
  validateCredentialStructure(credential)
  const { nonTransferable, credentialStatus, credentialSubject, issuer } =
    credential
  validateUri(issuer, 'Did')
  await validateSubject(credential, opts)
  // 4. check nonTransferable
  if (nonTransferable !== true)
    throw new CredentialMalformedError('nonTransferable must be true')
  // 5. check credentialStatus
  if (credentialStatus.type !== KILT_REVOCATION_STATUS_V1_TYPE)
    throw new CredentialMalformedError(
      `credentialStatus must have type ${KILT_REVOCATION_STATUS_V1_TYPE}`
    )
  const { assetInstance, assetNamespace, assetReference } = Caip19.parse(
    credentialStatus.id
  )
  const expectedAttestationId = credential.id.substring(
    KILT_CREDENTIAL_IRI_PREFIX.length
  )
  if (
    assetNamespace !== 'kilt' ||
    assetReference !== 'attestation' ||
    assetInstance !== expectedAttestationId
  ) {
    throw new CredentialMalformedError(
      `credentialStatus.id must end on 'kilt:attestation/${expectedAttestationId} in order to be verifiable with this proof`
    )
  }
  // 6. json-ld expand credentialSubject
  const expandedContents = jsonLdExpandCredentialSubject(credentialSubject)
  // 7. Transform to normalized statments and hash
  const { statements, digests } = normalizeClaims(expandedContents)
  if (statements.length !== proof.salt.length)
    throw new ProofMalformedError(
      'Violated expectation: number of normalized statements === number of salts'
    )
  // 8-9. Re-compute commitments
  const commitments = makeCommitments(
    digests,
    proof.salt.map((salt) => base58Decode(salt))
  )
  // 10. Assert commitments are in proof
  commitments.forEach((recomputed, index) => {
    if (!proof.commitments.includes(base58Encode(recomputed)))
      throw new SDKErrors.CredentialUnverifiableError(
        `No commitment for statement with digest ${u8aToHex(
          digests[index]
        )} and salt ${proof.salt[index]}`
      )
  })
  // 11. Compute root hash
  const rootHash = calculateRootHash(credential, proof)
  // 12. Compare against credential id
  if (credentialIdFromRootHash(rootHash) !== credential.id)
    throw new SDKErrors.CredentialUnverifiableError('root hash not verifiable')

  // 13. check that api is connected to the right network
  const { api = ConfigService.get('api') } = opts
  assertMatchingConnection(api, credential)
  // 14. query info from chain
  const {
    cTypeId: onChainCType,
    attester,
    timestamp,
    delegationId,
  } = await verifyAttestedAt(rootHash, base58Decode(proof.block), { api })

  const issuerMatches = attester === issuer
  const cTypeMatches = credential.type.includes(onChainCType)
  const delegationMatches = u8aEq(
    delegationId ?? new Uint8Array(),
    getDelegationNodeIdForCredential(credential) ?? new Uint8Array()
  )

  if (!(issuerMatches && cTypeMatches && delegationMatches)) {
    throw new SDKErrors.CredentialUnverifiableError(
      `Credential not matching on-chain data: issuer "${attester}", CType: "${onChainCType}", delegationId: "${delegationId}"`
    )
  }
  // 16. Check issuance timestamp
  const tIssuance = new Date(credential.issuanceDate).getTime()
  // Accept exact matches as well as timestamps rounded to 1-second precision
  if (
    !(
      timestamp === tIssuance ||
      Math.round(timestamp / 1000) * 1000 === tIssuance
    )
  ) {
    throw new SDKErrors.CredentialUnverifiableError(
      `block time ${new Date(
        timestamp
      ).toISOString()} does not match issuedAt (${credential.issuanceDate})`
    )
  }
  // 17. + 18. validate federatedTrustModel items
  const { federatedTrustModel = [] } = credential
  await Promise.all(
    federatedTrustModel.map(async (i) => {
      switch (i.type) {
        case KILT_ATTESTER_DELEGATION_V1_TYPE: {
          // check for expected authorities in delegation hierarchy
          if (i.delegators && typeof delegationId === 'string') {
            await verifyAuthoritiesInHierarchy(
              api,
              delegationId,
              new Set(i.delegators)
            )
          }
          break
        }
        case KILT_ATTESTER_LEGITIMATION_V1_TYPE: {
          // verify credentials used as legitimations
          await verifyLegitimation(i, api)
          break
        }
        default: {
          throw new CredentialMalformedError(
            `unknown type ${
              (i as { type: string }).type
            } in federatedTrustModel`
          )
        }
      }
    })
  )
}

/**
 * Helps with producing a derivative proof for selective disclosure of claims in credentialSubject.
 *
 * @param credentialInput The original verifiable credential.
 * @param proofInput The original proof.
 * @param disclosedClaims An array of claims that are to be revealed. The `id` of the credentialSubject is always revealed.
 * @returns A copy of the `credential` (without proof) where `credentialSubject` contains only selected claims and a copy of `proof` containing only `salt` entries for these.
 * @example
 * ```
 * const { proof, credential } = applySelectiveDisclosure(
 *  originalCredential,
 *  originalProof,
 *  ['name', 'address']
 * )
 * const derivedCredential = { ...credential, proof }
 * ```
 */
export function applySelectiveDisclosure(
  credentialInput: Omit<KiltCredentialV1, 'proof'>,
  proofInput: KiltAttestationProofV1,
  disclosedClaims: Array<keyof CredentialSubject>
): {
  credential: Omit<KiltCredentialV1, 'proof'>
  proof: KiltAttestationProofV1
} {
  const {
    credentialSubject,
    /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
    proof: _,
    ...remainder
  } = credentialInput as KiltCredentialV1
  // 1. Make normalized statements sorted by their hash value
  const expandedContents = jsonLdExpandCredentialSubject(credentialSubject)
  const { statements: statementsOriginal } = normalizeClaims(expandedContents)
  if (statementsOriginal.length !== proofInput.salt.length)
    throw new ProofMalformedError(
      'Violated expectation: number of normalized statements === number of salts'
    )
  // 2. Filter credentialSubject for claims to be revealed
  const reducedSubject = Object.entries(credentialSubject).reduce(
    (copy, [key, value]) => {
      if (disclosedClaims.includes(key)) {
        return { ...copy, [key]: value }
      }
      return copy
    },
    // context and id is always revealed
    { '@context': credentialSubject['@context'], id: credentialSubject.id }
  )
  // 3. Make normalized statements from reduced credentialSubject
  const { statements: reducedSet } = normalizeClaims(
    jsonLdExpandCredentialSubject(reducedSubject)
  )
  // 4. The order of the original statements (sorted by their hash) allows mapping them to the respective salt.
  // If a statement from the original set is also contained within the reduced set, keep the salt at the respective index.
  const salt = statementsOriginal.reduce((arr, statement, index) => {
    if (reducedSet.includes(statement)) {
      return [...arr, proofInput.salt[index]]
    }
    return arr
  }, [] as string[])

  return {
    credential: { ...remainder, credentialSubject: reducedSubject },
    proof: { ...proofInput, salt },
  }
}

/**
 * Initialize a new, prelimiary [[KiltAttestationProofV1]], which is the first step in issuing a new credential.
 *
 * @example
 * // start with initializing proof
 * const [proof, args] = initializeProof(credential)
 * const tx = api.tx.attestation.add(...args)
 * // after DID-authorizing and submitting transaction (taking note of the block hash and timestamp where the transaction was included)
 * const verifiableCredential = finalizeProof(credential, proof, {blockHash, timestamp})
 *
 * @param credential A KiltCredentialV1 for which a proof shall be created.
 * @returns A tuple where the first entry is the (partial) proof object and the second entry are the arguments required to create an extrinsic that anchors the proof on the KILT blockchain.
 */
export function initializeProof(
  credential: Omit<KiltCredentialV1, 'proof'>
): [
  KiltAttestationProofV1,
  Parameters<ApiPromise['tx']['attestation']['add']>
] {
  const { credentialSubject, nonTransferable, type } = credential

  if (nonTransferable !== true) {
    throw new Error('nonTransferable must be set to true')
  }

  // 1. json-ld expand credentialSubject
  const expandedContents = jsonLdExpandCredentialSubject(credentialSubject)
  // 2. Transform to normalized statments and hash
  const { digests } = normalizeClaims(expandedContents)

  // 3. Produce entropy & commitments
  const entropy = new Array(digests.length)
    .fill(undefined)
    .map(() => randomAsU8a(36))
  const commitments = makeCommitments(digests, entropy)

  // 4. Create proof object
  const salt = entropy.map((e) => base58Encode(e))
  const proof: KiltAttestationProofV1 = {
    type: ATTESTATION_PROOF_V1_TYPE,
    block: '',
    commitments: commitments.sort(u8aCmp).map((i) => base58Encode(i)),
    salt,
  }
  // 5. Prepare call
  const rootHash = calculateRootHash(credential, proof)
  const delegationId = getDelegationNodeIdForCredential(credential)

  return [
    proof,
    [
      rootHash,
      CType.idToHash(
        type.find((str) => str.startsWith('kilt:ctype:')) as ICType['$id']
      ),
      delegationId && { Delegation: delegationId },
    ],
  ]
}

/**
 * Finalizes a [[KiltAttestationProofV1]] after anchoring the prelimiary proof's root hash on the KILT blockchain.
 *
 * @example
 * // start with initializing proof
 * const [proof, args] = initializeProof(credential)
 * const tx = api.tx.attestation.add(...args)
 * // after DID-authorizing and submitting transaction (taking note of the block hash and timestamp where the transaction was included)
 * const verifiableCredential = finalizeProof(credential, proof, {blockHash, timestamp})
 *
 * @param credential The KiltCredentialV1 for which the proof was initialized.
 * @param proof The partial proof object created via `initializeProof`.
 * @param includedAt Information on the addition of the attestation record anchoring the proof on the KILT blockchain.
 * @param includedAt.blockHash The hash of the block in which the attestation record was added to the KILT blockchain.
 * @param includedAt.timestamp The timestamp of that block.
 * @param includedAt.genesisHash The genesis hash of the blockchain network. Default to the KILT mainnet (spiritnet).
 * @returns The credential where `id`, `credentialStatus`, and `issuanceDate` have been updated based on the on-chain attestation record, containing a finalized proof.
 */
export function finalizeProof(
  credential: Omit<KiltCredentialV1, 'proof'>,
  proof: KiltAttestationProofV1,
  {
    blockHash,
    timestamp,
    genesisHash = spiritnetGenesisHash,
  }: { blockHash: Uint8Array; timestamp: number; genesisHash?: Uint8Array }
): KiltCredentialV1 {
  const rootHash = calculateRootHash(credential, proof)
  return {
    ...credential,
    id: credentialIdFromRootHash(rootHash),
    credentialStatus: fromGenesisAndRootHash(genesisHash, rootHash),
    issuanceDate: new Date(timestamp).toISOString(),
    proof: { ...proof, block: base58Encode(blockHash) },
  }
}

export type AttestationHandler = (
  tx: Extrinsic,
  api: ApiPromise
) => Promise<{
  blockHash: Uint8Array
  timestamp?: number
}>

/**
 *
 * Creates a complete [[KiltAttestationProofV1]] for issuing a new credential.
 *
 * @param credential A [[KiltCredentialV1]] for which a proof shall be created.
 * @param opts Additional parameters.
 * @param opts.did The attester's DID URI.
 * @param opts.didSigner A signing callback to create the attester's signature over the transaction to store an attestation record on-chain.
 * @param opts.submitterAddress The address of the wallet that's going to cover the transaction fees.
 * @param opts.txSubmissionHandler Callback function handling extrinsic submission.
 * It receives an unsigned extrinsic and is expected to return the `blockHash` and `timestamp` when the extrinsic was included in a block.
 * This callback must thus take care of signing and submitting the extrinsic to the KILT blockchain as well as noting the inclusion block.
 * If no `timestamp` is returned by the callback, the timestamp is queried from the blockchain based on the block hash.
 * @returns The credential where `id`, `credentialStatus`, and `issuanceDate` have been updated based on the on-chain attestation record, containing a finalized proof.
 */
export async function issue(
  credential: Omit<KiltCredentialV1, 'proof'>,
  {
    did,
    didSigner,
    submitterAddress,
    txSubmissionHandler,
    ...otherParams
  }: {
    didSigner: SignExtrinsicCallback
    did: DidUri
    submitterAddress: KiltAddress
    txSubmissionHandler: AttestationHandler
  } & Parameters<typeof authorizeTx>[4]
): Promise<KiltCredentialV1> {
  const [proof, callArgs] = initializeProof(credential)
  const api = ConfigService.get('api')
  const call = api.tx.attestation.add(...callArgs)
  const didSigned = await authorizeTx(
    did,
    call,
    didSigner,
    submitterAddress,
    otherParams
  )
  const {
    blockHash,
    timestamp = (await api.query.timestamp.now.at(blockHash)).toNumber(),
  } = await txSubmissionHandler(didSigned, api)
  return finalizeProof(credential, proof, {
    blockHash,
    timestamp,
    genesisHash: api.genesisHash,
  })
}
