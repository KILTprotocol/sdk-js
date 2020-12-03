import { SubmittableExtrinsic } from '@polkadot/api/promise/types'
/**
 * A Decentralized Identifier (DID) is a new type of identifier that is globally unique, resolvable with high availability, and cryptographically verifiable.
 * Although it's not mandatory in KILT, users can optionally create a DID and anchor it to the KILT blockchain.
 *
 * Official DID specification: [[https://w3c-ccg.github.io/did-primer/]].
 *
 * The [[Did]] class exposes methods to build, store and query decentralized identifiers.
 *
 * @packageDocumentation
 * @module DID
 * @preferred
 */

import { AnyJson } from '@polkadot/types/types'
import { factory } from '../config/ConfigService'
import Identity from '../identity/Identity'
import IPublicIdentity from '../types/PublicIdentity'
import { queryByAddress, queryByIdentifier, remove, store } from './Did.chain'
import {
  createDefaultDidDocument,
  getAddressFromIdentifier,
  getIdentifierFromAddress,
  signDidDocument,
  verifyDidDocumentSignature,
} from './Did.utils'

const log = factory.getLogger('DID')

export const IDENTIFIER_PREFIX = 'did:kilt:'
export const SERVICE_KILT_MESSAGING = 'KiltMessagingService'
export const KEY_TYPE_SIGNATURE = 'Ed25519VerificationKey2018'
export const KEY_TYPE_ENCRYPTION = 'X25519Salsa20Poly1305Key2018'
export const KEY_TYPE_AUTHENTICATION = 'Ed25519SignatureAuthentication2018'
export const CONTEXT = 'https://w3id.org/did/v1'

export interface IDid {
  /**
   * The DID identifier under which this DID object is stored on-chain.
   */
  identifier: string
  /**
   * The public box key of the associated identity.
   */
  publicBoxKey: string
  /**
   * The public signing key of the associated identity.
   */
  publicSigningKey: string
  /**
   * The document store reference, usually a URL.
   */
  documentStore: string | null
}

export interface IDidDocumentCore {
  // id and context are the only mandatory properties, described as "MUST"s in the w3c spec https://w3c.github.io/did-core/
  id: string
  '@context': string
}

export interface IDidDocumentPublicKey {
  id: string
  type: string
  controller: string
  publicKeyHex: string
}

export interface IDidDocumentProperties {
  authentication: Array<string | IDidDocumentPublicKey | AnyJson>
  publicKey: IDidDocumentPublicKey[]
  service: IDidService[]
}

export interface IDidService {
  type: string
  serviceEndpoint: string | AnyJson
  id?: string
  [key: string]: AnyJson
}

export interface IDidDocument
  extends IDidDocumentCore,
    Partial<IDidDocumentProperties> {}

export interface IDidDocumentSigned extends IDidDocument {
  signature: string
}

export default class Did implements IDid {
  public readonly identifier: string
  public readonly publicBoxKey: string
  public readonly publicSigningKey: string
  public readonly documentStore: string | null

  private constructor(
    identifier: string,
    publicBoxKey: string,
    publicSigningKey: string,
    documentStore: string | null = null
  ) {
    this.identifier = identifier
    this.publicBoxKey = publicBoxKey
    this.publicSigningKey = publicSigningKey
    this.documentStore = documentStore
  }

  /**
   * [STATIC] Builds a [[Did]] object from the given [[Identity]].
   *
   * @param identity The identity used to build the [[Did]] object.
   * @param documentStore The storage location of the associated DID Document; usually a URL.
   * @returns The [[Did]] object.
   */
  public static fromIdentity(identity: Identity, documentStore?: string): Did {
    const identifier = getIdentifierFromAddress(identity.address)
    return new Did(
      identifier,
      identity.getBoxPublicKey(),
      identity.signPublicKeyAsHex,
      documentStore
    )
  }

  /**
   * [ASYNC] Stores the [[Did]] object on-chain.
   *
   * @param identity The identity used to store the [[Did]] object on-chain.
   * @returns A promise containing the SubmittableExtrinsic (transaction status).
   */
  public async store(identity: Identity): Promise<SubmittableExtrinsic> {
    log.debug(`Create tx for 'did.add'`)
    return store(this, identity)
  }

