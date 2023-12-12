/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { u8aEq } from '@polkadot/util'
import type { Keypair } from '@polkadot/util-crypto/types'

import { Blockchain } from '@kiltprotocol/chain-helpers'
import { ConfigService } from '@kiltprotocol/config'
import type { Issuer } from '@kiltprotocol/credentials'
import {
  NewDidVerificationKey,
  authorizeTx,
  createLightDidDocument,
  didKeyToVerificationMethod,
  getFullDid,
  getStoreTx,
  multibaseKeyToDidKey,
  resolve,
} from '@kiltprotocol/did'
import type {
  Did,
  DidDocument,
  DidUrl,
  KeyringPair,
  KiltAddress,
  SignerInterface,
  UriFragment,
} from '@kiltprotocol/types'
import { Crypto, SDKErrors, Signers } from '@kiltprotocol/utils'

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
  addSigner: (...signers: SignerInterface[]) => Identity
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
  getSigners: (filterBy?: {
    verificationMethod?: DidUrl | UriFragment
    verificationRelationship?: string
    algorithm?: string
  }) => SignerInterface[]
  /**
   * Same as {@link getSigners} but pre-selects a signer matching the criteria and throws if none are found.
   *
   * @param filterBy See {@link getSigners}.
   * @returns A Promise of a signer, which throws if none match the selection criteria.
   */
  getSigner: (filterBy?: {
    verificationMethod?: DidUrl | UriFragment
    verificationRelationship?: string
    algorithm?: string
  }) => SignerInterface
  /**
   * Refreshes the didDocument and/or purges signers that are not linked to a VM currently referenced in the document.
   *
   * @param opts Controls whether you want to only reload the document, or only purge signers. Defaults to doing both.
   * @returns The (in-place) modified Identity object for chaining.
   */
  update: (opts?: {
    skipResolution?: boolean
    purgeSigners?: boolean
  }) => Promise<Identity>
  /**
   * Uses a verification method related signer to DID-authorize a call to be executed on-chain with the identity's DID as the origin.
   *
   * @param tx The call to be authorized.
   * @returns The authorized (signed) call.
   */
  authorizeTx?: Issuer.IssuerOptions['authorizeTx']
  /**
   * Takes care of submitting the transaction to node in the network and listening for execution results.
   * This can consist of signing the tx using the signer associated with submitterAccount and interacting directly with a node, or can use an external service for this.
   *
   * @param tx The extrinsic ready to be (signed and) submitted.
   * @returns A promise resolving to an object indicating the block of inclusion, or rejecting if the transaction failed to be included or execute correctly.
   */
  submitTx?: Issuer.IssuerOptions['submitTx']
  submitterAddress?: KiltAddress
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
  public resolver: typeof resolve
  public didDocument: DidDocument
  protected didSigners: SignerInterface[]
  get signers(): SignerInterface[] {
    return [...this.didSigners]
  }

  public get did(): Did {
    return this.didDocument.id
  }

  constructor({
    didDocument,
    signers,
    resolver = resolve,
  }: {
    didDocument: DidDocument
    signers?: SignerInterface[]
    resolver?: typeof resolve
  }) {
    this.didDocument = didDocument
    this.didSigners = signers ? [...signers] : []
    this.resolver = resolver
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
      try {
        this.didSigners = this.getSigners()
      } catch {
        this.didSigners = []
      }
    }
    return this
  }

  public addSigner(...signers: SignerInterface[]): IdentityClass {
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
            this.addSigner(
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

  public getSigners({
    verificationMethod,
    verificationRelationship,
    algorithm,
  }: {
    verificationMethod?: DidUrl | UriFragment
    verificationRelationship?: string
    algorithm?: string
  } = {}): SignerInterface[] {
    const selectors = [
      Signers.select.byDid(this.didDocument, { verificationRelationship }),
    ]
    if (algorithm) {
      selectors.push(Signers.select.byAlgorithm([algorithm]))
    }
    if (verificationMethod) {
      selectors.push(Signers.select.bySignerId([verificationMethod]))
    }
    return Signers.selectSigners(this.didSigners, ...selectors)
  }

  public getSigner(
    criteria: {
      verificationMethod?: DidUrl | UriFragment
      verificationRelationship?: string
      algorithm?: string
    } = {}
  ): SignerInterface {
    const [signer] = this.getSigners(criteria)
    if (typeof signer === 'undefined') {
      throw new SDKErrors.NoSuitableSignerError(undefined, {
        signerRequirements: criteria,
        availableSigners: this.didSigners,
      })
    }
    return signer
  }
}

export type TransactionStrategy<T extends IdentityClass> = (
  identity: IdentityClass & Identity
) => Promise<T>

export async function makeIdentity(args: {
  did?: Did
  didDocument?: DidDocument
  signers?: SignerInterface[]
  keypairs?: Array<Keypair | KeyringPair>
  resolver?: typeof resolve
}): Promise<IdentityClass>
export async function makeIdentity<T extends IdentityClass>(args: {
  did?: Did
  didDocument?: DidDocument
  signers?: SignerInterface[]
  keypairs?: Array<Keypair | KeyringPair>
  resolver?: typeof resolve
  transactionStrategy: TransactionStrategy<T>
}): Promise<T>
/**
 * @param root0
 * @param root0.did
 * @param root0.didDocument
 * @param root0.signers
 * @param root0.keypairs
 * @param root0.resolver
 * @param root0.transactionStrategy
 */
export async function makeIdentity<T extends IdentityClass>({
  did,
  didDocument,
  keypairs,
  signers,
  resolver = resolve,
  transactionStrategy,
}: {
  did?: Did
  didDocument?: DidDocument
  signers?: SignerInterface[]
  keypairs?: Array<Keypair | KeyringPair>
  resolver?: typeof resolve
  transactionStrategy?: TransactionStrategy<T>
}): Promise<IdentityClass | T> {
  let didDoc = didDocument
  if (!didDoc) {
    if (!did) {
      throw new Error('either `did` or `didDocument` is required')
    }
    didDoc = await loadDidDocument(did, resolver)
  }
  const identity = new IdentityClass({
    didDocument: didDoc,
    signers,
    resolver,
  })
  await identity.update({ skipResolution: true })
  if (keypairs && keypairs.length !== 0) {
    await identity.addKeypair(...keypairs)
  }
  if (!transactionStrategy) {
    return identity
  }
  return transactionStrategy(identity)
}

type TypedKeyPair =
  | (Keypair & { type: KeyringPair['type'] | 'x25519' })
  | KeyringPair
// | SignerInterface<Signers.DidPalletSupportedAlgorithms, Address>

function isTypedKeyPair(
  input: unknown
): input is TypedKeyPair & NewDidVerificationKey {
  return (
    typeof input === 'object' &&
    input !== null &&
    'type' in input &&
    'publicKey' in input &&
    ['ed25519', 'sr25519', 'ecdsa'].includes(input.type as string) &&
    ('secretKey' in input || 'sign' in input)
  )
}

type TypedKeyPairs = {
  authentication: [TypedKeyPair]
  assertionMethod?: [TypedKeyPair]
  delegationMethod?: [TypedKeyPair]
  keyAgreement?: [TypedKeyPair]
}

export async function newIdentity(args: {
  keys: TypedKeyPair | TypedKeyPairs
  resolver?: typeof resolve
}): Promise<IdentityClass>
export async function newIdentity<
  T extends IdentityClass &
    Required<Pick<Identity, 'submitTx' | 'submitterAddress'>>
>(args: {
  keys: TypedKeyPair | TypedKeyPairs
  resolver?: typeof resolve
  transactionStrategy: TransactionStrategy<T>
}): Promise<T>
export async function newIdentity<
  T extends IdentityClass &
    Required<Pick<Identity, 'submitTx' | 'submitterAddress'>>
>({
  keys,
  resolver = resolve,
  transactionStrategy,
}: {
  keys: TypedKeyPair | TypedKeyPairs
  resolver?: typeof resolve
  transactionStrategy?: TransactionStrategy<T>
}): Promise<IdentityClass | T> {
  let typedKeyPairs: TypedKeyPairs
  const allKeypairs: TypedKeyPair[] = []
  if (isTypedKeyPair(keys)) {
    allKeypairs.push(keys)
    typedKeyPairs = {
      authentication: [keys],
      assertionMethod: [keys],
      delegationMethod: [keys],
    }
  } else {
    typedKeyPairs = keys as TypedKeyPairs
    Object.entries(typedKeyPairs).forEach(([role, [key]]) => {
      if (
        ['authentication', 'assertionMethod', 'delegationMethod'].includes(
          role
        ) &&
        isTypedKeyPair(key)
      ) {
        allKeypairs.push(key)
      }
    })
  }

  if (!transactionStrategy) {
    const didDocument = createLightDidDocument(typedKeyPairs as any)
    return makeIdentity({ didDocument, resolver, keypairs: allKeypairs })
  }

  const [authenticationPair] = typedKeyPairs.authentication
  const authenticationAddress = Crypto.encodeAddress(
    authenticationPair.publicKey,
    38
  )

  const did = getFullDid(authenticationAddress)
  const identity = await makeIdentity({
    didDocument: {
      id: did,
      verificationMethod: [
        didKeyToVerificationMethod(did, `#${authenticationAddress}`, {
          keyType: authenticationPair.type as any,
          publicKey: authenticationPair.publicKey,
        }),
      ],
      authentication: [`#${authenticationAddress}`],
    },
    resolver,
    keypairs: [authenticationPair],
    transactionStrategy,
  })

  const tx = await getStoreTx(
    // @ts-ignore
    typedKeyPairs,
    identity.submitterAddress ?? authenticationAddress,
    identity.signers.map((signer) => ({
      ...signer,
      id: authenticationAddress,
    }))
  )

  const result = await identity.submitTx(tx)
  if (result.status !== 'Finalized' && result.status !== 'InBlock') {
    return Promise.reject(result)
  }
  // update did document (preliminary signers will be purged)
  await identity.update()
  // re-add keys, now matched to actual VMs
  await identity.addKeypair(...allKeypairs)
  // return identity
  return identity
}

export type IdentityWithSubmitter = IdentityClass &
  Required<Pick<Identity, 'authorizeTx' | 'submitTx' | 'submitterAddress'>>

/**
 * @param root0
 * @param root0.signer
 */
export function withSubmitterAccount({
  signer,
}: {
  signer: Blockchain.TransactionSigner | KeyringPair
}): TransactionStrategy<IdentityWithSubmitter> {
  const submitterAddress = (
    'address' in signer ? signer.address : signer.id
  ) as KiltAddress
  return async (identity) => {
    /* eslint-disable-next-line no-param-reassign */
    identity.submitterAddress = submitterAddress
    /* eslint-disable-next-line no-param-reassign */
    identity.authorizeTx = (tx) =>
      authorizeTx(identity.didDocument, tx, identity.signers, submitterAddress)
    /* eslint-disable-next-line no-param-reassign */
    identity.submitTx = async (tx) => {
      const submittable = ConfigService.get('api').tx(tx)
      const result = await Blockchain.signAndSubmitTx(submittable, signer, {
        resolveOn: Blockchain.IS_FINALIZED,
      })
      return {
        status: 'Finalized',
        includedAt: {
          blockHash: result.status.asFinalized,
        },
        events: result.events,
      }
    }
    return identity as IdentityWithSubmitter
  }
}
