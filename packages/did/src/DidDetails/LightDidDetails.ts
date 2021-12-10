/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { decodeAddress, encodeAddress } from '@polkadot/util-crypto'

import type { IDidDetails, IDidIdentifier } from '@kiltprotocol/types'

import type {
  DidCreationDetails,
  LightDidCreationDetails,
  LightDidKeyCreationInput,
  MapKeysToRelationship,
  PublicKeys,
  ServiceEndpoints,
} from '../types'
import {
  checkLightDidCreationDetails,
  decodeAndDeserializeAdditionalLightDidDetails,
  getEncodingForSigningKeyType,
  getSigningKeyTypeFromEncoding,
  LIGHT_DID_SUPPORTED_SIGNING_KEY_TYPES,
  serializeAndEncodeAdditionalLightDidDetails,
} from './LightDidDetails.utils'
import { DidDetails } from './DidDetails'
import {
  getKiltDidFromIdentifier,
  LIGHT_DID_LATEST_VERSION,
  parseDidUri,
} from '../Did.utils'

const authenticationKeyId = 'authentication'
const encryptionKeyId = 'encryption'

export class LightDidDetails extends DidDetails {
  public readonly identifier: IDidIdentifier

  private constructor(
    identifier: IDidIdentifier,
    creationDetails: DidCreationDetails
  ) {
    super(creationDetails)

    this.identifier = identifier
  }

  public static fromDetails({
    authenticationKey,
    encryptionKey = undefined,
    serviceEndpoints = [],
  }: LightDidCreationDetails): LightDidDetails {
    checkLightDidCreationDetails({
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
    if (!authenticationKeyTypeEncoding) {
      throw new Error(
        `The provided key type ${authenticationKey.type} is not supported.`
      )
    }

    // A KILT light DID identifier becomes <key_type_encoding><kilt_address>
    const id = authenticationKeyTypeEncoding.concat(
      encodeAddress(authenticationKey.publicKey, 38)
    )

    let did = getKiltDidFromIdentifier(id, 'light', LIGHT_DID_LATEST_VERSION)
    if (encodedDetails) {
      did = did.concat(':', encodedDetails)
    }

    // Authentication key always has the #authentication ID.
    const keys: PublicKeys = new Map([[authenticationKeyId, authenticationKey]])
    const keyRelationships: MapKeysToRelationship = {
      authentication: new Set(authenticationKeyId),
    }

    // Encryption key always has the #encryption ID.
    if (encryptionKey) {
      keys.set(encryptionKeyId, encryptionKey)
      keyRelationships.keyAgreement = new Set(encryptionKeyId)
    }

    const endpoints: ServiceEndpoints = serviceEndpoints.reduce(
      (res, service) => {
        res.set(service.id, service)
        return res
      },
      new Map()
    )

    return new LightDidDetails(id.substring(2), {
      did,
      keys,
      keyRelationships,
      serviceEndpoints: endpoints,
    })
  }

  public static fromUri(
    uri: IDidDetails['did'],
    failIfFragmentPresent = true
  ): LightDidDetails {
    const { identifier, version, encodedDetails, fragment, type } =
      parseDidUri(uri)

    if (type !== 'light') {
      throw new Error(
        `Cannot build a light DID from the provided URI ${uri} because it does not refer to a light DID.`
      )
    }
    if (fragment && failIfFragmentPresent) {
      throw new Error(
        `Cannot build a light DID from the provided URI ${uri} because it has a fragment.`
      )
    }
    const authenticationKey: LightDidKeyCreationInput = {
      publicKey: decodeAddress(identifier.substring(2), false, 38),
      type: getSigningKeyTypeFromEncoding(identifier.substring(2)) as string,
    }
    if (!encodedDetails) {
      return LightDidDetails.fromDetails({ authenticationKey })
    }
    const { encryptionKey, serviceEndpoints } =
      decodeAndDeserializeAdditionalLightDidDetails(encodedDetails, version)
    return LightDidDetails.fromDetails({
      authenticationKey,
      encryptionKey,
      serviceEndpoints,
    })
  }

  public static fromIdentifier(
    identifier: IDidIdentifier,
    keyType: LIGHT_DID_SUPPORTED_SIGNING_KEY_TYPES = LIGHT_DID_SUPPORTED_SIGNING_KEY_TYPES.sr25519
  ): LightDidDetails {
    const authenticationKey: LightDidKeyCreationInput = {
      publicKey: decodeAddress(identifier, false, 38),
      type: keyType,
    }
    return LightDidDetails.fromDetails({
      authenticationKey,
    })
  }
}
