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
   *
   * @param blockchain the blockchain API object
   * @param identity the identity used to store the entity on chain
   */
  store(blockchain: Blockchain, identity: Identity): Promise<ExtrinsicStatus>

  /**
   * Verifies that the entity is stored on the blockchain.
   *
   * @param blockchain the blockchain API object
   */
  verifyStored(blockchain: Blockchain): Promise<boolean>

  query(blockchain: Blockchain, identifier: string): Promise<QueryType>

  /**
   * Each blockchain storable must provide a unique identifier used to store and retrieve it on/from the blockchain.
   */
  getIdentifier(): string
}

export abstract class BlockchainStorable<QueryType>
  implements IBlockchainStorable<QueryType> {
  public async store(
    blockchain: Blockchain,
    identity: Identity
  ): Promise<ExtrinsicStatus> {
    const submittedExtrinsic: SubmittableExtrinsic<
      CodecResult,
      any
    > = await this.createTransaction(blockchain)
    return this.submitToBlockchain(blockchain, identity, submittedExtrinsic)
  }

  public async verifyStored(blockchain: Blockchain): Promise<boolean> {
    const query: Codec | null | undefined = await this.queryRaw(
      blockchain,
      this.getIdentifier()
    )
    // @ts-ignore
    const value = query && query.encodedLength ? query.toJSON() : null
    return value != null
  }

  public async query(
    blockchain: Blockchain,
    identifier: string
  ): Promise<QueryType> {
    const encoded = await this.queryRaw(blockchain, identifier)
    try {
      return this.decode(encoded, identifier)
    } catch (err) {
      return Promise.reject(err)
    }
  }

  public abstract getIdentifier(): string

  protected abstract decode(
    encoded: Codec | null | undefined,
    identifier: string
  ): QueryType

  protected submitToBlockchain(
    blockchain: Blockchain,
    identity: Identity,
    extrinsic: SubmittableExtrinsic<CodecResult, SubscriptionResult>
  ): Promise<ExtrinsicStatus> {
    return blockchain.submitTx(identity, extrinsic)
  }

  /**
   * Implementations must provide the concrete implementation for querying the entity on the blockchain.
   *
   * @param blockchain the blockchain API object
   * @param identifier the identifier serving as the key to the blockchain store
   */
  protected abstract queryRaw(
    blockchain: Blockchain,
    identifier: string
  ): Promise<Codec | null | undefined>

  /**
   * Subclasses must call the concrete blockchain module for creating the transaction.
   *
   * @param blockchain the blockchain API object
   * @param signature the signed entity
   */
  protected abstract createTransaction(
    blockchain: Blockchain
  ): Promise<SubmittableExtrinsic<CodecResult, SubscriptionResult>>
}
