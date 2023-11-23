/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { Did, ICType, IClaimContents } from '@kiltprotocol/types'

import { SDKErrors } from '@kiltprotocol/utils'
import { KiltAttestationProofV1, KiltCredentialV1, Types } from './V1/index.js'
import type { UnsignedVc, VerifiableCredential } from './V1/types.js'
import type { CTypeLoader } from './ctype/index.js'
import type { IssuerOptions } from './interfaces.js'

/**
 * Creates a new credential document as a basis for issuing a credential.
 * This document can be shown to users as a preview or be extended with additional properties before moving on to the second step of credential issuance:
 * Adding a `proof` to the document using the {@link issue} function to make the credential verifiable.
 *
 * @param arguments Object holding all arguments for credential creation.
 * @param arguments.type A type string identifying the (sub-)type of Verifiable Credential to be created.
 * This is added to the `type` field on the credential and determines the `credentialSchema` as well.
 * Defaults to the type {@link KiltCredentialV1.CREDENTIAL_TYPE KiltCredentialV1} which, for the time being, is also the only type supported.
 * @param arguments.issuer The Decentralized Identifier (DID) of the identity acting as the authority issuing this credential.
 * @param arguments.subject The DID identifying the subject of the credential, about which `claims` are made.
 * Sets the `credentialSubject.id` property of the credential.
 * @param arguments.claims An object containing key-value pairs that represent claims made about the subject.
 * These key-value pairs are added to the `credentialSubject` property of the credential.
 * @param arguments.cType CTypes are special credential subtypes that are defined by a schema describing claims that may be made about the subject and are registered on the Kilt blockchain.
 * Each Kilt credential is based on exactly one of these subtypes. This argument is therefore mandatory and expects the schema definition of a CType.
 * @param arguments.cTypeDefinitions Some CTypes are themselves composed of definitions taken from other CTypes; in that case, these definitions need to be supplied here.
 * Alternatively, you can set a {@link CTypeLoader} function that takes care of fetching all required definitions.
 * @param arguments.legitimations Any credentials that the issuer uses to provide legitimations for their authority for certifying the claims made.
 * @returns A (potentially only partial) credential that is yet to be finalized and made verifiable with a proof.
 */
export async function createCredential({
  type,
  issuer,
  subject,
  claims = {},
  cType,
  cTypeDefinitions,
  legitimations = [],
}: {
  type?: string
  issuer: Did
  subject: Did
  claims?: Record<string, unknown>
  cType: ICType
  cTypeDefinitions?: ICType[] | CTypeLoader
  // TODO: shall we support legitimations and delegations here or are these advanced features you'd have to dig for?
  // They may not exist in future versions, so not having this here may actually be a good idea.
  legitimations?: VerifiableCredential[]
}): Promise<UnsignedVc> {
  switch (type) {
    case undefined:
    case KiltCredentialV1.CREDENTIAL_TYPE: {
      legitimations.forEach((i) => {
        KiltCredentialV1.validateStructure(i as Types.KiltCredentialV1)
      })
      const credential = KiltCredentialV1.fromInput({
        issuer,
        subject,
        cType: cType.$id,
        claims: claims as IClaimContents,
        legitimations: legitimations as Types.KiltCredentialV1[],
      })

      let loadCTypes: CTypeLoader | false = false
      if (Array.isArray(cTypeDefinitions)) {
        const ctypeMap = new Map<string, ICType>()
        cTypeDefinitions.forEach((ct) => ctypeMap.set(ct.$id, ct))
        loadCTypes = (id) => {
          const definition = ctypeMap.get(id)
          if (typeof definition !== 'undefined') {
            return Promise.resolve(definition)
          }
          return Promise.reject(new SDKErrors.CTypeError(`unknown CType ${id}`))
        }
      } else if (typeof cTypeDefinitions === 'function') {
        loadCTypes = cTypeDefinitions
      }

      await KiltCredentialV1.validateSubject(credential, {
        cTypes: [cType],
        loadCTypes,
      })

      return credential
    }
    default:
      throw new SDKErrors.SDKError(
        `Only credential type ${KiltCredentialV1.CREDENTIAL_TYPE} is currently supported.`
      )
  }
}

/**
 * Issues a Verifiable Credential from on the input document by attaching a proof. Edits to the document may be made depending on the proof type.
 *
 * @param credential A credential document as returned by {@link createCredential}.
 * @param issuer Interfaces for interacting with the issuer identity for the purpose of generating a proof.
 * @param issuer.did The Decentralized Identifier (DID) of the issuer.
 * @param issuer.didDocument The DID Document of the issuer. If omitted, the issuer DID will be resolved internally to retrieve the document.
 * @param issuer.signers An array of signer interfaces, each allowing to request signatures made with a key associated with the issuer DID Document.
 * The function will select the first signer that matches requirements around signature algorithm and relationship of the key to the DID as given by the DID Document.
 * @param issuer.submitterAccount Some proof types require making transactions to effect state changes on the KILT blockchain.
 * The blockchain account whose address is specified here will be used to cover all transaction fees and deposits due for this operation.
 * As transactions to the blockchain need to be signed, `signers` is expected to contain a signer interface where the `id` matches this address.
 * @param issuer.authorizeTx Optional. Allows customizing the way state changes on the KILT blockchain are authorized with a signature made with one of the issuer's DID keys.
 * @param issuer.submitTx Optional. Allows customizing the way transactions are signed by the submitter account and submitted to the KILT blockchain.
 * If you are using a service that helps you submit and pay for transactions, this is your point of integration to it.
 * @param proofOptions Options that control proof generation.
 * @param proofOptions.proofType The type of proof to be created.
 * Defaults to {@link KiltAttestationProofV1.PROOF_TYPE KiltAttestationProofV1} which, as of now, is the only type suppported.
 * @param proofOptions.proofPurpose Controls which relationship to the DID is expected of the key selected for creating the proof.
 * Defaults to `assertionMethod`, which is also the only value supported for {@link KiltAttestationProofV1.PROOF_TYPE KiltAttestationProofV1} proofs.
 * @param proofOptions.now Allows manipulating the current date and time for the purpose of proof generation.
 * As of now, this has no effect though.
 */
export async function issue(
  credential: UnsignedVc,
  issuer: IssuerOptions,
  proofOptions: {
    proofType?: string
    proofPurpose?: string
    now?: Date // given that this has no effect, should I remove it for now?
  } = {}
): Promise<VerifiableCredential> {
  const { proofType } = proofOptions
  switch (proofType) {
    case undefined:
    case KiltAttestationProofV1.PROOF_TYPE: {
      const { didDocument, did } = issuer

      const cred = await KiltAttestationProofV1.issue(
        credential as Types.KiltCredentialV1,
        didDocument ?? did,
        issuer
      )

      return cred
    }
    default:
      throw new SDKErrors.SDKError(
        `Only proof type ${KiltAttestationProofV1.PROOF_TYPE} is currently supported.`
      )
  }
}
