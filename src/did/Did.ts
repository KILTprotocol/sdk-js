import Identity from '../identity/Identity'
import Blockchain, { QueryResult } from '../blockchain/Blockchain'
import { factory } from '../config/ConfigLog'
import { TxStatus } from '../blockchain/TxStatus'
import { SubmittableExtrinsic } from '@polkadot/api/SubmittableExtrinsic'
import { CodecResult } from '@polkadot/api/promise/types'
import { Option, Text } from '@polkadot/types'
import { hexToU8a, u8aToString } from '@polkadot/util'
import IPublicIdentity from '../primitives/PublicIdentity'

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
  public static decodeDid(
    identifier: string,
    encoded: QueryResult
  ): IDid | undefined {
    const json = encoded && encoded.encodedLength ? encoded.toJSON() : null
    let result: IDid | undefined
    if (json instanceof Array) {
      const documentStore = hexToU8a(json[2])
      result = Object.assign(Object.create(Did.prototype), {
        identifier,
        publicSigningKey: json[0],
        publicBoxKey: json[1],
        documentStore:
          documentStore.length > 0 ? u8aToString(documentStore) : undefined,
      } as IDid)
    }
    return result
  }

  public static async queryByIdentifier(
    blockchain: Blockchain,
    identifier: IDid['identifier']
  ): Promise<IDid | undefined> {
    const address = Did.getAddressFromIdentifier(identifier)
    const decoded: IDid | undefined = Did.decodeDid(
      identifier,
      await blockchain.api.query.dID.dIDs(address)
    )
    return decoded
  }

  public static async queryByAddress(
    blockchain: Blockchain,
    address: IPublicIdentity['address']
  ): Promise<IDid | undefined> {
    const identifier = Did.getIdentifierFromAddress(address)
    const decoded: IDid | undefined = Did.decodeDid(
      identifier,
      await blockchain.api.query.dID.dIDs(address)
    )
    return decoded
  }

  public static fromIdentity(identity: Identity, documentStore?: string): Did {
    const identifier = Did.getIdentifierFromAddress(identity.address)
    return new Did(
      identifier,
      identity.boxPublicKeyAsHex,
      identity.signPublicKeyAsHex,
      documentStore
    )
  }

  public static getIdentifierFromAddress(
    address: IPublicIdentity['address']
  ): IDid['identifier'] {
    return IDENTIFIER_PREFIX + address
  }

  public static getAddressFromIdentifier(
    identifier: IDid['identifier']
  ): IPublicIdentity['address'] {
    if (!identifier.startsWith(IDENTIFIER_PREFIX)) {
      throw new Error('Not a KILT did: ' + identifier)
    }
    return identifier.substr(IDENTIFIER_PREFIX.length)
  }

  public static async remove(
    blockchain: Blockchain,
    identity: Identity
  ): Promise<TxStatus> {
    log.debug(`Create tx for 'did.remove'`)
    const tx: SubmittableExtrinsic<
      CodecResult,
      any
    > = await blockchain.api.tx.did.remove()
    return blockchain.submitTx(identity, tx)
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

  public async store(
    blockchain: Blockchain,
    identity: Identity
  ): Promise<TxStatus> {
    log.debug(`Create tx for 'did.add'`)
    const tx: SubmittableExtrinsic<
      CodecResult,
      any
    > = await blockchain.api.tx.did.add(
      this.publicBoxKey,
      this.publicSigningKey,
      new Option(Text, this.documentStore)
    )
    return blockchain.submitTx(identity, tx)
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
