import { AnyJson } from '@polkadot/types/types'
import { IDidDocumentPublicKey } from '@kiltprotocol/core'
import { ICType } from '@kiltprotocol/types'

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
export const KILT_CREDENTIAL_DIGEST_PROOF_TYPE = 'KILTCredentialDigest2020'

export type IPublicKeyRecord = Partial<IDidDocumentPublicKey> &
  Pick<IDidDocumentPublicKey, 'publicKeyHex' | 'type'>

export interface SelfSignedProof extends Proof {
  type: typeof KILT_SELF_SIGNED_PROOF_TYPE
  verificationMethod: string | IPublicKeyRecord
  signature: string
}
export interface AttestedProof extends Proof {
  type: typeof KILT_ATTESTED_PROOF_TYPE
  attesterAddress: string
}
export interface CredentialDigestProof extends Proof {
  type: typeof KILT_CREDENTIAL_DIGEST_PROOF_TYPE
  // map of unsalted property digests and nonces
  nonces: Record<string, string>
  // salted hashes of statements in credentialSubject to allow selective disclosure.
  claimHashes: string[]
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
