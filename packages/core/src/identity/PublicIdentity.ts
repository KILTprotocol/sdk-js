/**
 * A [[PublicIdentity]] object exposes only public information such as the public address, but doesn't expose any secrets such as private keys.
 *
 * @packageDocumentation
 * @module PublicIdentity
 */

import { IPublicIdentity } from '@kiltprotocol/types'
import Did, {
  IDENTIFIER_PREFIX,
  KEY_TYPE_ENCRYPTION,
  SERVICE_KILT_MESSAGING,
} from '../did/Did'
import { getAddressFromIdentifier } from '../did/Did.utils'

export interface IURLResolver {
  resolve(url: string): Promise<Record<string, unknown> | null>
}

type DIDPublicKey = {
  id: string
  type: string
  publicKeyHex: string
}

type DIDService = {
  id: string
  type: string
  serviceEndpoint: string
}

type DIDDocument = {
  id: string
  publicKey: DIDPublicKey[]
  service: DIDService[]
}

type DIDResult = {
  didDocument: DIDDocument
}

function isDIDDocument(object: Record<string, unknown>): object is DIDDocument {
  const didDocument = object as DIDDocument
  return !!didDocument.id && !!didDocument.publicKey && !!didDocument.service
}

function isDIDResult(object: Record<string, unknown>): object is DIDResult {
  return isDIDDocument((object as DIDResult).didDocument)
}

export default class PublicIdentity implements IPublicIdentity {
  /**
   * [STATIC] Creates a new Public Identity from a DID document (DID - Decentralized Identifiers: https://w3c-ccg.github.io/did-spec/).
   *
   * @param didDocument - Contains the public key, external ID and service endpoint.
   * @returns A new [[PublicIdentity]] object.
   * @example ```javascript
   * const didDocument = {
   *   id: 'did:kilt:1234567',
   *   authentication: [
   *     {
   *       type: 'Ed25519SignatureAuthentication2018',
   *       publicKey: ['did:kilt:1234567#key-1'],
   *     },
   *   ],
   *   publicKey: [
   *     {
   *       id: 'did:kilt:1234567#key-1',
   *       type: 'Ed25519VerificationKey2018',
   *       controller: 'did:kilt:1234567',
   *       publicKeyHex: '0x25346245...',
   *     },
   *     {
   *       id: 'did:kilt:1234567#key-2',
   *       type: 'X25519Salsa20Poly1305Key2018',
   *       controller: 'did:kilt:1234567',
   *       publicKeyHex: '0x98765456...',
   *     },
   *   ],
   *   service: [
   *     {
   *       type: 'KiltMessagingService',
   *       serviceEndpoint: 'http://services.kilt.io/messaging',
   *     },
   *   ],
   * };
   * PublicIdentity.fromDidDocument(didDocument);
   * ```
   */
  public static fromDidDocument(
    didDocument: Record<string, unknown>
  ): IPublicIdentity | null {
    if (!isDIDDocument(didDocument)) {
      return null
    }

    try {
      return new PublicIdentity(
        didDocument.id.startsWith(IDENTIFIER_PREFIX)
          ? getAddressFromIdentifier(didDocument.id)
          : didDocument.id,
        this.getJSONProperty(
          didDocument,
          'publicKey',
          'type',
          KEY_TYPE_ENCRYPTION,
          'publicKeyHex'
        ),
        this.getJSONProperty(
          didDocument,
          'service',
          'type',
          SERVICE_KILT_MESSAGING,
          'serviceEndpoint'
        )
      )
    } catch (e) {
      return null
    }
  }

  /**
   * [STATIC] [ASYNC] Resolves a decentralized identifier (DID) into a [[PublicIdentity]].
   *
   * @param identifier - The Decentralized Identifier to be resolved.
   * @param urlResolver  - A URL resolver, which is used to query the did document.
   * @returns A new [[PublicIdentity]] object.
   * @example ```javascript
   * const urlResolver = {
   *   resolve: (url: string) => {
   *     return fetch(url).then((response) => response.json());
   *   },
   * };
   * const identifier = 'did:kilt:1234567';
   * PublicIdentity.resolveFromDid(identifier, urlResolver);
   * ```
   */
  public static async resolveFromDid(
    identifier: string,
    urlResolver: IURLResolver
  ): Promise<IPublicIdentity | null> {
    if (identifier.startsWith(IDENTIFIER_PREFIX)) {
      const did = await Did.queryByIdentifier(identifier)
      if (did !== null) {
        const didDocument = did.documentStore
          ? await urlResolver.resolve(did.documentStore)
          : null
        // TODO: check, if did document is complete
        if (didDocument) {
          return this.fromDidDocument(didDocument)
        }
        return new PublicIdentity(
          getAddressFromIdentifier(did.identifier),
          did.publicBoxKey
        )
      }
    } else {
      const didResult = await urlResolver.resolve(
        `https://uniresolver.io/1.0/identifiers/${encodeURIComponent(
          identifier
        )}`
      )
      if (didResult && isDIDResult(didResult)) {
        return this.fromDidDocument(didResult.didDocument)
      }
    }
    return null
  }

  /**
   * The SS58 account address of the identity on the KILT blockchain.
   */
  public readonly address: IPublicIdentity['address']

  /**
   * The public encryption key, encoded as a hexadecimal string.
   */
  public readonly boxPublicKeyAsHex: IPublicIdentity['boxPublicKeyAsHex']

  /**
   * The URL where the identity can be reached at.
   */
  public readonly serviceAddress?: IPublicIdentity['serviceAddress']

  /**
   * Builds a new [[PublicIdentity]] instance.
   *
   * @param address - A public address.
   * @param boxPublicKeyAsHex - The public encryption key.
   * @param serviceAddress - The address of the service used to retrieve the DID.
   * @example ```javascript
   * const identity = new PublicIdentity(address, boxPublicKeyAsHex, serviceAddress);
   * ```
   */
  public constructor(
    address: IPublicIdentity['address'],
    boxPublicKeyAsHex: IPublicIdentity['boxPublicKeyAsHex'],
    serviceAddress?: IPublicIdentity['serviceAddress']
  ) {
    this.address = address
    this.boxPublicKeyAsHex = boxPublicKeyAsHex
    this.serviceAddress = serviceAddress
  }

  private static getJSONProperty(
    did: Record<string, any>,
    listProperty: string,
    filterKey: string,
    filterValue: string,
    property: string
  ): string {
    if (!did[listProperty]) {
      throw Error()
    }
    const listOfObjects: Array<Record<string, any>> = did[listProperty]

    const correctObj = listOfObjects.find((object) => {
      return object[filterKey] && object[filterKey] === filterValue
    })

    if (correctObj && correctObj[property]) {
      return correctObj[property]
    }

    throw new Error()
  }
}
