/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/* eslint-disable @typescript-eslint/no-non-null-assertion */

import type { IDidKeyDetails, IServiceDetails } from '@kiltprotocol/types'
import { KeyRelationship } from '@kiltprotocol/types'
import { SDKErrors, Crypto } from '@kiltprotocol/utils'
import { encodeAddress } from '@polkadot/util-crypto'
import {
  getEncodingForSigningKeyType,
  getKiltDidFromIdentifier,
} from '../Did.utils'
import type { INewPublicKey } from '../types'
import { DidDetails } from './DidDetails'
import { serializeAndEncodeAdditionalLightDidDetails } from './LightDidDetails.utils'

export interface LightDidDetailsCreationOpts {
  authenticationKey: INewPublicKey
  encryptionKey?: INewPublicKey
  // For light DIDs, the service IDs do not have to include the whole DID URI, but just the service ID. The complete URI is generated internally in the constructor.
  services?: IServiceDetails[]
}

export class LightDidDetails extends DidDetails {
  /// The latest version for KILT light DIDs.
  public static readonly LIGHT_DID_LATEST_VERSION = 1

  constructor({
    authenticationKey,
    encryptionKey = undefined,
    services = [],
  }: LightDidDetailsCreationOpts) {
    const encodedDetails = serializeAndEncodeAdditionalLightDidDetails({
      encryptionKey,
      services,
    })
    const authenticationKeyTypeEncoding = getEncodingForSigningKeyType(
      authenticationKey.type
    )
    if (!authenticationKeyTypeEncoding) {
      throw SDKErrors.ERROR_UNSUPPORTED_KEY
    }

    // A KILT light DID identifier becomes <key_type_encoding><kilt_address>
    const id = authenticationKeyTypeEncoding.concat(
      encodeAddress(authenticationKey.publicKey, 38)
    )
    let did = getKiltDidFromIdentifier(
      id,
      'light',
      LightDidDetails.LIGHT_DID_LATEST_VERSION
    )
    if (encodedDetails) {
      did = did.concat(':', encodedDetails)
    }

    super(
      did,
      id,
      services.map((service) => {
        return { ...service, id: `${did}#${service.id}` }
      })
    )

    // Authentication key always has the #authentication ID.
    this.keys = new Map([
      [
        `${this.did}#authentication`,
        {
          controller: this.did,
          id: `${this.did}#authentication`,
          publicKeyHex: Crypto.u8aToHex(authenticationKey.publicKey),
          type: authenticationKey.type,
        },
      ],
    ])
    this.keyRelationships = {
      authentication: [`${this.didUri}#authentication`],
    }

    // Encryption key always has the #encryption ID.
    if (encryptionKey) {
      this.keys.set(`${this.didUri}#encryption`, {
        controller: this.did,
        id: `${this.did}#encryption`,
        publicKeyHex: Crypto.u8aToHex(encryptionKey.publicKey),
        type: encryptionKey.type,
      })
      this.keyRelationships.keyAgreement = [`${this.didUri}#encryption`]
    }
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
}
