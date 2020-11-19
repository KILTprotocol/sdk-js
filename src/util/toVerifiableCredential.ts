import { decodeAddress } from '@polkadot/keyring'
import { hexToU8a, u8aConcat, u8aToHex } from '@polkadot/util'
import { blake2AsHex, signatureVerify } from '@polkadot/util-crypto'
import { AnyJson } from '@polkadot/types/types'
import jsonld from 'jsonld'
import { ERROR_CLAIM_CONTENTS_MALFORMED } from '../errorhandling/SDKErrors'
import { IDidDocumentPublicKey } from '../did/Did'
import {
  IAttestedClaim,
  Did,
  Attestation,
  ICType,
  // ClaimUtils,
  CTypeUtils,
} from '..'
import { hash, Hasher } from '../crypto'
import IRequestForAttestation from '../types/RequestForAttestation'
import { hashClaimContents, PartialClaim, toJsonLD } from '../claim/Claim.utils'

/**
 * Constant for default context.
 */
const DEFAULT_VERIFIABLECREDENTIAL_CONTEXT =
  'https://www.w3.org/2018/credentials/v1'
/**
 * Constant for default type.
 */
const DEFAULT_VERIFIABLECREDENTIAL_TYPE = 'VerifiableCredential'
/**
 * Constant for default type.
 */
// const DEFAULT_VERIFIABLEPRESENTATION_TYPE = 'VerifiablePresentation'

const KILT_SELF_SIGNED_PROOF_TYPE = 'KILTSelfSigned2020'
const KILT_ATTESTED_PROOF_TYPE = 'KILTAttestation2020'
const KILT_REVEAL_PROPERTY_TYPE = 'KILTRevealProperties2020'

const KILT_STATUS_TYPE = 'KILTProtocolStatus2020'

const JSON_SCHEMA_TYPE = 'JsonSchemaValidator2018'

interface JSONreference {
  $ref: string
}

type publicKey = Partial<IDidDocumentPublicKey> &
  Pick<IDidDocumentPublicKey, 'publicKeyHex' | 'type'>

interface proof {
  type: string
  created?: string
  proofPurpose?: string
  [key: string]: any
}

interface selfSignedProof extends proof {
  type: typeof KILT_SELF_SIGNED_PROOF_TYPE
  verificationMethod: string | publicKey
  signature: string
}

interface attestedProof extends proof {
  type: typeof KILT_ATTESTED_PROOF_TYPE
  attesterAddress: string | JSONreference
  delegationId?: string | JSONreference
}

interface revealPropertyProof extends proof {
  type: typeof KILT_REVEAL_PROPERTY_TYPE
  nonces: Record<string, string>
}

interface KILTcredentialStatus {
  type: typeof KILT_STATUS_TYPE
}

interface CredentialSchema {
  '@id': string
  '@type': typeof JSON_SCHEMA_TYPE
  schema: ICType['schema']
  modelVersion?: string
  name?: string
  author?: string
  authored?: string
  proof?: proof
}

interface VerifiableCredential {
  '@context': [typeof DEFAULT_VERIFIABLECREDENTIAL_CONTEXT, ...string[]]
  // the credential types, which declare what data to expect in the credential
  type: [typeof DEFAULT_VERIFIABLECREDENTIAL_TYPE, ...string[]]
  id: string
  // claims about the subjects of the credential
  credentialSubject: Record<string, AnyJson>
  // salted hashes of statements in credentialSubject to allow selective disclosure
  claimHashes: string[]
  // the entity that issued the credential
  issuer: string
  // when the credential was issued
  issuanceDate: string
  // Ids / digests of claims that empower the issuer to provide judegment
  legitimationIds: string[]
  // Id / digest that represents a delegation of authority to the issuer
  delegationId?: string
  // digital proof that makes the credential tamper-evident
  proof: proof | proof[]
  nonTransferable?: boolean
  credentialStatus?: KILTcredentialStatus
  credentialSchema?: CredentialSchema
  expirationDate?: any
}

/**
 * This proof is added to a credential to proove that revealed properties were attested in the original credential.
 * For each property to be revealed, it contains an unsalted hash of the statement plus a nonce which is required to verify against the salted hash in the credential.
 * Statements and nonces are mapped to each other through the unsalted hashes.
 *
 * @param partialClaim Claim object containing only the values you want to reveal.
 * @param requestForAttestation The full [[IRequestForAttestation]] object from which necessary nonces are picked.
 * @returns Proof object that can be included in a Verifiable Credential / Verifiable Presentation's proof section.
 */
export function makeRevealPropertiesProof(
  partialClaim: PartialClaim,
  requestForAttestation: IRequestForAttestation
): revealPropertyProof {
  const { claimNonceMap } = requestForAttestation
  // recreate (partial) nonce map from partial claim and full nonce map
  const { nonceMap: claimNonces } = hashClaimContents(partialClaim, {
    nonces: claimNonceMap,
  })

  // return the proof containing nonces which can be mapped via an unsalted hash of the statement
  return {
    type: KILT_REVEAL_PROPERTY_TYPE,
    nonces: claimNonces,
  }
}

