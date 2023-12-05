/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { GenericExtrinsic } from '@polkadot/types'
import { u8aEq } from '@polkadot/util'
import type { Keypair } from '@polkadot/util-crypto/types'

import { multibaseKeyToDidKey, resolve } from '@kiltprotocol/did'
import type {
  Did,
  DidDocument,
  DidUrl,
  KeyringPair,
  KiltAddress,
  SignerInterface,
  UriFragment,
} from '@kiltprotocol/types'
import { SDKErrors, Signers } from '@kiltprotocol/utils'
import type { TransactionResult } from '@kiltprotocol/credentials/src/V1/KiltAttestationProofV1'

/**
 * An Identity represents a DID and signing keys associated with it.
 */
export interface Identity {
  did: Did
  didDocument: DidDocument
  signers: SignerInterface[]
  /**
   * Adds one or more signer interfaces to the `signers`.
   *
   * @param signers Signer Interface(s).
   * @returns The (in-place) modified Identity object for chaining.
   */
  addSigner: (...signers: SignerInterface[]) => Promise<Identity>
  /**
   * Convenience function similar to {@link addSigner}, but creates signers for all matching known algorithms from a keypair.
   *
   * @param keypairs
   * @returns The (in-place) modified Identity object for chaining.
   */
  addKeypair: (...keypairs: Array<Keypair | KeyringPair>) => Promise<Identity>
  /**
   * Helps filtering and selecting appropriate signers related to the DID's verification methods.
   * Only returns signers that match a currently active verification method.
   *
   * @param filterBy Additional selection criteria, including which VM the signer relates to, which algorithm it uses, or which relationship it has to the DID.
   * @returns A (potentially empty) array of signers, wrapped in a Promise because {@link Signers.selectSigners} is async.
   */
  getSigners: (filterBy: {
    verificationMethod?: DidUrl | UriFragment
    verificationRelationship?: string
    algorithm?: string
  }) => Promise<SignerInterface[]>
  /**
   * Same as {@link getSigners} but pre-selects a signer matching the criteria and throws if none are found.
   *
   * @param filterBy See {@link getSigners}.
   * @returns A Promise of a signer, which rejects if none match the selection criteria.
   */
  getSigner: (filterBy: {
    verificationMethod?: DidUrl | UriFragment
    verificationRelationship?: string
    algorithm?: string
  }) => Promise<SignerInterface>
  /**
   * Refreshes the didDocument and/or purges signers that are not linked to a VM currently referenced in the document.
   *
   * @param opts Controls whether you want to only reload the document, or only purge signers. Defaults to doing both.
   * @returns The (in-place) modified Identity object for chaining.
   */
  update: (opts: {
    skipResolution?: boolean
    purgeSigners?: boolean
  }) => Promise<Identity>
  /**
   * The account that acts as the submitter account.
   */
  submitterAccount?: KiltAddress
  /**
   * Uses a verification method related signer to DID-authorize a call to be executed on-chain with the identity's DID as the origin.
   *
   * @param tx The call to be authorized.
   * @returns The authorized (signed) call.
   */
  authorizeTx?: (tx: GenericExtrinsic) => Promise<GenericExtrinsic>
  /**
   * Takes care of submitting the transaction to node in the network and listening for execution results.
   * This can consist of signing the tx using the signer associated with submitterAccount and interacting directly with a node, or can use an external service for this.
   *
   * @param tx The extrinsic ready to be (signed and) submitted.
   * @returns A promise resolving to an object indicating the block of inclusion, or rejecting if the transaction failed to be included or execute correctly.
   */
  submitTx?: (tx: GenericExtrinsic) => Promise<TransactionResult>
}

async function loadDidDocument(
  did: Did,
  resolver: typeof resolve
): Promise<DidDocument> {
  const { didDocument } = await resolver(did)
  if (!didDocument) {
    throw new SDKErrors.DidNotFoundError(`failed to resolve ${did}`)
  }
  return didDocument
}

