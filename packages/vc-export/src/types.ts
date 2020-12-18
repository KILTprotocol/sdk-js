import { AnyJson } from '@polkadot/types/types'
import { ICType } from '@kiltprotocol/core'
import { IDidDocumentPublicKey } from '@kiltprotocol/core/lib/did/Did'

/**
 * Constant for default context.
 */
export const DEFAULT_VERIFIABLECREDENTIAL_CONTEXT =
  'https://www.w3.org/2018/credentials/v1'
/**
 * Constant for default type.
 */
export const DEFAULT_VERIFIABLECREDENTIAL_TYPE = 'VerifiableCredential'
/**
 * Constant for default presentation type.
 */
export const DEFAULT_VERIFIABLEPRESENTATION_TYPE = 'VerifiablePresentation'

export interface Proof {
  type: string
  created?: string
  proofPurpose?: string
  [key: string]: any
}

export const KILT_SELF_SIGNED_PROOF_TYPE = 'KILTSelfSigned2020'
export const KILT_ATTESTED_PROOF_TYPE = 'KILTAttestation2020'
export const KILT_REVEAL_PROPERTY_TYPE = 'KILTRevealProperties2020'

export type publicKey = Partial<IDidDocumentPublicKey> &
  Pick<IDidDocumentPublicKey, 'publicKeyHex' | 'type'>

export interface selfSignedProof extends Proof {
  type: typeof KILT_SELF_SIGNED_PROOF_TYPE
  verificationMethod: string | publicKey
  signature: string
}
export interface attestedProof extends Proof {
  type: typeof KILT_ATTESTED_PROOF_TYPE
  attesterAddress: string
  delegationId?: string
}
export interface revealPropertyProof extends Proof {
  type: typeof KILT_REVEAL_PROPERTY_TYPE
  nonces: Record<string, string>
}

export const KILT_STATUS_TYPE = 'KILTProtocolStatus2020'

export interface KILTcredentialStatus {
  type: typeof KILT_STATUS_TYPE
}

export const JSON_SCHEMA_TYPE = 'JsonSchemaValidator2018'

export interface CredentialSchema {
  '@id': string
  '@type': typeof JSON_SCHEMA_TYPE
  schema: ICType['schema']
  modelVersion?: string
  name?: string
  author?: string
  authored?: string
  proof?: Proof
}

export interface VerifiableCredential {
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
  proof: Proof | Proof[]
  nonTransferable?: boolean
  credentialStatus?: KILTcredentialStatus
  credentialSchema?: CredentialSchema
  expirationDate?: any
}

export interface VerifiablePresentation {
  '@context': [typeof DEFAULT_VERIFIABLECREDENTIAL_CONTEXT, ...string[]]
  type: [typeof DEFAULT_VERIFIABLEPRESENTATION_TYPE, ...string[]]
  verifiableCredential: VerifiableCredential | VerifiableCredential[]
  holder?: string
  proof: Proof | Proof[]
}
