/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type {
  DidKey,
  DidServiceEndpoint,
  IDidDetails,
  KeyRelationship,
} from '@kiltprotocol/types'

export type MapKeysToRelationship = Partial<
  Record<KeyRelationship, Set<DidKey['id']>> & { none: Set<DidKey['id']> }
>

export type PublicKeys = Record<DidKey['id'], Omit<DidKey, 'id'>>

export type ServiceEndpoints = Record<
  DidServiceEndpoint['id'],
  Omit<DidServiceEndpoint, 'id'>
>

export type DidKeySelectionHandler = (keys: DidKey[]) => Promise<DidKey | null>

export type DidCreationDetails = {
  did: IDidDetails['did']
  // Accepts a list of keys where the ID does not include the DID URI.
  keys: PublicKeys
  keyRelationships: MapKeysToRelationship
  // Accepts a list of service endpoints where the ID does not include the DID URI.
  serviceEndpoints?: ServiceEndpoints
}

/**
 * A new public key specified when creating a new DID.
 */
export type LightDidKeyCreationInput = Pick<DidKey, 'type'> & {
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
  authenticationKey: LightDidKeyCreationInput
  /**
   * The optional DID encryption key. If present, it will be used as the first key agreement key
   * of the full DID upon migration.
   */
  encryptionKey?: LightDidKeyCreationInput
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