  /**
   * [STATIC] Queries the [[Did]] object from the chain using the [identifier].
   *
   * @param identifier A KILT DID identifier, e.g. "did:kilt:5CtPYoDuQQF...".
   * @returns A promise containing the [[Did]] or [null].
   */
  public static queryByIdentifier(identifier: string): Promise<IDid | null> {
    return queryByIdentifier(identifier)
  }

  /**
   * [STATIC] Queries the [[Did]] object from the chain using the [address].
   *
   * @param address The address associated to this [[Did]].
   * @returns A promise containing the [[Did]] or [null].
   */
  public static queryByAddress(address: string): Promise<IDid | null> {
    return queryByAddress(address)
  }

  /**
   * [STATIC] Removes the [[Did]] object attached to a given [[Identity]] from the chain.
   *
   * @param identity The identity for which to delete the [[Did]].
   * @returns A promise containing a SubmittableExtrinsic (submittable transaction).
   */
  public static async remove(
    identity: Identity
  ): Promise<SubmittableExtrinsic> {
    log.debug(`Create tx for 'did.remove'`)
    return remove(identity)
  }

  /**
   * [STATIC] Gets the complete KILT DID from an [address] (in KILT, the method-specific ID is an address). Reverse of [[getAddressFromIdentifier]].
   *
   * @param address An address, e.g. "5CtPYoDuQQF...".
   * @returns The associated KILT DID identifier, e.g. "did:kilt:5CtPYoDuQQF...".
   */
  public static getIdentifierFromAddress(
    address: IPublicIdentity['address']
  ): IDid['identifier'] {
    return getIdentifierFromAddress(address)
  }

  /**
   * [STATIC] Gets the [address] from a complete KILT DID (in KILT, the method-specific ID is an address). Reverse of [[getIdentifierFromAddress]].
   *
   * @param identifier A KILT DID identifier, e.g. "did:kilt:5CtPYoDuQQF...".
   * @returns The associated address, e.g. "5CtPYoDuQQF...".
   */
  public static getAddressFromIdentifier(
    identifier: IDid['identifier']
  ): IPublicIdentity['address'] {
    return getAddressFromIdentifier(identifier)
  }

  /**
   * [STATIC] Signs (the hash of) a DID Document.
   *
   * @param didDocument A DID Document, e.g. Created via [[createDefaultDidDocument]].
   * @param identity [[Identity]] representing the DID subject for this DID Document, and used for signature.
   * @returns The signed DID Document.
   */
  public static signDidDocument(
    didDocument: IDidDocument,
    identity: Identity
  ): IDidDocumentSigned {
    return signDidDocument(didDocument, identity)
  }

  /**
   * [STATIC] Verifies the signature of a DID Document, to check whether the data has been tampered with.
   *
   * @param didDocument A signed DID Document.
   * @param identifier A KILT DID identifier, e.g. "did:kilt:5CtPYoDuQQF...".
   * @returns Whether the DID Document's signature is valid.
   */
  public static verifyDidDocumentSignature(
    didDocument: IDidDocumentSigned,
    identifier: string
  ): boolean {
    return verifyDidDocumentSignature(didDocument, identifier)
  }

  /**
   * Builds the default DID Document from this [[Did]] object.
   *
   * @param kiltServiceEndpoint A URI pointing to the service endpoint.
   * @returns The default DID Document.
   */
  public createDefaultDidDocument(kiltServiceEndpoint?: string): IDidDocument {
    return createDefaultDidDocument(
      this.identifier,
      this.publicBoxKey,
      this.publicSigningKey,
      kiltServiceEndpoint
    )
  }

  /**
   * [STATIC] Builds a default DID Document.
   *
   * @param identifier A KILT DID identifier, e.g. "did:kilt:5CtPYoDuQQF...".
   * @param publicBoxKey The public encryption key of the DID subject of this KILT DID identifier.
   * @param publicSigningKey The public signing key of the DID subject of this KILT DID identifier.
   * @param kiltServiceEndpoint A URI pointing to the service endpoint.
   * @returns The default DID Document.
   */
  public static createDefaultDidDocument(
    identifier: string,
    publicBoxKey: string,
    publicSigningKey: string,
    kiltServiceEndpoint?: string
  ): IDidDocument {
    return createDefaultDidDocument(
      identifier,
      publicBoxKey,
      publicSigningKey,
      kiltServiceEndpoint
    )
  }
}
