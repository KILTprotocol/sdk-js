/**
 * A Decentralized Identifier (DID) is a new type of identifier that is globally unique, resolveable with high availability, and cryptographically verifiable. Although it's not mandatory in KILT, users can optionally create a DID and anchor it to the KILT blockchain.
 * <br>
 * Official DID specification: [[https://w3c-ccg.github.io/did-primer/]].
 * ***
 * The [[Did]] class exposes methods to build, store and query decentralized identifiers.
 * @module DID
 * @preferred
 */

/**
 * Dummy comment needed for correct doc display, do not remove
 */
import Identity from '../identity/Identity'
import { factory } from '../config/ConfigLog'
import TxStatus from '../blockchain/TxStatus'
import IPublicIdentity from '../types/PublicIdentity'
import {
  getIdentifierFromAddress,
  getAddressFromIdentifier,
  createDefaultDidDocument,
  verifyDidDocumentSignature,
  signDidDocument,
} from './Did.utils'
import { store, queryByAddress, queryByIdentifier, remove } from './Did.chain'

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
  // id and context are the only mandatory ppties, described as "MUST"s in the w3c spec https://w3c.github.io/did-core/
  id: string
  '@context': string
}

export interface IDidDocumentPublicKey {
  id: string
  type: string
  controller: string
  publicKeyHex: string
}

export interface IDidDocumentPpties {
  authentication: object
  publicKey: IDidDocumentPublicKey[]
  service: any
}

export interface IDidDocument
  extends IDidDocumentCore,
    Partial<IDidDocumentPpties> {}

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
   * Builds a [[Did]] object from the given [[Identity]].
   *
   * @param identity The identity used to build the [[Did]] object.
   * @param documentStore The storage location of the associated DID Document; usally a URL.
   * @returns The [[Did]] object.
   */
  public static fromIdentity(identity: Identity, documentStore?: string): Did {
    const identifier = getIdentifierFromAddress(identity.address)
    return new Did(
      identifier,
      identity.boxPublicKeyAsHex,
      identity.signPublicKeyAsHex,
      documentStore
    )
  }

  /**
   * Stores the [[Did]] object on-chain.
   *
   * @param identity The identity used to store the [[Did]] object on-chain.
   * @returns A promise containing the [[TxStatus]] (transaction status).
   */
  public async store(identity: Identity): Promise<TxStatus> {
    log.debug(`Create tx for 'did.add'`)
    return store(this, identity)
  }

  /**
   * Queries the [[Did]] object from the chain using the [identifier].
   *
   * @param identifier A KILT DID identifier, e.g. "did:kilt:5CtPYoDuQQF...".
   * @returns A promise containing the [[Did]] or [null].
   */
  public static queryByIdentifier(identifier: string): Promise<IDid | null> {
    return queryByIdentifier(identifier)
  }

  /**
   * Queries the [[Did]] object from the chain using the [address].
   *
   * @param address The address associated to this [[Did]].
   * @returns A promise containing the [[Did]] or [null].
   */
  public static queryByAddress(address: string): Promise<IDid | null> {
    return queryByAddress(address)
  }

  /**
   * Removes the [[Did]] object attached to a given [[Identity]] from the chain.
   *
   * @param identity The identity for which to delete the [[Did]].
   * @returns A promise containing the [[TxStatus]] (transaction status).
   */
  public static async remove(identity: Identity): Promise<TxStatus> {
    log.debug(`Create tx for 'did.remove'`)
    return remove(identity)
  }

  /**
   * Gets the complete KILT DID from an [address] (in KILT, the method-specific ID is an address). Reverse of [[getAddressFromIdentifier]].
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
   * Gets the [address] from a complete KILT DID (in KILT, the method-specific ID is an address). Reverse of [[getIdentifierFromAddress]].
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
   * Signs (the hash of) a DID Document.
   *
   * @param didDocument A DID Document, e.g. created via [[createDefaultDidDocument]].
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
   * Verifies the signature of a DID Document, to check whether the data has been tampered with.
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
