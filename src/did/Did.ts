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
import { KeyringPair } from '@polkadot/keyring/types'
import Identity from '../identity/Identity'
import { factory } from '../config/ConfigLog'
import TxStatus from '../blockchain/TxStatus'
import IPublicIdentity from '../types/PublicIdentity'
import {
  getIdentifierFromAddress,
  getAddressFromIdentifier,
  createDefaultDidDocument,
} from './Did.utils'
import { store, queryByAddress, queryByIdentifier, remove } from './Did.chain'
import Crypto from '../crypto'

const log = factory.getLogger('DID')

export const IDENTIFIER_PREFIX = 'did:kilt:'
export const SERVICE_KILT_MESSAGING = 'KiltMessagingService'
export const KEY_TYPE_SIGNATURE = 'Ed25519VerificationKey2018'
export const KEY_TYPE_ENCRYPTION = 'X25519Salsa20Poly1305Key2018'
export const KEY_TYPE_AUTHENTICATION = 'Ed25519SignatureAuthentication2018'
export const CONTEXT = 'https://w3id.org/did/v1'

export interface IDid {
  /**
   * The DID identifier under which it is store on chain.
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
   * The document store reference.
   */
  documentStore: string | null
}

export interface IDidDocumentCore {
  // id and context are the only mandatory ppties, described as "MUST"s in the w3c spec https://w3c.github.io/did-core/
  id: string
  '@context': string
}

export interface IDidDocumentPpties {
  authentication: object
  service: any
  publicKey: object
}

export interface IDidDocumentUnsigned
  extends IDidDocumentCore,
    Partial<IDidDocumentPpties> {}

export interface IDidDocumentSigned extends IDidDocumentUnsigned {
  didDocumentHash: string
  signature: string
}

export default class Did implements IDid {
  /**
   * Queries the [Did] from chain using the [identifier].
   *
   * @param identifier the DID identifier
   * @returns promise containing the [[Did]] or [null]
   */
  public static queryByIdentifier(identifier: string): Promise<IDid | null> {
    return queryByIdentifier(identifier)
  }

  /**
   * Gets the complete KILT DID from an [address] (in KILT, the method-specific ID is an address). Reverse of [[getAddressFromIdentifier]].
   *
   * @param address An address, e.g. "5CtPYoDuQQF...".
   * @returns The associated KILT DID, e.g. "did:kilt:5CtPYoDuQQF...".
   */
  public static getIdentifierFromAddress(
    address: IPublicIdentity['address']
  ): IDid['identifier'] {
    return getIdentifierFromAddress(address)
  }

  /**
   * Gets the [address] from a complete KILT DID (in KILT, the method-specific ID is an address). Reverse of [[getIdentifierFromAddress]].
   *
   * @param identifier A KILT DID, e.g. "did:kilt:5CtPYoDuQQF...".
   * @returns The associated address, e.g. "5CtPYoDuQQF...".
   */
  public static getAddressFromIdentifier(
    identifier: IDid['identifier']
  ): IPublicIdentity['address'] {
    return getAddressFromIdentifier(identifier)
  }

  /**
   * Queries the [Did] from chain using the [address]
   *
   * @param address the DIDs address
   * @returns promise containing the [[Did]] or [null]
   */
  public static queryByAddress(address: string): Promise<IDid | null> {
    return queryByAddress(address)
  }

  /**
   * Removes the [[Did]] attached to [identity] from chain
   *
   * @param identity the identity for which to delete the [[Did]]
   * @returns promise containing the [[TxStatus]]
   */
  public static async remove(identity: Identity): Promise<TxStatus> {
    log.debug(`Create tx for 'did.remove'`)
    return remove(identity)
  }

  /**
   * Builds a [[Did]] from the given [identity].
   *
   * @param identity the identity used to build the [[Did]]
   * @param documentStore optional document store reference
   * @returns the [[Did]]
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
   * Stores the [[Did]] on chain
   *
   * @param identity the identity used to store the [[Did]] on chain
   * @returns promise containing the [[TxStatus]]
   */
  public async store(identity: Identity): Promise<TxStatus> {
    log.debug(`Create tx for 'did.add'`)
    return store(this, identity)
  }

