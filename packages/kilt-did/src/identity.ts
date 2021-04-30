import nacl from 'tweetnacl'
import { encodeAddress } from '@polkadot/util-crypto'
import type { IIdentity, SubmittableExtrinsic } from '@kiltprotocol/types'
import { TypeRegistry } from '@polkadot/types'
import { BlockchainApiConnection } from '@kiltprotocol/chain-helpers'
import type {
  IDidCreationOperation,
  IDidDeletionOperation,
  IDidUpdateOperation,
  KeyId,
} from './types.chain'
import { create, queryByDID, update, deactivate } from './Did.chain'
import type {
  IEncryptionKeyPair,
  ISigningKeyPair,
  Nullable,
  DidSigned,
  KeySet,
} from './types'
import {
  encodeDidCreate,
  encodeDidDelete,
  encodeDidUpdate,
  getDidFromIdentifier,
  isIKeyPair,
  signCodec,
} from './Did.utils'

const TYPE_REGISTRY = new TypeRegistry()
TYPE_REGISTRY.register(BlockchainApiConnection.CUSTOM_TYPES)

type Ed25519 = 'ed25519'

export interface IEd25519KeyPair extends ISigningKeyPair {
  type: Ed25519
  deriveEncryptionKeyPair: () => IEncryptionKeyPair
}

export class Curve25519KeyPair implements IEncryptionKeyPair {
  public publicKey: Uint8Array
  public readonly type = 'x25519'
  private secretKey: Uint8Array

  constructor(secretKey: Uint8Array, publicKey: Uint8Array) {
    this.publicKey = publicKey
    this.secretKey = secretKey
  }

  public decrypt(message: Uint8Array, nonce: Uint8Array, senderPk: Uint8Array) {
    return nacl.box.open(message, nonce, senderPk, this.secretKey)
  }
}

export class LightDID {
  public did: string
  protected keys: KeySet

  public get authenticationKey(): ISigningKeyPair {
    return this.keys.authentication
  }

  public get encryptionKey(): IEncryptionKeyPair {
    return this.keys.encryption
  }

  constructor(
    did: string,
    authenticationKey: ISigningKeyPair,
    encryptionKey: IEncryptionKeyPair
  ) {
    this.did = did
    this.keys = { authentication: authenticationKey, encryption: encryptionKey }
  }

  public static fromKeyPair(keyPair: IEd25519KeyPair): LightDID {
    const address = encodeAddress(keyPair.publicKey, 38)
    const did = getDidFromIdentifier(address)
    const boxKeyPair = keyPair.deriveEncryptionKeyPair()
    return new LightDID(did, keyPair, boxKeyPair)
  }

  public static fromIdentity(identity: IIdentity): LightDID {
    const did = getDidFromIdentifier(identity.address)
    const boxKeyPair = new Curve25519KeyPair(
      identity.boxKeyPair.secretKey,
      identity.boxKeyPair.publicKey
    )
    return new LightDID(
      did,
      identity.signKeyringPair as ISigningKeyPair,
      boxKeyPair
    )
  }
}

export class FullDID extends LightDID {
  public get delegationKey(): ISigningKeyPair | undefined {
    return this.keys.delegation
  }

  public get attestationKey(): ISigningKeyPair | undefined {
    return this.keys.attestation
  }

  constructor(
    did: string,
    authenticationKey: ISigningKeyPair,
    encryptionKey: IEncryptionKeyPair,
    attestationKey?: ISigningKeyPair,
    delegationKey?: ISigningKeyPair
  ) {
    super(did, authenticationKey, encryptionKey)
    this.setKeys({ attestation: attestationKey, delegation: delegationKey })
  }

  public static fromLightDID(
    did: LightDID,
    attestationKey?: ISigningKeyPair,
    delegationKey?: ISigningKeyPair
  ): FullDID {
    return new FullDID(
      did.did,
      did.authenticationKey,
      did.encryptionKey,
      attestationKey,
      delegationKey
    )
  }

