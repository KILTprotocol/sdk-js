/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type {
  DidKey,
  DidServiceEndpoint,
  IDidIdentifier,
} from '@kiltprotocol/types'
import type { DidCreationDetails } from './DidDetails'
import { DidDetails } from './DidDetails'
import { checkLightDidCreationDetails } from './LightDidDetails.utils'

export type LightDidKeyCreation = Pick<DidKey, 'type'> & {
  publicKey: Uint8Array
}

/**
 * The options that can be used to create a light DID.
 */
export type LightDidCreationDetails = {
  /**
   * The DID authentication key. This is mandatory and will be used as the first authentication key
   * of the full DID upon migration.
   */
  authenticationKey: LightDidKeyCreation
  /**
   * The optional DID encryption key. If present, it will be used as the first key agreement key
   * of the full DID upon migration.
   */
  encryptionKey?: LightDidKeyCreation
  /**
   * The set of service endpoints associated with this DID. Each service endpoint ID must be unique.
   * The service ID must not contain the DID prefix when used to create a new DID.
   *
   * @example ```typescript
   * const authenticationKey = exampleKey;
   * const services = [
   *   {
   *     id: 'test-service',
   *     types: ['CredentialExposureService'],
   *     urls: ['http://my_domain.example.org'],
   *   },
   * ];
   * const lightDid = new LightDid({ authenticationKey, services });
   * RequestForAttestation.fromRequest(parsedRequest);
   * ```
   */
  serviceEndpoints?: DidServiceEndpoint[]
}

export class LightDidDetails extends DidDetails {
  /// The latest version for KILT light DIDs.
  public static readonly LIGHT_DID_LATEST_VERSION = 1

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

    let did = getKiltDidFromIdentifier(
      id,
      'light',
      LightDidDetails.LIGHT_DID_LATEST_VERSION
    )
    if (encodedDetails) {
      did = did.concat(':', encodedDetails)
    }

    // Authentication key always has the #authentication ID.
    const keys: Map<DidKey['id'], Omit<DidKey, 'id'>> = {
      authenticationKeyId: authenticationKey,
    }
    const keyRelationships: MapKeyToRelationship = {
      authentication: [authenticationKeyId],
    }

    // Encryption key always has the #encryption ID.
    if (encryptionKey) {
      keys.push(mergeKeyAndKeyId(encryptionKeyId, encryptionKey))
      keyRelationships.keyAgreement = [encryptionKeyId]
    }

    return new LightDidDetails(id.substring(2), {
      did,
      keys,
      keyRelationships,
      serviceEndpoints,
    })
  }  
}