  /**
   * Builds the default DID document from this [[Did]] object.
   *
   * @param kiltServiceEndpoint - URI pointing to the service endpoint
   * @returns The default DID document
   */
  public createDefaultDidDocument(
    kiltServiceEndpoint?: string
  ): IDidDocumentUnsigned {
    return createDefaultDidDocument(
      this.identifier,
      this.publicBoxKey,
      this.publicSigningKey,
      kiltServiceEndpoint
    )
  }

  /**
   * Builds the default DID document from this [[Did]] object.
   *
   * @param kiltServiceEndpoint - URI pointing to the service endpoint
   * @returns The default DID document
   */
  public static createDefaultDidDocument(
    identifier: string,
    publicBoxKey: string,
    publicSigningKey: string,
    kiltServiceEndpoint?: string
  ): IDidDocumentUnsigned {
    return createDefaultDidDocument(
      identifier,
      publicBoxKey,
      publicSigningKey,
      kiltServiceEndpoint
    )
  }

  public createDefaultDidDocumentSigned(
    signKeyringPair: KeyringPair,
    kiltServiceEndpoint?: string
  ): IDidDocumentSigned {
    const unsignedDidDoc = this.createDefaultDidDocument(kiltServiceEndpoint)
    const didDocumentHash = Crypto.hashObjectAsStr(unsignedDidDoc)
    return {
      ...unsignedDidDoc,
      didDocumentHash,
      signature: Crypto.signStr(didDocumentHash, signKeyringPair),
    }
  }

  public static createDefaultDidDocumentSigned(
    identifier: string,
    publicBoxKey: string,
    publicSigningKey: string,
    signKeyringPair: KeyringPair,
    kiltServiceEndpoint?: string
  ): IDidDocumentSigned {
    const unsignedDidDoc = createDefaultDidDocument(
      identifier,
      publicBoxKey,
      publicSigningKey,
      kiltServiceEndpoint
    )
    const didDocumentHash = Crypto.hashObjectAsStr(unsignedDidDoc)
    return {
      ...unsignedDidDoc,
      didDocumentHash,
      signature: Crypto.signStr(didDocumentHash, signKeyringPair),
    }
  }

  public static createDefaultDidDocumentSignedFromIdentity(
    identity: Identity,
    kiltServiceEndpoint?: string
  ): IDidDocumentSigned {
    const unsignedDidDoc = createDefaultDidDocument(
      getIdentifierFromAddress(identity.address),
      identity.boxPublicKeyAsHex,
      identity.signPublicKeyAsHex,
      kiltServiceEndpoint
    )
    const didDocumentHash = Crypto.hashObjectAsStr(unsignedDidDoc)
    return {
      ...unsignedDidDoc,
      didDocumentHash,
      signature: identity.signStr(didDocumentHash),
    }
  }

  public static verifyDidDocumentSignature(
    didDocument: IDidDocumentSigned,
    address: string
  ): boolean {
    if (
      !didDocument ||
      !didDocument.didDocumentHash ||
      !didDocument.signature ||
      !address
    ) {
      throw new Error(
        `Missing data for verification (either didDocument, didDocumentHash, signature, or address is missing):\n
          didDocument:\n
          ${didDocument}\n
          didDocumentHash:\n
          ${didDocument.didDocumentHash}\n
          signature:\n
          ${didDocument.signature}\n
          address:\n
          ${address}\n
          `
      )
    }
    if (getAddressFromIdentifier(didDocument.id) !== address) {
      throw new Error(
        `The input address ${didDocument.id} doesn't match the DID Document's address ${address}`
      )
    }
    return Crypto.verify(
      didDocument.didDocumentHash,
      didDocument.signature,
      address
    )
  }
}
