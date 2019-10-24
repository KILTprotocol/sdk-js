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
import { getIdentifierFromAddress, getAddressFromIdentifier } from './Did.utils'
import { store, queryByAddress, queryByIdentifier, remove } from './Did.chain'

const log = factory.getLogger('DID')

export const IDENTIFIER_PREFIX = 'did:kilt:'
export const SERVICE_KILT_MESSAGING = 'KiltMessagingService'
export const KEY_TYPE_SIGNATURE = 'Ed25519VerificationKey2018'
export const KEY_TYPE_ENCRYPTION = 'X25519Salsa20Poly1305Key2018'

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

export default class Did implements IDid {
  /**
   * @description Queries the [Did] from chain using the [identifier]
   *
   * @param identifier the DID identifier
   * @returns promise containing the [[Did]] or [null]
   */
  public static queryByIdentifier(identifier: string): Promise<IDid | null> {
    return queryByIdentifier(identifier)
  }

  /**
   * @description Gets the complete KILT DID from an [address] (in KILT, the method-specific ID is an address). Reverse of [[getAddressFromIdentifier]].
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
   * @description Gets the [address] from a complete KILT DID (in KILT, the method-specific ID is an address). Reverse of [[getIdentifierFromAddress]].
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
   * @description Queries the [Did] from chain using the [address]
   *
   * @param address the DIDs address
   * @returns promise containing the [[Did]] or [null]
   */
  public static queryByAddress(address: string): Promise<IDid | null> {
    return queryByAddress(address)
  }

  /**
   * @description Removes the [[Did]] attached to [identity] from chain
   *
   * @param identity the identity for which to delete the [[Did]]
   * @returns promise containing the [[TxStatus]]
   */
  public static async remove(identity: Identity): Promise<TxStatus> {
    log.debug(`Create tx for 'did.remove'`)
    return remove(identity)
  }

  /**
   * @description Builds a [[Did]] from the given [identity].
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
   * @description Stores the [[Did]] on chain
   *
   * @param identity the identity used to store the [[Did]] on chain
   * @returns promise containing the [[TxStatus]]
   */
  public async store(identity: Identity): Promise<TxStatus> {
    log.debug(`Create tx for 'did.add'`)
    return store(this, identity)
  }

  /**
   * @description Builds the default DID document from this [[Did]]
   *
   * @param kiltServiceEndpoint URI pointing to the service endpoint
   * @returns the default DID document
   */
  public getDefaultDocument(kiltServiceEndpoint?: string): object {
    const result = {
      id: this.identifier,
      authentication: {
        type: 'Ed25519SignatureAuthentication2018',
        publicKey: [`${this.identifier}#key-1`],
      },
      publicKey: [
        {
          id: `${this.identifier}#key-1`,
          type: KEY_TYPE_SIGNATURE,
          controller: this.identifier,
          publicKeyHex: this.publicSigningKey,
        },
        {
          id: `${this.identifier}#key-2`,
          type: KEY_TYPE_ENCRYPTION,
          controller: this.identifier,
          publicKeyHex: this.publicBoxKey,
        },
      ],
      '@context': 'https://w3id.org/did/v1',
      service: kiltServiceEndpoint
        ? [
            {
              type: SERVICE_KILT_MESSAGING,
              serviceEndpoint: kiltServiceEndpoint,
            },
          ]
        : [],
    }
    return result
  }
}
