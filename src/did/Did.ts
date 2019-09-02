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
 * Dummy comment, so that typedoc ignores this file
 */
import Identity from '../identity/Identity'
import { factory } from '../config/ConfigLog'
import TxStatus from '../blockchain/TxStatus'
import { getIdentifierFromAddress } from './Did.utils'
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
  documentStore?: string
}

export default class Did implements IDid {
  /**
   * @description Queries the [Did] from chain using the [identifier]
   *
   * @param identifier the DIDs identifier
   * @returns promise containing the [[Did]] or [undefined]
   */
  public static queryByIdentifier(
    identifier: string
  ): Promise<IDid | undefined> {
    return queryByIdentifier(identifier)
  }

  /**
   * @description Queries the [Did] from chain using the [address]
   *
   * @param address the DIDs address
   * @returns promise containing the [[Did]] or [undefined]
   */
  public static queryByAddress(address: string): Promise<IDid | undefined> {
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
  public readonly documentStore?: string

  private constructor(
    identifier: string,
    publicBoxKey: string,
    publicSigningKey: string,
    documentStore?: string
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
