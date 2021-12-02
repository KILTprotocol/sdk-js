/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { BlockchainUtils } from '@kiltprotocol/chain-helpers'
import { IDidIdentifier, IDidKey, IDidResolver, IIdentity, KeystoreSigner } from '@kiltprotocol/types'
import { Crypto, SDKErrors } from '@kiltprotocol/utils'
import { encodeAddress } from '@polkadot/util-crypto'
import { IS_IN_BLOCK } from 'chain-helpers/src/blockchain/Blockchain.utils'
import { DefaultResolver, DidUtils } from '..'
import { getEncodingForSigningKeyType, getIdentifierFromKiltDid, getKiltDidFromIdentifier, parseDidUrl } from '../Did.utils'
import { DidCreationOptions, LightDidCreationDetails, MapKeyToRelationship } from '../types'
import { Did } from './Did'
import { FullDid } from './FullDid'
import { serializeAndEncodeAdditionalLightDidDetails } from './LightDidDetails.utils'

function checkLightDidCreationDetails(details: LightDidCreationDetails) {
  // Check authentication key type
  const authenticationKeyTypeEncoding = getEncodingForSigningKeyType(
    details.authenticationKey.type
  )
  if (!authenticationKeyTypeEncoding) {
    throw SDKErrors.ERROR_UNSUPPORTED_KEY
  }

  // Check service endpoints
  if (!details.serviceEndpoints) {
    return
  }

  // Checks that for all service IDs have regular strings as their ID and not a full DID.
  // Plus, we forbid a service ID to be `authentication` or `encryption` as that would create confusion
  // when upgrading to a full DID.
  details.serviceEndpoints?.forEach((service) => {
    let isServiceIdADid = true
    try {
      // parseDidUrl throws if the service ID is not a proper DID URI, which is exactly what we expect here.
      parseDidUrl(service.id)
    } catch {
      // Here if parseDidUrl throws -> service.id is NOT a DID.
      isServiceIdADid = false
    }

    if (isServiceIdADid) {
      throw new Error(
        `Invalid service ID provided: ${service.id}. The service ID should be a simple identifier and not a complete DID URI.`
      )
    }
    // A service ID cannot have a reserved ID that is used for key IDs.
    if (service.id === 'authentication' || service.id === 'encryption') {
      throw new Error(
        `Cannot specify a service ID with the name ${service.id} as it is a reserved keyword.`
      )
    }
  })
}

export class LightDid extends Did {
  /// The latest version for KILT light DIDs.
  public static readonly LIGHT_DID_LATEST_VERSION = 1

  private identifier: IDidIdentifier

  // eslint-disable-next-line no-useless-constructor
  private constructor(creationOptions: DidCreationOptions) {
    super(creationOptions)
    const identifier = getIdentifierFromKiltDid(creationOptions.did)

    // The first two characters represent the key encoding info.
    this.identifier = identifier.substring(2)
  }

  public static fromDetails({
    authenticationKey,
    encryptionKey = undefined,
    serviceEndpoints = [],
  }: LightDidCreationDetails): LightDid {
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

    // A KILT light DID identifier becomes <key_type_encoding><kilt_address>
    const id = authenticationKeyTypeEncoding.concat(
      encodeAddress(authenticationKey.publicKey, 38)
    )

    let did = getKiltDidFromIdentifier(
      id,
      'light',
      LightDid.LIGHT_DID_LATEST_VERSION
    )
    if (encodedDetails) {
      did = did.concat(':', encodedDetails)
    }

    const keys: Array<Omit<IDidKey, 'id'> & { id: string }> = [
      {
        id: 'authentication',
        controller: did,
        publicKeyHex: Crypto.u8aToHex(authenticationKey.publicKey),
        type: authenticationKey.type,
      },
    ]
    const keyRelationships: MapKeyToRelationship = {
      authentication: ['authentication'],
    }

    // Encryption key always has the #encryption ID.
    if (encryptionKey) {
      keys.push({
        id: 'encryption',
        controller: did,
        publicKeyHex: Crypto.u8aToHex(encryptionKey.publicKey),
        type: encryptionKey.type,
      })
      keyRelationships.keyAgreement = ['encryption']
    }

    return new LightDid({ did, keys, keyRelationships, serviceEndpoints })
  }

  public async migrate(
    submitter: IIdentity,
    signer: KeystoreSigner
  ): Promise<FullDid> {
    const { extrinsic } = await DidUtils.upgradeDid(
      this,
      submitter.address,
      signer
    )
    await BlockchainUtils.signAndSubmitTx(extrinsic, submitter, {
      reSign: true,
      resolveOn: IS_IN_BLOCK,
    })
    return FullDid.fromChainInfo(this.identifier) as Promise<FullDid>
  }
}
