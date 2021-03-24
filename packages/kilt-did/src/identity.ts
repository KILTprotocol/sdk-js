import nacl from 'tweetnacl'
import { encodeAddress } from '@polkadot/util-crypto'
import type { IIdentity, SubmittableExtrinsic } from '@kiltprotocol/types'
import { SDKErrors } from '@kiltprotocol/utils'
import { create, queryByDID, removeKeys, updateKeys } from './Did.chain'

// placeholders for interfaces (will probably live in the types package in the end)
export type IDidCreate = any
export type IDidKeyUpdate = any
export type IDidKeyRemoval = any

export interface IKeyPair {
  publicKey: Uint8Array
  type: string
  // do we need the identifier?
}

function isIKeyPair(keypair: unknown): keypair is IKeyPair {
  return (
    typeof keypair === 'object' &&
    !!keypair &&
    'publicKey' in keypair &&
    keypair['publicKey'] instanceof Uint8Array &&
    'type' in keypair &&
    typeof keypair['type'] === 'string'
  )
}

export interface ISigningKeyPair extends IKeyPair {
  sign: (message: string | Uint8Array) => Uint8Array
}

export interface IEncryptionKeyPair extends IKeyPair {
  decrypt: (
    message: Uint8Array,
    nonce: Uint8Array,
    senderPublicKey: Uint8Array
  ) => Uint8Array | null
}

type Ed25519 = 'ed25519'

export interface IEd25519KeyPair extends ISigningKeyPair {
  type: Ed25519
  deriveEncryptionKeyPair: () => IEncryptionKeyPair
}

export interface KeySet {
  authentication: ISigningKeyPair
  encryption: IEncryptionKeyPair
  attestation?: ISigningKeyPair
  revocation?: ISigningKeyPair
  delegation?: ISigningKeyPair
}

export class Curve25519KeyPair implements IEncryptionKeyPair {
  public publicKey: Uint8Array
  public readonly type = 'curve25519'
  private secretKey: Uint8Array

  constructor(secretKey: Uint8Array, publicKey: Uint8Array) {
    this.publicKey = publicKey
    this.secretKey = secretKey
  }

  public decrypt(message: Uint8Array, nonce: Uint8Array, senderPk: Uint8Array) {
    return nacl.box.open(message, nonce, senderPk, this.secretKey)
  }
}

const KILT_DID_PREFIX = 'did:kilt:'

export function getDidFromIdentifier(identifier: string): string {
  return KILT_DID_PREFIX + identifier
}

export function getIdentifierFromDid(did: string): string {
  if (!did.startsWith(KILT_DID_PREFIX)) {
    throw SDKErrors.ERROR_INVALID_DID_PREFIX(did)
  }
  return did.substr(KILT_DID_PREFIX.length)
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
    return new LightDID(did, identity.signKeyringPair, boxKeyPair)
  }
}

export class FullDID extends LightDID {
  public get delegationKey(): ISigningKeyPair | undefined {
    return this.keys.delegation
  }

  public get attestationKey(): ISigningKeyPair | undefined {
    return this.keys.attestation
  }

  public get revocationKey(): ISigningKeyPair | undefined {
    return this.keys.revocation
  }

  public getKeys(): KeySet {
    return this.keys
  }

  public setKeys(keys: Partial<KeySet>): void {
    // copy current keys
    const keysCopy = { ...this.keys }
    // apply changes to copy
    Object.entries(keys).forEach(([name, keyPair]) => {
      if (
        isIKeyPair(keyPair) &&
        [
          'authentication',
          'encryption',
          'attestation',
          'revocation',
          'delegation',
        ].includes(name)
      ) {
        keysCopy[name] = keyPair
      } else {
        throw Error(`erroneos input: entry "${name}" with value ${keyPair}`)
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

  public getDidCreate(): IDidCreate {
    const didCreate: IDidCreate = { createDid: { keys: this.getKeys() } } // build did create object, whatever that will look like
    didCreate.signature = this.authenticationKey.sign(didCreate.createDid)
    return didCreate
  }

  public getKeyUpdate(
    newKeys: Partial<KeySet>,
    txIndex: number
  ): IDidKeyUpdate {
    const keyUpdate: IDidKeyUpdate = { updateKeys: { keys: newKeys, txIndex } } // build key update object, whatever that will look like
    keyUpdate.signature = this.authenticationKey.sign(keyUpdate.updateKeys)
    return keyUpdate
  }

  public getKeyRemoval(keyIds: string[], txIndex: number): IDidKeyRemoval {
    const keyRemoval: IDidKeyRemoval = {
      removeKeys: { keys: keyIds, txIndex },
    } // build key update object, whatever that will look like
    keyRemoval.signature = this.authenticationKey.sign(keyRemoval.removeKeys)
    return keyRemoval
  }

  public async getTxIndex(): Promise<number> {
    const didRecord = await queryByDID(this.did)
    if (!didRecord) throw new Error('did not on chain')
    return didRecord.txIndex
  }

  // the following are optional, not sure if we want to include them

  public async getDidCreateTx(): Promise<SubmittableExtrinsic> {
    return create(this.getDidCreate())
  }

  public async getKeyUpdateTx(
    newKeys: Partial<KeySet>,
    txIndex: number
  ): Promise<SubmittableExtrinsic> {
    return updateKeys(this.getKeyUpdate(newKeys, txIndex))
  }

  public async getKeyRemovalTx(
    keyIds: string[],
    txIndex: number
  ): Promise<SubmittableExtrinsic> {
    return removeKeys(this.getKeyRemoval(keyIds, txIndex))
  }
}
