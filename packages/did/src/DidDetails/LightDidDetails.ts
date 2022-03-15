/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { decodeAddress, encodeAddress } from '@polkadot/util-crypto'

import type {
  IDidDetails,
  DidIdentifier,
  IIdentity,
  KeystoreSigner,
  DidUri,
} from '@kiltprotocol/types'
import { VerificationKeyType } from '@kiltprotocol/types'

import { BlockchainApiConnection } from '@kiltprotocol/chain-helpers'
import { SDKErrors } from '@kiltprotocol/utils'

import { FullDidCreationBuilder } from '../DidBatcher/FullDidCreationBuilder.js'

import type {
  DidConstructorDetails,
  MapKeysToRelationship,
  PublicKeys,
  ServiceEndpoints,
  LightDidSupportedVerificationKeyType,
  NewLightDidAuthenticationKey,
} from '../types.js'
import {
  getKiltDidFromIdentifier,
  LIGHT_DID_LATEST_VERSION,
  parseDidUri,
} from '../Did.utils.js'

import { DidDetails } from './DidDetails.js'
import {
  checkLightDidCreationDetails,
  decodeAndDeserializeAdditionalLightDidDetails,
  DidMigrationCallback,
  getEncodingForVerificationKeyType,
  getVerificationKeyTypeForEncoding,
  LightDidCreationDetails,
  serializeAndEncodeAdditionalLightDidDetails,
} from './LightDidDetails.utils.js'
import { FullDidDetails } from './FullDidDetails.js'

const authenticationKeyId = 'authentication'
const encryptionKeyId = 'encryption'

export class LightDidDetails extends DidDetails {
  public readonly identifier: DidIdentifier

  private constructor(
    identifier: DidIdentifier,
    {
      uri,
      keys,
      keyRelationships,
      serviceEndpoints = {},
    }: DidConstructorDetails
  ) {
    super({ uri, keys, keyRelationships, serviceEndpoints })

    this.identifier = identifier
  }

  public get authKeyEncoding(): string {
    return getEncodingForVerificationKeyType(
      this.authenticationKey.type
    ) as string
  }

  /**
   * Create a new instance of [[LightDidDetails]] from the provided details.
   * Private keys are assumed to already live in the keystore to be used with this DID instance, as it contains reference only to public keys.
   *
   * @param details The DID creation details.
   * @param details.authenticationKey The light DID authentication key.
   * @param details.encryptionKey The optional light DID encryption key.
   * @param details.serviceEndpoints The optional light DID service endpoints.
   *
   * @returns The resulting [[LightDidDetails]].
   */
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
    // Validity is checked in checkLightDidCreationDetails
    const authenticationKeyTypeEncoding = getEncodingForVerificationKeyType(
      authenticationKey.type
    ) as string

    // A KILT light DID identifier becomes <key_type_encoding><kilt_address>
    const id = authenticationKeyTypeEncoding.concat(
      encodeAddress(authenticationKey.publicKey, 38)
    )

    let uri = getKiltDidFromIdentifier(id, 'light', LIGHT_DID_LATEST_VERSION)
    if (encodedDetails) {
      uri = uri.concat(':', encodedDetails) as DidUri
    }

    // Authentication key always has the #authentication ID.
    const keys: PublicKeys = {
      [authenticationKeyId]: { ...authenticationKey },
    }
    const keyRelationships: MapKeysToRelationship = {
      authentication: new Set([authenticationKeyId]),
    }

    // Encryption key always has the #encryption ID.
    if (encryptionKey) {
      keys[encryptionKeyId] = encryptionKey
      keyRelationships.keyAgreement = new Set([encryptionKeyId])
    }

    const endpoints: ServiceEndpoints = serviceEndpoints.reduce(
      (res, service) => {
        res[service.id] = service
        return res
      },
      {}
    )

