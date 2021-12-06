/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { encodeAddress } from '@polkadot/util-crypto'
import {
  IDidIdentifier,
  DidKey,
  IIdentity,
  KeystoreSigner,
  KeyRelationship,
} from '@kiltprotocol/types'
import { BlockchainUtils } from '@kiltprotocol/chain-helpers'
import type {
  DidCreationDetails,
  LightDidCreationDetails,
  MapKeyToRelationship,
} from '../types'
import {
  getEncodingForSigningKeyType,
  getKiltDidFromIdentifier,
  getSignatureAlgForKeyType,
} from '../Did.utils'
import { DidDetails } from './DidDetails'
import { FullDidDetails } from './FullDidDetails'
import {
  checkLightDidCreationDetails,
  mergeKeyAndKeyId,
  serializeAndEncodeAdditionalLightDidDetails,
} from './LightDidDetails.utils'
import { generateCreateTxFromDidDetails } from '../Did.chain'

const authenticationKeyId = 'authentication'
const encryptionKeyId = 'encryption'

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
    const keys: DidKey[] = [
      mergeKeyAndKeyId(authenticationKeyId, authenticationKey),
    ]
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

  // Return the only authentication key of this light DID.
  public get authenticationKey(): DidKey {
    // Always exists
    return this.getKeys(KeyRelationship.authentication).pop() as DidKey
  }

  // Return the only encryption key, if present, of this light DID.
  public get encryptionKey(): DidKey | undefined {
    return this.getKeys(KeyRelationship.keyAgreement).pop()
  }

  public async migrate(
    submitter: IIdentity,
    signer: KeystoreSigner
  ): Promise<FullDidDetails> {
    const creationTx = await generateCreateTxFromDidDetails(
      this,
      submitter.address,
      {
        alg: getSignatureAlgForKeyType(this.authenticationKey.type),
        signingPublicKey: this.authenticationKey.publicKey,
        signer,
      }
    )
    await BlockchainUtils.signAndSubmitTx(creationTx, submitter, {
      reSign: true,
      resolveOn: BlockchainUtils.IS_IN_BLOCK,
    })
    const fullDidDetails = await FullDidDetails.fromChainInfo(this.identifier)
    if (!fullDidDetails) {
      throw new Error('Something went wrong during the migration.')
    }
    return fullDidDetails
  }
}
