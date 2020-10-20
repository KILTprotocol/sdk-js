import { decodeAddress } from '@polkadot/keyring'
import { hexToU8a, u8aConcat, u8aToHex } from '@polkadot/util'
import { signatureVerify } from '@polkadot/util-crypto'
import { IDidDocumentPublicKey } from '../did/Did'
import { IAttestedClaim, Did, IPartialClaim, Attestation } from '..'
import { hash } from '../crypto'

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
const KILT_MATCH_PROPERTY_TYPE = 'KILTMatchProperty2020'

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
  credentialId: string | JSONreference
  attesterAddress: string | JSONreference
  delegationId?: string | JSONreference
}

interface matchPropertyProof extends proof {
  type: typeof KILT_MATCH_PROPERTY_TYPE
  protected: {
    claim: IPartialClaim
  }
  nonces: {
    claim: IPartialClaim
  }
}

interface KILTcredentialStatus {
  type: typeof KILT_STATUS_TYPE
  credentialId: string | JSONreference
  attesterAddress: string
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
  credentialSubject: Record<string, unknown>
  // digital proof that makes the credential tamper-evident
  proof: proof | proof[]
  nonTransferable?: boolean
  credentialStatus: KILTcredentialStatus
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

  // fill in property values
  const contentNonces: Record<string, string> = {}
  Object.keys(claimHashTree).forEach((key) => {
    const { nonce } = claimHashTree[key]
    if (nonce) {
      contentNonces[key] = nonce
    }
  })

  proof.push({
    type: KILT_MATCH_PROPERTY_TYPE,
    protected: { claim },
    nonces: {
      claim: {
        cTypeHash: cTypeHash.nonce,
        contents: contentNonces,
        owner: claimOwner.nonce,
      },
    },
  } as matchPropertyProof)

  // add attestation proof
  const attester = input.attestation.owner
  const issuer = Did.getIdentifierFromAddress(attester)
  proof.push({
    type: KILT_ATTESTED_PROOF_TYPE,
    attesterAddress: attester,
    credentialId: { $ref: '#/id' },
    delegationId: delegationId
      ? { $ref: '#/credentialSubject/protected/delegationId' }
      : undefined,
  } as attestedProof)

  const credentialStatus: KILTcredentialStatus = {
    type: KILT_STATUS_TYPE,
    attesterAddress: attester,
    credentialId: { $ref: '#/id' },
  }

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
    credentialStatus,
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
      if (typeof first === 'object') {
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
    // validate signature over root hash
    if (!signatureVerify(rootHash, proof.signature, signerPubKey).isValid) {
      throw new Error('signature could not be verified')
    }
    return result
  } catch (e) {
    result.verified = false
    result.error = e
    return result
  }
}

export async function verifyAttestedProof(
  credential: VerifiableCredential,
  proof: attestedProof
): Promise<VerificationResult> {
  const result: VerificationResult = { verified: true }
  try {
    // check proof
    if (proof.type !== KILT_ATTESTED_PROOF_TYPE)
      throw new Error('Proof type mismatch')
    let attesterAddress: string
    if (typeof proof.attesterAddress === 'string') {
      attesterAddress = proof.attesterAddress
      // } else if (proof.attesterAddress === { $ref: '#/id' }) {
      //   attesterAddress = credential.id
    } else {
      throw PROOF_MALFORMED_ERROR('attester address not understood')
    }
    let claimHash: string
    if (typeof proof.credentialId === 'string') {
      claimHash = proof.credentialId
    } else if (
      typeof proof.credentialId === 'object' &&
      proof.credentialId.$ref === '#/id'
    ) {
      claimHash = credential.id
    } else {
      throw PROOF_MALFORMED_ERROR('credentialId reference not understood')
    }
    let delegationId: string | null
    if (typeof proof.delegationId === 'undefined') {
      delegationId = null
    } else if (typeof proof.delegationId === 'string') {
      delegationId = proof.delegationId
    } else if (
      typeof proof.delegationId === 'object' &&
      proof.delegationId.$ref ===
        '#/credentialSubject/protected/delegationId' &&
      typeof (credential.credentialSubject as any).protected.delegationId ===
        'string'
    ) {
      delegationId = (credential.credentialSubject as any).protected
        .delegationId
    } else {
      throw PROOF_MALFORMED_ERROR('credentialId reference not understood')
    }
    const onChain = await Attestation.query(claimHash)
    if (!onChain)
      throw new Error(
        `attestation for credential with id ${claimHash} not found`
      )
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
    if (onChain.revoked) throw new Error('attestation revoked')
    return result
  } catch (e) {
    result.verified = false
    result.error = e
    return result
  }
}