export default function attClaimToVC(
  input: IAttestedClaim,
  subjectDid = false,
  ctype?: ICType
): VerifiableCredential {
  const {
    claimHashes,
    legitimations,
    delegationId,
    rootHash,
    claimerSignature,
    claim,
  } = input.request

  // write root hash to id
  const id = rootHash

  // transform & annotate claim to be json-ld and VC conformant
  const { credentialSubject } = toJsonLD(
    { ...claim, owner: subjectDid ? `did:kilt:${claim.owner}` : claim.owner },
    false
  ) as Record<string, Record<string, AnyJson>>

  // add self-signed proof
  const proof: proof[] = []
  proof.push({
    type: KILT_SELF_SIGNED_PROOF_TYPE,
    verificationMethod: {
      type: 'Ed25519VerificationKey2018',
      publicKeyHex: u8aToHex(decodeAddress(claim.owner)),
    },
    signature: claimerSignature,
  } as selfSignedProof)

  // add attestation proof
  const attester = input.attestation.owner
  const issuer = Did.getIdentifierFromAddress(attester)
  proof.push({
    type: KILT_ATTESTED_PROOF_TYPE,
    attesterAddress: attester,
  } as attestedProof)

  // add hashed properties proof
  proof.push(makeRevealPropertiesProof(claim, input.request))

  // add current date bc we have no issuance date on credential
  // TODO: could we get this from block time or something?
  const issuanceDate = new Date().toISOString()

  // if ctype is given, add as credential schema
  let credentialSchema: CredentialSchema | undefined
  if (ctype) {
    const { schema, owner } = ctype
    credentialSchema = {
      '@id': schema.$id,
      '@type': JSON_SCHEMA_TYPE,
      name: schema.title,
      schema,
      author: owner || undefined,
    }
  }

  const legitimationIds = legitimations.map((leg) => leg.request.rootHash)

  return {
    '@context': [DEFAULT_VERIFIABLECREDENTIAL_CONTEXT],
    type: [DEFAULT_VERIFIABLECREDENTIAL_TYPE],
    id,
    credentialSubject,
    legitimationIds,
    delegationId: delegationId || undefined,
    claimHashes,
    issuer,
    issuanceDate,
    nonTransferable: true,
    proof,
    credentialSchema,
  }
}

interface VerificationResult {
  verified: boolean
  error?: Error
}

const CREDENTIAL_MALFORMED_ERROR = (reason: string): Error =>
  new Error(`Credential malformed: ${reason}`)

const PROOF_MALFORMED_ERROR = (reason: string): Error =>
  new Error(`Proof malformed: ${reason}`)

/**
 * Verifies a KILT self signed proof (claimer signature) against a KILT style Verifiable Credential.
 * This entails computing the root hash from the hashes contained in the `protected` section of the credentialSubject.
 * The resulting hash is then verified against the signature and public key contained in the proof (the latter
 * could be a DID reference in the future). It is also expected to by identical to the credential id.
 *
 * @param credential Verifiable Credential to verify proof against.
 * @param proof KILT self signed proof object.
 * @returns Object indicating whether proof could be verified.
 */
export function verifySelfSignedProof(
  credential: VerifiableCredential,
  proof: selfSignedProof
): VerificationResult {
  const result: VerificationResult = { verified: true }
  try {
    // check proof
    if (proof.type !== KILT_SELF_SIGNED_PROOF_TYPE)
      throw new Error('Proof type mismatch')
    if (!proof.signature) throw PROOF_MALFORMED_ERROR('signature missing')
    let signerPubKey: string
    const { verificationMethod } = proof
    if (
      typeof verificationMethod === 'object' &&
      verificationMethod.publicKeyHex
    ) {
      if (verificationMethod.type !== 'Ed25519VerificationKey2018')
        throw PROOF_MALFORMED_ERROR('signature missing')
      signerPubKey = verificationMethod.publicKeyHex
    } else {
      throw PROOF_MALFORMED_ERROR(
        'proof must contain public key; resolve did key references beforehand'
      )
    }

    // collect hashes from hash array, legitimations & delegationId
    const hashes: string[] = credential.claimHashes.concat(
      credential.legitimationIds,
      credential.delegationId || []
    )
    // convert hex hashes to byte arrays & concatenate
    const concatenated = u8aConcat(
      ...hashes.map((hexHash) => hexToU8a(hexHash))
    )
    const rootHash = hash(concatenated)

    // throw if root hash does not match expected (=id)
    const expectedRootHash = credential.id
    if (expectedRootHash !== u8aToHex(rootHash))
      throw new Error('computed root hash does not match expected')

    // validate signature over root hash
    if (!signatureVerify(rootHash, proof.signature, signerPubKey).isValid)
      throw new Error('signature could not be verified')
    return result
  } catch (e) {
    result.verified = false
    result.error = e
    return result
  }
}

