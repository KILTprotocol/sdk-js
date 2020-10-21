import { decodeAddress } from '@polkadot/keyring'
import { hexToU8a, u8aConcat, u8aToHex } from '@polkadot/util'
import { signatureVerify } from '@polkadot/util-crypto'
import CType from '../ctype'
import { ERROR_CLAIM_CONTENTS_MALFORMED } from '../errorhandling/SDKErrors'
import { IDidDocumentPublicKey } from '../did/Did'
import { IAttestedClaim, Did, Attestation, IClaim } from '..'
import { hash } from '../crypto'
import IRequestForAttestation from '../types/RequestForAttestation'

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
  protected: {
    claim: Partial<IClaim>
  }
  nonces: {
    claim: Partial<IClaim>
  }
}

interface KILTcredentialStatus {
  type: typeof KILT_STATUS_TYPE
}

interface VerifiableCredential {
  '@context': [typeof DEFAULT_VERIFIABLECREDENTIAL_CONTEXT, ...string[]]
  // the credential types, which declare what data to expect in the credential
  type: [typeof DEFAULT_VERIFIABLECREDENTIAL_TYPE, ...string[]]
  id: string
  // the entity that issued the credential
  issuer: string
  // when the credential was issued
  issuanceDate: string
  // claims about the subjects of the credential
  credentialSubject: {
    protected: Record<string, unknown>
    id?: string
  }
  // digital proof that makes the credential tamper-evident
  proof: proof | proof[]
  nonTransferable?: boolean
  credentialStatus?: KILTcredentialStatus
  expirationDate?: any
}

export default function attClaimToVC(
  input: IAttestedClaim,
  subjectDid = false
): VerifiableCredential {
  const {
    claimHashTree,
    claimOwner,
    cTypeHash,
    legitimations,
    delegationId,
    rootHash,
    claimerSignature,
    claim,
  } = input.request

  // write root hash to id
  const id = rootHash

  // add credential body containing hash tree only
  const contentHashes: Record<string, string> = {}
  Object.keys(claimHashTree).forEach((key) => {
    contentHashes[key] = claimHashTree[key].hash
  })
  const credentialSubject: VerifiableCredential['credentialSubject'] = {
    protected: {
      claim: {
        owner: claimOwner.hash,
        cTypeHash: cTypeHash.hash,
        contents: contentHashes,
      },
      legitimations: legitimations.map(
        (legitimation) => legitimation.attestation.claimHash
      ),
      delegationId,
    },
  }
  if (subjectDid)
    credentialSubject.id = Did.getIdentifierFromAddress(claim.owner)

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

  // add current date bc we have no issuance date on credential
  // TODO: could we get this from block time or something?
  const issuanceDate = new Date().toISOString()

  return {
    '@context': [DEFAULT_VERIFIABLECREDENTIAL_CONTEXT],
    type: [DEFAULT_VERIFIABLECREDENTIAL_TYPE],
    id,
    credentialSubject,
    nonTransferable: true,
    proof,
    issuer,
    issuanceDate,
  }
}

/**
 * This proof can be added to a credential to reveal selected properties to the verifier.
 * For each property to be revealed, it also contains a nonce which is required to verify against the hash in the credential.
 * Values, nonces and hashes are mapped to each through via identical data structures.
 *
 * @param partialClaim Claim object containing only the values you want to reveal.
 * @param requestForAttestation The full [[IRequestForAttestation]] object from which necessary nonces are picked.
 * @returns Proof object that can be included in a Verifiable Credential / Verifiable Presentation's proof section.
 */
