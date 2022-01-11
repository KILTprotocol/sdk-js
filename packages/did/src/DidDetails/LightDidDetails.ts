/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { decodeAddress, encodeAddress } from '@polkadot/util-crypto'

import type {
  IDidDetails,
  IDidIdentifier,
  IIdentity,
  KeystoreSigner,
  SubmittableExtrinsic,
} from '@kiltprotocol/types'

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
  LightDidSupportedSigningKeyTypes,
  serializeAndEncodeAdditionalLightDidDetails,
} from './LightDidDetails.utils'
import { DidDetails } from './DidDetails'
import { getSignatureAlgForKeyType } from './DidDetails.utils'
import { FullDidDetails } from './FullDidDetails'
import {
  getKiltDidFromIdentifier,
  LIGHT_DID_LATEST_VERSION,
  parseDidUri,
} from '../Did.utils'
import { generateCreateTxFromDidDetails } from '../Did.chain'

const authenticationKeyId = 'authentication'
const encryptionKeyId = 'encryption'

export type DidMigrationHandler = (
  migrationExtrinsic: SubmittableExtrinsic
) => Promise<void>

export class LightDidDetails extends DidDetails {
  public readonly identifier: IDidIdentifier

  private constructor(
    identifier: IDidIdentifier,
    creationDetails: DidCreationDetails
  ) {
    super(creationDetails)

    this.identifier = identifier
  }

  public get authKeyEncoding(): string {
    return getEncodingForSigningKeyType(this.authenticationKey.type) as string
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
    // Validity is checked in checkLightDidCreationDetails
    const authenticationKeyTypeEncoding = getEncodingForSigningKeyType(
      authenticationKey.type
    ) as string

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
      authentication: new Set([authenticationKeyId]),
    }

    // Encryption key always has the #encryption ID.
    if (encryptionKey) {
      keys.set(encryptionKeyId, encryptionKey)
      keyRelationships.keyAgreement = new Set([encryptionKeyId])
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
    const authKeyTypeEncoding = identifier.substring(0, 2)
    const decodedAuthKeyType =
      getSigningKeyTypeFromEncoding(authKeyTypeEncoding)
    if (!decodedAuthKeyType) {
      throw new Error(
        `Authentication key encoding "${authKeyTypeEncoding}" does not match any supported key type.`
      )
    }
    const authenticationKey: LightDidKeyCreationInput = {
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

  public static fromIdentifier(
    identifier: IDidIdentifier,
    keyType: LightDidSupportedSigningKeyTypes = LightDidSupportedSigningKeyTypes.sr25519
  ): LightDidDetails {
    const authenticationKey: LightDidKeyCreationInput = {
      publicKey: decodeAddress(identifier, false, 38),
      type: keyType,
    }
    return LightDidDetails.fromDetails({
      authenticationKey,
    })
  }

  public async migrate(
    submitterAddress: IIdentity['address'],
    signer: KeystoreSigner,
    migrationHandler: DidMigrationHandler
  ): Promise<FullDidDetails> {
    const creationTx = await generateCreateTxFromDidDetails(
      this,
      submitterAddress,
      {
        alg: getSignatureAlgForKeyType(this.authenticationKey.type),
        signingPublicKey: this.authenticationKey.publicKey,
        signer,
      }
    )
    await migrationHandler(creationTx)
    const fullDidDetails = await FullDidDetails.fromChainInfo(this.identifier)
    if (!fullDidDetails) {
      throw new Error('Something went wrong during the migration.')
    }
    return fullDidDetails
  }
}