/**
 * Verifies a KILT attestation proof by querying data from the KILT blockchain.
 * This includes querying the KILT blockchain with the credential id, which returns an attestation record if attested.
 * This record is then compared against attester address and delegation id (the latter of which is taken directly from the credential).
 *
 * @param credential Verifiable Credential to verify proof against.
 * @param proof KILT self signed proof object.
 * @returns Object indicating whether proof could be verified.
 */
export async function verifyAttestedProof(
  credential: VerifiableCredential,
  proof: attestedProof
): Promise<VerificationResult> {
  const result: VerificationResult = { verified: true }
  try {
    // check proof
    if (proof.type !== KILT_ATTESTED_PROOF_TYPE)
      throw new Error('Proof type mismatch')
    const { attesterAddress } = proof
    if (typeof attesterAddress !== 'string' || !attesterAddress)
      throw PROOF_MALFORMED_ERROR('attester address not understood')
    const claimHash = credential.id
    if (typeof claimHash !== 'string' || !claimHash)
      throw CREDENTIAL_MALFORMED_ERROR(
        'claim id (=claim hash) missing / invalid'
      )
    let delegationId: string | null

    switch (typeof credential.delegationId) {
      case 'string':
        delegationId = credential.delegationId
        break
      case 'undefined':
        delegationId = null
        break
      default:
        throw CREDENTIAL_MALFORMED_ERROR('delegationId not understood')
    }
    // query on-chain data by credential id (= claim root hash)
    const onChain = await Attestation.query(claimHash)
    // if not found, credential has not been attested, proof is invalid
    if (!onChain)
      throw new Error(
        `attestation for credential with id ${claimHash} not found`
      )
    // if data on proof does not correspond to data on chain, proof is incorrect
    if (
      onChain.owner !== attesterAddress ||
      onChain.delegationId !== delegationId
    )
      throw new Error(
        `proof not matching on-chain data: proof ${{
          attester: attesterAddress,
          delegation: delegationId,
        }}`
      )
    // if proof data is valid but attestation is flagged as revoked, credential is no longer valid
    if (onChain.revoked) throw new Error('attestation revoked')
    return result
  } catch (e) {
    result.verified = false
    result.error = e
    return result
  }
}

/**
 * Verifies a proof that reveals the content of selected properties to a verifier. This enables selective disclosure.
 * Values and nonces contained within this proof will be hashed, the result of which is expected to equal hashes on the credential.
 *
 * @param credential Verifiable Credential to verify proof against.
 * @param proof KILT self signed proof object.
 * @param options Allows passing custom hasher.
 * @param options.hasher A custom hasher. Defaults to hex(blake2-256('nonce'+'value')).
 * @returns Object indicating whether proof could be verified.
 */
export async function verifyRevealPropertyProof(
  credential: VerifiableCredential,
  proof: revealPropertyProof,
  options: { hasher?: Hasher } = {}
): Promise<VerificationResult> {
  const {
    hasher = (value, nonce?) => blake2AsHex((nonce || '') + value, 256),
  } = options
  const result: VerificationResult = { verified: true }
  try {
    // check proof
    if (proof.type !== KILT_REVEAL_PROPERTY_TYPE)
      throw new Error('Proof type mismatch')
    if (typeof proof.nonces !== 'object') {
      throw PROOF_MALFORMED_ERROR('proof must contain object "nonces"')
    }
    if (typeof credential.credentialSubject !== 'object')
      throw CREDENTIAL_MALFORMED_ERROR('credential subject missing')

    // expand credentialSubject keys by compacting with empty context credential to produce statements
    const flattened = await jsonld.compact(credential.credentialSubject, {})
    const statements = Object.entries(flattened).map(([key, value]) =>
      JSON.stringify({ [key]: value })
    )
    const expectedUnsalted = Object.keys(proof.nonces)

    statements.forEach((stmt) => {
      const unsalted = hasher(stmt)
      if (!expectedUnsalted.includes(unsalted))
        throw PROOF_MALFORMED_ERROR(
          `Proof contains no digest for statement ${stmt}`
        )
      const nonce = proof.nonces[unsalted]
      if (!credential.claimHashes.includes(hasher(unsalted, nonce)))
        throw new Error(
          `Proof for statement ${stmt} not valid against credential`
        )
    })
    return result
  } catch (e) {
    result.verified = false
    result.error = e
    return result
  }
}

export function validateSchema(
  credential: VerifiableCredential
): VerificationResult {
  const result: VerificationResult = { verified: false }
  try {
    const { schema } = credential.credentialSchema || {}
    // if present, perform schema validation
    if (schema) {
      // there's no rule against additional properties, so we can just validate the ones that are there
      if (!CTypeUtils.verifySchema(credential.credentialSubject, schema))
        throw ERROR_CLAIM_CONTENTS_MALFORMED()
      return { verified: true }
    }
  } catch (e) {
    result.error = e
  }
  return result
}
