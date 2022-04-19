/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { Extrinsic } from '@polkadot/types/interfaces'
import { BN } from '@polkadot/util'

import type {
  DidVerificationKey,
  IDidDetails,
  DidIdentifier,
  IIdentity,
  KeystoreSigner,
  SubmittableExtrinsic,
} from '@kiltprotocol/types'

import { SDKErrors } from '@kiltprotocol/utils'

import type {
  DidConstructorDetails,
  DidKeySelectionCallback,
  MapKeysToRelationship,
  PublicKeys,
  ServiceEndpoints,
} from '../types.js'
import {
  generateDidAuthenticatedTx,
  queryDetails,
  queryNonce,
  queryServiceEndpoints,
} from '../Did.chain.js'
import {
  defaultKeySelectionCallback,
  getSigningAlgorithmForVerificationKeyType,
  parseDidUri,
} from '../Did.utils.js'

import { DidDetails } from './DidDetails.js'
import {
  getKeyRelationshipForExtrinsic,
  increaseNonce,
} from './FullDidDetails.utils.js'

export class FullDidDetails extends DidDetails {
  public readonly identifier: DidIdentifier

  /**
   * Create an instance of [[FullDidDetails]] with the provided details.
   * This is not to be used to create new DIDs, but it should only be used to serialize-deserialize full DID information to and from storage.
   * Creating an instance of a full DID in this way without writing the information on the blockchain, will render the DID useless.
   *
   * @param creationDetails The creation details.
   * @param creationDetails.identifier The DID subject identifier.
   * @param creationDetails.uri The full DID URI.
   * @param creationDetails.keys The set of public keys associated with the given full DID.
   * @param creationDetails.keyRelationships The map of key ID -> relationship (e.g., authentication, attestation).
   * @param creationDetails.serviceEndpoints The set of service endpoints controlled by the specified DID.
   */
  public constructor({
    identifier,
    uri,
    keys,
    keyRelationships,
    serviceEndpoints = {},
  }: DidConstructorDetails & { identifier: DidIdentifier }) {
    super({ uri, keys, keyRelationships, serviceEndpoints })

    this.identifier = identifier
  }

  /**
   * Create a new instance of [[FullDidDetails]] after fetching the relevant information from the blockchain.
   * Private keys are assumed to already live in the keystore to be used with this DID instance, as only the public keys are retrieved from the blockchain.
   *
   * @param didUri The URI of the DID to reconstruct.
   *
   * @returns The reconstructed [[FullDidDetails]], or null if not DID with the provided identifier exists.
   */
  public static async fromChainInfo(
    didUri: IDidDetails['uri']
  ): Promise<FullDidDetails | null> {
    const { identifier, fragment, type } = parseDidUri(didUri)
    if (fragment) {
      throw SDKErrors.ERROR_DID_ERROR(
        `DID URI cannot contain fragment: ${didUri}`
      )
    }
    if (type !== 'full') {
      throw SDKErrors.ERROR_DID_ERROR(
        `DID URI does not refer to a full DID: ${didUri}`
      )
    }
    const didRec = await queryDetails(identifier)
    if (!didRec) return null

    const {
      publicKeys,
      assertionMethodKey,
      authenticationKey,
      capabilityDelegationKey,
      keyAgreementKeys,
    } = didRec

    const keys: PublicKeys = publicKeys.reduce((res, key) => {
      res[key.id] = key
      return res
    }, {})

    const keyRelationships: MapKeysToRelationship = {
      authentication: new Set([authenticationKey]),
      keyAgreement: new Set(keyAgreementKeys),
    }
    if (assertionMethodKey) {
      keyRelationships.assertionMethod = new Set([assertionMethodKey])
    }
    if (capabilityDelegationKey) {
      keyRelationships.capabilityDelegation = new Set([capabilityDelegationKey])
    }

    const serviceEndpoints: ServiceEndpoints = (
      await queryServiceEndpoints(identifier)
    ).reduce((res, service) => {
      res[service.id] = service
      return res
    }, {})

    return new FullDidDetails({
      identifier,
      uri: didUri,
      keys,
      keyRelationships,
      serviceEndpoints,
    })
  }

  /**
   * Returns all the DID keys that could be used to sign the provided extrinsic for submission.
   * This function should never be used directly by SDK users, who should rather call [[FulLDidDetails.authorizeExtrinsic]].
   *
   * @param extrinsic The unsigned extrinsic to perform the lookup.
   *
   * @returns All the keys under the full DID that could be used to generate valid signatures to submit the provided extrinsic.
   */
  public getKeysForExtrinsic(extrinsic: Extrinsic): DidVerificationKey[] {
    const keyRelationship = getKeyRelationshipForExtrinsic(extrinsic)
    return keyRelationship === 'paymentAccount'
      ? []
      : this.getVerificationKeys(keyRelationship)
  }

  /**
   * Returns the next nonce to use to sign a DID operation.
   * Normally, this function should not be called directly by SDK users. Nevertheless, in advanced cases where there might be race conditions, this function can be used as the basis on which to build parallel operation queues.
   *
   * @returns The next valid nonce, i.e., the nonce currently stored on the blockchain + 1, wrapping around the max value when reached.
   */
  public async getNextNonce(): Promise<BN> {
    const currentNonce = await queryNonce(this.identifier)
    return increaseNonce(currentNonce)
  }

  /**
   * Signs and returns the provided unsigned extrinsic with the right DID key, if present. Otherwise, it will throw an error.
   *
   * @param extrinsic The unsigned extrinsic to sign.
   * @param signer The keystore signer to use.
   * @param submitterAccount The KILT account to bind the DID operation to (to avoid MitM and replay attacks).
   * @param signingOptions The signing options.
   * @param signingOptions.keySelection The optional key selection logic, to choose the key among the set of allowed keys. By default it takes the first key from the set of valid keys.
   * @param signingOptions.txCounter The optional DID nonce to include in the operation signatures. By default, it uses the next value of the nonce stored on chain.
   * @returns The DID-signed submittable extrinsic.
   */
  public async authorizeExtrinsic(
    extrinsic: Extrinsic,
    signer: KeystoreSigner,
    submitterAccount: IIdentity['address'],
    {
      keySelection = defaultKeySelectionCallback,
      txCounter,
    }: {
      keySelection?: DidKeySelectionCallback<DidVerificationKey>
      txCounter?: BN
    } = {}
  ): Promise<SubmittableExtrinsic> {
    const signingKey = await keySelection(this.getKeysForExtrinsic(extrinsic))
    if (!signingKey) {
      throw SDKErrors.ERROR_DID_ERROR(
        `The details for did ${this.uri} do not contain the required keys for this operation`
      )
    }
    return generateDidAuthenticatedTx({
      didIdentifier: this.identifier,
      signingPublicKey: signingKey.publicKey,
      alg: getSigningAlgorithmForVerificationKeyType(signingKey.type),
      signer,
      call: extrinsic,
      txCounter: txCounter || (await this.getNextNonce()),
      submitter: submitterAccount,
    })
  }
}
