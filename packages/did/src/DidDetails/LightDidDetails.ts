/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable import/prefer-default-export */

import { Crypto } from '@kiltprotocol/utils'
import { encodeAddress } from '@polkadot/util-crypto'
import {
  assembleDidFragment,
  getEncodingForSigningKeyType,
  getKiltDidFromIdentifier,
} from '../Did.utils'
import type { LightDidDetailsCreationOpts } from '../types'
import { DidDetails } from './DidDetails'
import {
  serializeAndEncodeAdditionalLightDidDetails,
  checkLightDidCreationOptions,
} from './LightDidDetails.utils'

export class LightDidDetails extends DidDetails {
  /// The latest version for KILT light DIDs.
  public static readonly LIGHT_DID_LATEST_VERSION = 1

  constructor({
    authenticationKey,
    encryptionKey = undefined,
    serviceEndpoints = [],
  }: LightDidDetailsCreationOpts) {
    checkLightDidCreationOptions({
      authenticationKey,
      encryptionKey,
      serviceEndpoints,
    })
    const encodedDetails = serializeAndEncodeAdditionalLightDidDetails({
      encryptionKey,
      serviceEndpoints,
    })
    const authenticationKeyTypeEncoding = getEncodingForSigningKeyType(
      authenticationKey.type
    )

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
      serviceEndpoints.map((service) => {
        return { ...service, id: assembleDidFragment(did, service.id) }
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
}
