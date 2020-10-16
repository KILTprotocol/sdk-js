import { decodeAddress } from '@polkadot/keyring'
import { u8aToHex } from '@polkadot/util'
import { IDidDocumentPublicKey } from '../did/Did'
import { IAttestedClaim, Did, IPartialClaim } from '..'

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