    return new LightDidDetails(id.substring(2), {
      uri,
      keys,
      keyRelationships,
      serviceEndpoints: endpoints,
    })
  }

  /**
   * Create a new instance of [[LightDidDetails]] by parsing the provided input URI.
   * This is possible because of the self-describing and self-containing nature of light DIDs.
   * Private keys are assumed to already live in the keystore to be used with this DID instance, as it contains reference only to public keys.
   *
   * @param uri The DID URI to parse.
   * @param failIfFragmentPresent Whether to fail when parsing the URI in case a fragment is present or not, which is not relevant to the creation of the DID. It defaults to true.
   *
   * @returns The resulting [[LightDidDetails]].
   */
  public static fromUri(
    uri: IDidDetails['uri'],
    failIfFragmentPresent = true
  ): LightDidDetails {
    const { identifier, version, encodedDetails, fragment, type } =
      parseDidUri(uri)

    if (type !== 'light') {
      throw SDKErrors.ERROR_DID_ERROR(
        `Cannot build a light DID from the provided URI ${uri} because it does not refer to a light DID.`
      )
    }
    if (fragment && failIfFragmentPresent) {
      throw SDKErrors.ERROR_DID_ERROR(
        `Cannot build a light DID from the provided URI ${uri} because it has a fragment.`
      )
    }
    const authKeyTypeEncoding = identifier.substring(0, 2)
    const decodedAuthKeyType =
      getVerificationKeyTypeForEncoding(authKeyTypeEncoding)
    if (!decodedAuthKeyType) {
      throw SDKErrors.ERROR_DID_ERROR(
        `Authentication key encoding "${authKeyTypeEncoding}" does not match any supported key type.`
      )
    }
    const authenticationKey: NewLightDidAuthenticationKey = {
      publicKey: decodeAddress(identifier.substring(2), false, 38),
      type: decodedAuthKeyType,
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

  /**
   * Create a new instance of [[LightDidDetails]] from the provided KILT address.
   * The resulting DID will only have an authentication key, and no encryption key nor service endpoints.
   *
   * @param identifier The KILT address to generate the DID from.
   * @param keyType One of the [[LightDidSupportedSigningKeyTypes]] to set the type of the authentication key derived from the provided address. It defaults to Sr25519.
   *
   * @returns The resulting [[LightDidDetails]].
   */
  public static fromIdentifier(
    identifier: DidIdentifier,
    keyType: LightDidSupportedVerificationKeyType = VerificationKeyType.Sr25519
  ): LightDidDetails {
    const authenticationKey: NewLightDidAuthenticationKey = {
      publicKey: decodeAddress(identifier, false, 38),
      type: keyType,
    }
    return LightDidDetails.fromDetails({
      authenticationKey,
    })
  }

  /**
   * Migrate a light DID to a full DID, while maintaining the same keys and service endpoints.
   *
   * @param submitterAddress The KILT address to bind the DID creation operation to. It is the same address that will have to submit the operation and pay for the deposit.
   * @param signer The keystore signer to sign the operation.
   * @param migrationCallback A user-provided callback to handle the packed and ready-to-be-signed extrinsic representing the DID creation operation.
   *
   * @returns The migrated [[FullDidDetails]] if the user-provided callback successfully writes the full DID on the chain. It throws an error otherwise.
   */
  public async migrate(
    submitterAddress: IIdentity['address'],
    signer: KeystoreSigner,
    migrationCallback: DidMigrationCallback
  ): Promise<FullDidDetails> {
    const { api } = await BlockchainApiConnection.getConnectionOrConnect()
    const creationTx = await FullDidCreationBuilder.fromLightDidDetails(
      api,
      this
    ).build(signer, submitterAddress)

    await migrationCallback(creationTx)

    const fullDidDetails = await FullDidDetails.fromChainInfo(
      getKiltDidFromIdentifier(this.identifier, 'full')
    )
    if (!fullDidDetails) {
      throw SDKErrors.ERROR_DID_ERROR(
        'Something went wrong during the migration.'
      )
    }
    return fullDidDetails
  }
}