  public static fromKeyPair(
    keyPair: IEd25519KeyPair,
    attestationKey?: ISigningKeyPair,
    delegationKey?: ISigningKeyPair
  ): FullDID {
    return FullDID.fromLightDID(
      super.fromKeyPair(keyPair),
      attestationKey,
      delegationKey
    )
  }

  public static fromIdentity(
    identity: IIdentity,
    attestationKey?: ISigningKeyPair,
    delegationKey?: ISigningKeyPair
  ): FullDID {
    return FullDID.fromLightDID(
      super.fromIdentity(identity),
      attestationKey,
      delegationKey
    )
  }

  public setKeys(keys: Partial<Nullable<KeySet>>): void {
    // copy current keys
    const keysCopy = { ...this.keys }
    // apply changes to copy
    Object.entries(keys).forEach(([name, keyPair]) => {
      if (
        isIKeyPair(keyPair) &&
        ['authentication', 'encryption', 'attestation', 'delegation'].includes(
          name
        )
      ) {
        keysCopy[name] = keyPair
      } else if (
        keyPair === null &&
        ['attestation', 'delegation'].includes(name)
      ) {
        delete keysCopy[name]
      } else if (typeof keyPair === 'undefined') {
      } else {
        throw Error(`erroneous input: entry "${name}" with value ${keyPair}`)
      }
    })
    // if no errors, apply
    this.keys = keysCopy
  }

  public unsetKeys(names: Array<keyof KeySet>): void {
    // copy current keys
    const keysCopy = { ...this.keys }
    // apply changes to copy
    names.forEach((name) => {
      if (Object.keys(keysCopy).includes(name)) {
        delete keysCopy[name]
      } else {
        throw Error(`erroneous input: no key ${name}`)
      }
    })
    // apply changes if no errors
    this.keys = keysCopy
  }

  public getDidCreate(endpoint_url?: string): DidSigned<IDidCreationOperation> {
    // build did create object
    const didCreate = encodeDidCreate(
      TYPE_REGISTRY,
      this.did,
      this.keys,
      endpoint_url
    )
    return signCodec(didCreate, this.authenticationKey)
  }

  public getDidUpdate(
    keyUpdate: Partial<Nullable<KeySet>>,
    tx_counter: number,
    verification_keys_to_remove: KeyId[] = [],
    new_endpoint_url?: string
  ): DidSigned<IDidUpdateOperation> {
    // build key update object
    const didUpdate = encodeDidUpdate(
      TYPE_REGISTRY,
      this.did,
      tx_counter,
      keyUpdate,
      verification_keys_to_remove,
      new_endpoint_url
    )
    return signCodec(didUpdate, this.authenticationKey)
  }

  public getDidDeactivate(txIndex: number): DidSigned<IDidDeletionOperation> {
    const didDeactivate = encodeDidDelete(TYPE_REGISTRY, this.did, txIndex)
    return signCodec(didDeactivate, this.authenticationKey)
  }

  public async getTxIndex(): Promise<number> {
    const didRecord = await queryByDID(this.did)
    if (!didRecord) throw new Error('did not on chain')
    return didRecord.last_tx_counter
  }

  // the following are optional, not sure if we want to include them

  public async getDidCreateTx(
    endpoint_url?: string
  ): Promise<SubmittableExtrinsic> {
    return create(this.getDidCreate(endpoint_url))
  }

  public async getKeyUpdateTx(
    newKeys: Partial<KeySet>,
    txIndex: number,
    verification_keys_to_remove: [] = [],
    new_endpoint_url?: string
  ): Promise<SubmittableExtrinsic> {
    return update(
      this.getDidUpdate(
        newKeys,
        txIndex,
        verification_keys_to_remove,
        new_endpoint_url
      )
    )
  }

  public async getKeyRemovalTx(txIndex: number): Promise<SubmittableExtrinsic> {
    return deactivate(this.getDidDeactivate(txIndex))
  }
}
