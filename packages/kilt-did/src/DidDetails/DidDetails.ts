/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable import/prefer-default-export */

import type {
  IDidDetails,
  IServiceDetails,
  IDidKeyDetails,
} from '@kiltprotocol/types'
import { KeyRelationship } from '@kiltprotocol/types'
import { hexToU8a } from '@polkadot/util'
import { base58Encode } from '@polkadot/util-crypto'
import type {
  JsonDidDocument,
  JsonLDDidDocument,
  MapKeyToRelationship,
} from '../types'

// TODO: Should re-use (or move to a common package somewhere else) the definitions of vc-export
const KeyTypesMap = {
  // proposed and used by dock.io, e.g. https://github.com/w3c-ccg/security-vocab/issues/32, https://github.com/docknetwork/sdk/blob/9c818b03bfb4fdf144c20678169c7aad3935ad96/src/utils/vc/contexts/security_context.js
  sr25519: 'Sr25519VerificationKey2020',
  // these are part of current w3 security vocab, see e.g. https://www.w3.org/ns/did/v1
  ed25519: 'Ed25519VerificationKey2018',
  ecdsa: 'EcdsaSecp256k1VerificationKey2019',
  x25519: 'X25519KeyAgreementKey2019',
}

/**
 * An abstract instance for some details associated with a KILT DID.
 */
export abstract class DidDetails implements IDidDetails {
  // The complete DID URI, such as did:kilt:<kilt_address> for full DIDs and did:kilt:light:v1:<kilt_address>
  protected didUri: string
  // The identifier of the DID, meaning either the KILT address for full DIDs or the KILT address + the encoded authentication key type for light DIDs.
  protected id: string
  // The set of service endpoints associated with the DID.
  protected services: IServiceDetails[] = []
  // A map from key ID to key details, which allows for efficient retrieval of a key information given its ID.
  protected keys: Map<IDidKeyDetails['id'], IDidKeyDetails> = new Map()
  // A map from key relationship type (authentication, assertion method, etc.) to key ID, which can then be used to retrieve the key details if needed.
  protected keyRelationships: MapKeyToRelationship & {
    none?: Array<IDidKeyDetails['id']>
  } = {}

  constructor(didUri: string, id: string, services: IServiceDetails[]) {
    this.didUri = didUri
    this.id = id
    this.services = services
  }

  public get did(): string {
    return this.didUri
  }

  public get identifier(): string {
    return this.id
  }

  public getKey(id: IDidKeyDetails['id']): IDidKeyDetails | undefined {
    return this.keys.get(id)
  }

  public getService(id: IServiceDetails['id']): IServiceDetails | undefined {
    return this.services.find((s) => s.id === id)
  }

  public getKeys(relationship?: KeyRelationship | 'none'): IDidKeyDetails[] {
    if (relationship) {
      return this.getKeyIds(relationship).map((id) => this.getKey(id)!)
    }
    return [...this.keys.values()]
  }

  public getKeyIds(
    relationship?: KeyRelationship | 'none'
  ): Array<IDidKeyDetails['id']> {
    if (relationship) {
      return this.keyRelationships[relationship] || []
    }
    return [...this.keys.keys()]
  }

  public getServices(type?: string): IServiceDetails[] {
    if (type) {
      return this.services.filter((service) => service.type === type)
    }
    return this.services
  }

  public toDidDocument(
    mimeType = 'application/json'
  ): JsonDidDocument | JsonLDDidDocument {
    if (!['application/json', 'application/json+ld'].includes(mimeType)) {
      throw Error(`Unsupported resolution mimeType ${mimeType}`)
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = {}

    result.id = this.did
    result.verificationMethod = new Array<string>()

    // Populate the `verificationMethod` array and then sets the `authentication` array with the key IDs (or undefined if no auth key is present - which should never happen)
    const authenticationKeysIds = this.getKeys(
      KeyRelationship.authentication
    ).map((authKey) => {
      result.verificationMethod.push({
        id: authKey.id,
        controller: this.did,
        type: KeyTypesMap[authKey.type],
        publicKeyBase58: base58Encode(hexToU8a(authKey.publicKeyHex)),
      })
      // Parse only the key ID from the complete key URI
      return authKey.id
    })
    result.authentication = authenticationKeysIds.length
      ? authenticationKeysIds
      : undefined

    const keyAgreementKeysIds = this.getKeys(KeyRelationship.keyAgreement).map(
      (keyAgrKey) => {
        result.verificationMethod.push({
          id: keyAgrKey.id,
          controller: this.did,
          type: KeyTypesMap[keyAgrKey.type],
          publicKeyBase58: base58Encode(hexToU8a(keyAgrKey.publicKeyHex)),
        })
        return keyAgrKey.id
      }
    )
    result.keyAgreement = keyAgreementKeysIds.length
      ? keyAgreementKeysIds
      : undefined

    const assertionKeysIds = this.getKeys(KeyRelationship.assertionMethod).map(
      (assKey) => {
        result.verificationMethod.push({
          id: assKey.id,
          controller: this.did,
          type: KeyTypesMap[assKey.type],
          publicKeyBase58: base58Encode(hexToU8a(assKey.publicKeyHex)),
        })
        return assKey.id
      }
    )
    result.assertionMethod = assertionKeysIds.length
      ? assertionKeysIds
      : undefined

    const delegationKeyIds = this.getKeys(
      KeyRelationship.capabilityDelegation
    ).map((delKey) => {
      result.verificationMethod.push({
        id: delKey.id,
        controller: this.did,
        type: KeyTypesMap[delKey.type],
        publicKeyBase58: base58Encode(hexToU8a(delKey.publicKeyHex)),
      })
      return delKey.id
    })
    result.capabilityDelegation = delegationKeyIds.length
      ? delegationKeyIds
      : undefined

    if (this.services.length) {
      result.service = this.services
    }

    if (mimeType === 'application/json+ld') {
      result['@context'] = ['https://www.w3.org/ns/did/v1']
      return result as JsonLDDidDocument
    }
    return result as JsonDidDocument
  }
}
