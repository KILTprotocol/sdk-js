/**
 * @module Blockchain
 */
import { CodecResult, SubscriptionResult } from '@polkadot/api/promise/types'
import SubmittableExtrinsic from '@polkadot/api/SubmittableExtrinsic'
import { ExtrinsicStatus } from '@polkadot/types'
import { Codec } from '@polkadot/types/types'

import Identity from '../identity/Identity'
import Blockchain from './Blockchain'

export interface IBlockchainStorable<QueryType> {
  /**
   * Stores the entity on the blockchain.
   * TODO: populate errors via another callback
   *
   * @param blockchain the blockchain API object
   * @param identity the identity used to store the entity on chain
   * @param onsuccess the success callback
   */
  store(
    blockchain: Blockchain,
    identity: Identity,
    onsuccess?: () => void
  ): Promise<ExtrinsicStatus>

  /**
   * Verifies that the entity is stored on the blockchain.
   *
   * @param blockchain the blockchain API object
   */
  verifyStored(blockchain: Blockchain): Promise<boolean>

  query(blockchain: Blockchain, hash: string): Promise<QueryType>

  /**
   * Each blockchain storable must provide a unique hash used to store and retrieve it on/from the blockchain.
   */
  getHash(): string
}

export abstract class BlockchainStorable<QueryType>
  implements IBlockchainStorable<QueryType> {
  public async store(
    blockchain: Blockchain,
    identity: Identity
  ): Promise<ExtrinsicStatus> {
    const signature = identity.sign(this.getHash())
    const submittedExtrinsic: SubmittableExtrinsic<
      CodecResult,
      any
    > = await this.createTransaction(blockchain, signature)
    return this.submitToBlockchain(blockchain, identity, submittedExtrinsic)
  }

  public async verifyStored(blockchain: Blockchain): Promise<boolean> {
    const query: Codec | null | undefined = await this.queryRaw(
      blockchain,
      this.getHash()
    )
    // @ts-ignore
    const value = query && query.encodedLength ? query.toJSON() : null
    return value != null
  }

  public async query(blockchain: Blockchain, hash: string): Promise<QueryType> {
    const encoded = await this.queryRaw(blockchain, hash)
    try {
      return this.decode(encoded)
    } catch (err) {
      return Promise.reject(err)
    }
  }

  public abstract getHash(): string

  protected abstract decode(encoded: Codec | null | undefined): QueryType

  protected submitToBlockchain(
    blockchain: Blockchain,
    identity: Identity,
    extrinsic: SubmittableExtrinsic<CodecResult, SubscriptionResult>
  ) {
    return blockchain.submitTx(identity, extrinsic)
  }

  /**
   * Implementations must provide the concrete implementation for querying the entity on the blockchain.
   *
   * @param blockchain the blockchain API object
   * @param hash the hash value serving as the key to the blockchain store
   */
  protected abstract queryRaw(
    blockchain: Blockchain,
    hash: string
  ): Promise<Codec | null | undefined>

  /**
   * Subclasses must call the concrete blockchain module for creating the transaction.
   *
   * @param blockchain the blockchain API object
   * @param signature the signed entity
   */
  protected abstract createTransaction(
    blockchain: Blockchain,
    signature: Uint8Array
  ): Promise<SubmittableExtrinsic<CodecResult, SubscriptionResult>>
}