class IdentityClass implements Identity {
  public did: Did
  public resolver: typeof resolve
  public didDocument: DidDocument
  private didSigners: SignerInterface[]

  constructor({
    did,
    didDocument,
    signers,
    resolver = resolve,
  }: {
    did: Did
    didDocument: DidDocument
    signers?: SignerInterface[]
    resolver?: typeof resolve
  }) {
    this.did = did
    this.didDocument = didDocument
    this.didSigners = signers ? [...signers] : []
    this.resolver = resolver
  }

  get signers(): SignerInterface[] {
    return [...this.didSigners]
  }

  public async update({
    skipResolution = false,
    skipPurgeSigners = false,
  }: {
    skipResolution?: boolean
    skipPurgeSigners?: boolean
  } = {}): Promise<IdentityClass> {
    if (skipResolution !== true) {
      this.didDocument = await loadDidDocument(this.did, this.resolver)
    }
    if (skipPurgeSigners !== true) {
      this.didSigners = await this.getSigners()
    }
    return this
  }

  public async addSigner(
    ...signers: SignerInterface[]
  ): Promise<IdentityClass> {
    this.didSigners.push(...signers)
    return this
  }

  public async addKeypair(
    ...keypairs: Array<Keypair | KeyringPair>
  ): Promise<IdentityClass> {
    const didKeys = this.didDocument.verificationMethod?.map(
      ({ publicKeyMultibase, id }) => ({
        ...multibaseKeyToDidKey(publicKeyMultibase),
        id,
      })
    )
    if (didKeys && didKeys.length !== 0) {
      await Promise.all(
        keypairs.map(async (keypair) => {
          const thisType = 'type' in keypair ? keypair.type : undefined
          const matchingKey = didKeys?.find(({ publicKey, keyType }) => {
            if (thisType && thisType !== keyType) {
              return false
            }
            return u8aEq(publicKey, keypair.publicKey)
          })
          if (matchingKey) {
            const id = matchingKey.id.startsWith('#')
              ? this.did + matchingKey.id
              : matchingKey.id
            await this.addSigner(
              ...(await Signers.getSignersForKeypair({
                keypair,
                id,
                type: matchingKey.keyType,
              }))
            )
          }
        })
      )
    }
    return this
  }

  public async getSigners({
    verificationMethod,
    verificationRelationship,
    algorithm,
  }: {
    verificationMethod?: DidUrl | UriFragment
    verificationRelationship?: string
    algorithm?: string
  } = {}): Promise<SignerInterface[]> {
    const selectors = [
      Signers.select.byDid(this.didDocument, { verificationRelationship }),
    ]
    if (algorithm) {
      selectors.push(Signers.select.byAlgorithm([algorithm]))
    }
    if (verificationMethod) {
      selectors.push(Signers.select.bySignerId([verificationMethod]))
    }
    return Signers.selectSigners(this.didSigners)
  }

  public async getSigner(
    criteria: {
      verificationMethod?: DidUrl | UriFragment
      verificationRelationship?: string
      algorithm?: string
    } = {}
  ): Promise<SignerInterface> {
    const [signer] = await this.getSigners(criteria)
    if (typeof signer === 'undefined') {
      throw new SDKErrors.NoSuitableSignerError(undefined, {
        signerRequirements: criteria,
        availableSigners: this.didSigners,
      })
    }
    return signer
  }
}

export async function makeIdentity({
  did,
  didDocument,
  keypairs,
  signers,
  resolver = resolve,
}: {
  did: Did
  didDocument?: DidDocument
  signers?: SignerInterface[]
  keypairs?: Array<Keypair | KeyringPair>
  resolver?: typeof resolve
}): Promise<IdentityClass> {
  const identity = new IdentityClass({
    did,
    didDocument: didDocument ?? (await loadDidDocument(did, resolver)),
    signers,
    resolver,
  })
  await identity.update({ skipResolution: true })
  if (keypairs && keypairs.length !== 0) {
    await identity.addKeypair(...keypairs)
  }
  return identity
}
