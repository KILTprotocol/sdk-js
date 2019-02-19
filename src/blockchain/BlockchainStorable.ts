/**
 * @module Blockchain
 */
import { CodecResult, SubscriptionResult } from '@polkadot/api/promise/types'
import SubmittableExtrinsic from '@polkadot/api/SubmittableExtrinsic'
import { ExtrinsicStatus, Hash } from '@polkadot/types'
import { Codec } from '@polkadot/types/types'

import { factory } from '../config/ConfigLog'
import Identity from '../identity/Identity'
import Blockchain from './Blockchain'

const log = factory.getLogger('BlockchainStorable')

export interface IBlockchainStorable {
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
  ): Promise<Hash>

  /**
   * Verifies that the entity is stored on the blockchain.
   *
   * @param blockchain the blockchain API object
   */
  verifyStored(blockchain: Blockchain): Promise<boolean>

  /**
   * Each blockchain storable must provide a unique hash used to store and retrieve it on/from the blockchain.
   */
  getHash(): string
}

export abstract class BlockchainStorable implements IBlockchainStorable {
  public async store(
    blockchain: Blockchain,
    identity: Identity,
    onsuccess?: () => void
  ): Promise<Hash> {
    const signature = identity.sign(this.getHash())
    const submittedExtrinsic: SubmittableExtrinsic<
      CodecResult,
      any
    > = await this.callStoreFunction(blockchain, signature)
    return this.submitToBlockchain(
      blockchain,
      identity,
      submittedExtrinsic,
      onsuccess
    )
  }

  public async verifyStored(blockchain: Blockchain): Promise<boolean> {
    const query: Codec | null | undefined = await this.query(
      blockchain,
      this.getHash()
    )
    // @ts-ignore
    const value = query && query.encodedLength ? query.toJSON() : null
    return value != null
  }

  public abstract getHash(): string

  protected submitToBlockchain(
    blockchain: Blockchain,
    identity: Identity,
    extrinsic: SubmittableExtrinsic<CodecResult, SubscriptionResult>,
    onsuccess?: () => void
  ) {
    return blockchain.submitTx(
      identity,
      extrinsic,
      (status: ExtrinsicStatus) => {
        if (
          onsuccess &&
          status.type === 'Finalised' &&
          status.value &&
          status.value.encodedLength > 0
        ) {
          log.debug(
            () => `Entity successfully stored on chain. Status: ${status}`
          )
          onsuccess()
        }
      }
    )
  }

  /**
   * Implementations must provide the concrete implementation for querying the entity on the blockchain.
   *
   * @param blockchain the blockchain API object
   * @param hash the hash value serving as the key to the blockchain store
   */
  protected abstract query(
    blockchain: Blockchain,
    hash: string
  ): Promise<Codec | null | undefined>

  /**
   * Subclasses must call the concrete blockchain module for storing the entity.
   *
   * @param blockchain the blockchain API object
   * @param signature the signed entity
   */
  protected abstract callStoreFunction(
    blockchain: Blockchain,
    signature: Uint8Array
  ): Promise<SubmittableExtrinsic<CodecResult, SubscriptionResult>>
}