export function makeRevealPropertiesProof(
  partialClaim: Partial<IClaim>,
  requestForAttestation: IRequestForAttestation
): revealPropertyProof {
  const { claimHashTree, cTypeHash, claimOwner } = requestForAttestation
  // pull nonce for each property in claim contents that has not been removed or nullified
  const contentNonces: Record<string, string> = {}
  if (partialClaim.contents) {
    Object.entries(partialClaim.contents).forEach(([key, value]) => {
      const { nonce } = claimHashTree[key]
      if (nonce && typeof value !== 'undefined' && value !== null) {
        contentNonces[key] = nonce
      }
    })
  }
  // compile object with structure identical to IClaim object
  const claimNonces: Partial<IClaim> = {
    contents: contentNonces,
  }
  // add nonces for cTypeHash & owner if not removed/nullified in claim
  if (partialClaim.cTypeHash) claimNonces.cTypeHash = cTypeHash.nonce
  if (partialClaim.owner) claimNonces.owner = claimOwner.nonce
  // return the proof containing values and nonces in two objects of identical structure
  return {
    type: KILT_REVEAL_PROPERTY_TYPE,
    protected: { claim: partialClaim },
    nonces: { claim: claimNonces },
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

    // collapse protected body to hash array, top to bottom
    const { protected: protectedBody } = credential.credentialSubject
    if (typeof protectedBody !== 'object' || !protectedBody)
      throw CREDENTIAL_MALFORMED_ERROR('protected credential body missing')

    const hashes: string[] = []
    let queue = Object.values(protectedBody)
    while (queue.length) {
      // pop first element off array
      const first = queue.shift()
      if (typeof first === 'object' && first) {
        // if first element is object, retrieve values and push to BEGINNING of queue
        queue = Object.values(first).concat(...queue)
      } else if (typeof first === 'string') {
        // if first element is hash, add to hash queue
        hashes.push(first)
      } else {
        // array should only contain hashes
        throw CREDENTIAL_MALFORMED_ERROR(
          'protected credential body must contain string values'
        )
      }
    }
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

    switch (typeof credential.credentialSubject.protected.delegationId) {
      case 'string':
        delegationId = credential.credentialSubject.protected.delegationId
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

function getByPath(object: Record<string, any>, path: string[]): any | null {
  return path.reduce((indexable, nextIndex) => indexable?.[nextIndex], object)
}

/**
 * Verifies a proof that reveals the content of selected properties to a verifier. This enables selective disclosure.
 * Values and nonces contained within this proof will be hashed, the result of which is expected to equal hashes on the credential.
 *
 * @param credential Verifiable Credential to verify proof against.
 * @param proof KILT self signed proof object.
 * @param schema If the CType for this credential is passed, the revealed properties will additionally be subjected to a schema validation.
 * @returns Object indicating whether proof could be verified.
 */
export function verifyRevealPropertyProof(
  credential: VerifiableCredential,
  proof: revealPropertyProof,
  schema?: CType
): VerificationResult {
  const result: VerificationResult = { verified: true }
  try {
    // check proof
    if (proof.type !== KILT_REVEAL_PROPERTY_TYPE)
      throw new Error('Proof type mismatch')
    if (
      typeof proof.nonces !== 'object' ||
      typeof proof.protected !== 'object'
    ) {
      throw PROOF_MALFORMED_ERROR(
        'proof must contain objects "protected" & "nonces"'
      )
    }
    const { protected: protectedBody } = credential.credentialSubject
    if (typeof protectedBody !== 'object' || !protectedBody)
      throw CREDENTIAL_MALFORMED_ERROR('protected credential body missing')

    // perform schema validation
    if (schema && !schema.verifyClaimStructure(proof.protected.claim as IClaim))
      throw ERROR_CLAIM_CONTENTS_MALFORMED()

    // iteratively hash nonce + value and compare to hash in credential
    const verificationQueue: string[][] = Object.entries(
      proof.protected
    ).map(([key]) => [key])
    if (verificationQueue.length === 0)
      throw PROOF_MALFORMED_ERROR('no verifiable properties given')
    while (verificationQueue.length) {
      // pop last element off array
      const path = verificationQueue.pop() || []
      const value = getByPath(proof.protected, path)
      if (typeof value === 'object' && value) {
        // if first value is object, retrieve values and push to end of queue
        verificationQueue.push(
          ...Object.entries(value).map(([key]) => [...path, key])
        )
      } else {
        const nonce = getByPath(proof.nonces, path)
        const hashInCredential = getByPath(protectedBody, path)
        const pathAsString = path.reduce((last, next) => `${last}.${next}`)
        if (typeof nonce !== 'string')
          throw PROOF_MALFORMED_ERROR(
            `nonce missing/malformed for ${pathAsString}`
          )
        if (typeof hashInCredential !== 'string')
          throw PROOF_MALFORMED_ERROR(`unrecognized property ${pathAsString}`)

        const stringified =
          typeof value !== 'string' ? JSON.stringify(value) : value
        if (u8aToHex(hash(nonce + stringified)) !== hashInCredential)
          throw new Error(`hash invalid for path ${pathAsString}`)
      }
    }
    return result
  } catch (e) {
    result.verified = false
    result.error = e
    return result
  }
}
