/**
 * @module Identity
 */
import Did, {
  IDid,
  KEY_TYPE_ENCRYPTION,
  SERVICE_KILT_MESSAGING,
  IDENTIFIER_PREFIX,
} from '../did/Did'
import { getAddressFromIdentifier } from '../did/Did.utils'
import IPublicIdentity from '../types/PublicIdentity'

export interface IURLResolver {
  resolve(url: string): Promise<object | undefined>
}

export default class PublicIdentity implements IPublicIdentity {
  /**
   * @description (STATIC) Creates a new Public Identity from a DID (Decentralised identifier) object.
   * @param didDocument - Contains the public key, external ID and service endpoint
   * @returns A new [[PublicIdentity]] object
   * @example
   * ```javascript
   *
   * const identity = PublicIdentity.fromDidDocument(didDocument);
   *
   * ```
   */
  public static fromDidDocument(
    didDocument: object
  ): IPublicIdentity | undefined {
    try {
      return new PublicIdentity(
        /* tslint:disable:no-string-literal */
        didDocument['id'].startsWith(IDENTIFIER_PREFIX)
          ? getAddressFromIdentifier(didDocument['id'])
          : didDocument['id'],
        /* tslint:enable:no-string-literal */
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
      return undefined
    }
  }
  /**
   * @description (STATIC) (ASYNC) Resolves internal and external DIDs (Decentralised identifier) from a specific identifier
   * @param identifier - URL scheme identifier
   * @param urlResolver  - DID URL always identifies the resource to be located
   * @returns  A new [[PublicIdentity]] object
   * @example
   * ```javascript
   *
   * const identity = PublicIdentity.resolveFromDid(identifier, urlResolver)
   *
   * ```
   */
  public static async resolveFromDid(
    identifier: string,
    urlResolver: IURLResolver
  ): Promise<IPublicIdentity | undefined> {
    if (identifier.startsWith(IDENTIFIER_PREFIX)) {
      const did: IDid | undefined = await Did.queryByIdentifier(identifier)
      if (did !== undefined) {
        const didDocument: object | undefined = did.documentStore
          ? await urlResolver.resolve(did.documentStore)
          : undefined
        if (didDocument) {
          return this.fromDidDocument(didDocument)
        } else {
          return new PublicIdentity(
            getAddressFromIdentifier(did.identifier),
            did.publicBoxKey
          )
        }
      }
    } else {
      const didResult = await urlResolver.resolve(
        'https://uniresolver.io/1.0/identifiers/' +
          encodeURIComponent(identifier)
      )
      /* tslint:disable:no-string-literal */
      if (didResult && didResult['didDocument']) {
        return this.fromDidDocument(didResult['didDocument'])
      }
      /* tslint:enable:no-string-literal */
    }
    return undefined
  }

  public readonly address: IPublicIdentity['address']
  public readonly boxPublicKeyAsHex: IPublicIdentity['boxPublicKeyAsHex']
  public readonly serviceAddress?: IPublicIdentity['serviceAddress']

  constructor(
    address: IPublicIdentity['address'],
    boxPublicKeyAsHex: IPublicIdentity['boxPublicKeyAsHex'],
    serviceAddress?: IPublicIdentity['serviceAddress']
  ) {
    this.address = address
    this.boxPublicKeyAsHex = boxPublicKeyAsHex
    this.serviceAddress = serviceAddress
  }

  private static getJSONProperty(
    did: object,
    listProperty: string,
    filterKey: string,
    filterValue: string,
    property: string
  ): string {
    if (!did[listProperty]) {
      throw Error()
    }
    const list: object[] = did[listProperty]

    for (const o of list) {
      if (o[filterKey] && o[filterKey] === filterValue) {
        const result: string = o[property]
        return result
      }
    }
    throw new Error()
  }
}
