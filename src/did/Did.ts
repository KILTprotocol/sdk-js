import Identity from '../identity/Identity'
import { factory } from '../config/ConfigLog'
import { TxStatus } from '../blockchain/TxStatus'
import { getIdentifierFromAddress } from './Did.utils'
import { store, queryByAddress, queryByIdentifier, remove } from './Did.chain'

const log = factory.getLogger('DID')

export const IDENTIFIER_PREFIX = 'did:kilt:'
export const SERVICE_KILT_MESSAGING = 'KiltMessagingService'
export const KEY_TYPE_SIGNATURE = 'Ed25519VerificationKey2018'
export const KEY_TYPE_ENCRYPTION = 'X25519Salsa20Poly1305Key2018'

export interface IDid {
  identifier: string
  publicBoxKey: string
  publicSigningKey: string
  documentStore?: string
}

export default class Did implements IDid {
  public static queryByIdentifier(identifier: string) {
    return queryByIdentifier(identifier)
  }
  public static queryByAddress(address: string) {
    return queryByAddress(address)
  }

  public static async remove(identity: Identity) {
    log.debug(`Create tx for 'did.remove'`)
    return remove(identity)
  }

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

  public async store(identity: Identity): Promise<TxStatus> {
    log.debug(`Create tx for 'did.add'`)
    return store(this, identity)
  }

  public getDefaultDocument(kiltServiceEndpoint?: string): object {
    const result = {
      id: this.identifier,
      authentication: {
        type: 'Ed25519SignatureAuthentication2018',
        publicKey: [this.identifier + '#key-1'],
      },
      publicKey: [
        {
          id: this.identifier + '#key-1',
          type: KEY_TYPE_SIGNATURE,
          controller: this.identifier,
          publicKeyHex: this.publicSigningKey,
        },
        {
          id: this.identifier + '#key-2',
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
