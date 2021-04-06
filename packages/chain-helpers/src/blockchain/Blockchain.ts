/**
 * Blockchain bridges that connects the SDK and the KILT Blockchain.
 *
 * Communicates with the chain via WebSockets and can [[listenToBlocks]]. It exposes the [[submitTx]] function that performs a transaction.
 *
 * @packageDocumentation
 * @module Blockchain
 */

import type { ApiPromise } from '@polkadot/api'
import { Header } from '@polkadot/types/interfaces/types'
import { AnyJson, Codec } from '@polkadot/types/types'
import { Text } from '@polkadot/types'
import { SignerPayloadJSON } from '@polkadot/types/types/extrinsic'
import BN from 'bn.js'
import { SDKErrors } from '@kiltprotocol/utils'
import { ConfigService } from '@kiltprotocol/config'
import type {
  IIdentity,
  ISubmittableResult,
  SubmittableExtrinsic,
  IBlockchainApi,
  BlockchainStats,
  SubscriptionPromise,
} from '@kiltprotocol/types'
import { parseSubscriptionOptions, submitSignedTx } from './Blockchain.utils'

const log = ConfigService.LoggingFactory.getLogger('Blockchain')

// Code taken from
// https://polkadot.js.org/api/api/classes/_promise_index_.apipromise.html

export default class Blockchain implements IBlockchainApi {
  public static asArray(queryResult: Codec): AnyJson[] {
    const json = queryResult.toJSON()
    if (json instanceof Array) return json
    return []
  }

  public api: ApiPromise
  private accountNonces: Map<IIdentity['address'], BN>

  public constructor(api: ApiPromise) {
    this.api = api
    this.accountNonces = new Map<IIdentity['address'], BN>()
  }

  public async getStats(): Promise<BlockchainStats> {
    const encoded: Text[] = await Promise.all([
      this.api.rpc.system.chain(),
      this.api.rpc.system.name(),
      this.api.rpc.system.version(),
    ])
    const [chain, nodeName, nodeVersion] = encoded.map((el) => el.toString())
    return { chain, nodeName, nodeVersion }
  }

  // TODO: implement unsubscribe as subscriptionId continuously increases
  public async listenToBlocks(
    listener: (header: Header) => void
  ): Promise<() => void> {
    return this.api.rpc.chain.subscribeNewHeads(listener)
  }

  /**
   * [ASYNC] Signs the SubmittableExtrinsic with the given identity.
   *
   * @param identity The [[Identity]] to sign the tx with.
   * @param tx The unsigned SubmittableExtrinsic.
   * @returns Signed SubmittableExtrinsic.
   *
   */
  public async signTx(
    identity: IIdentity,
    tx: SubmittableExtrinsic
  ): Promise<SubmittableExtrinsic> {
    const nonce = await this.getNonce(identity.address)
    const signed: SubmittableExtrinsic = await identity.signSubmittableExtrinsic(
      tx,
      nonce
    )
    return signed
  }

  /**
   * [ASYNC] Submits a signed SubmittableExtrinsic with exported function [[submitSignedTx]].
   * Handles recoverable errors if identity is provided by re-signing and re-sending the tx up to two times.
   * Uses [[parseSubscriptionOptions]] to provide complete potentially defaulted options to the called [[submitSignedTx]].
   *
   * Transaction fees will apply whenever a transaction fee makes it into a block, even if extrinsics fail to execute correctly!
   *
   * @param tx The SubmittableExtrinsic to be submitted. Most transactions need to be signed, this must be done beforehand.
   * @param identity Optional [[Identity]] to potentially re-sign the tx with.
   * @param opts Optional partial criteria for resolving/rejecting the promise.
   * @returns A promise which can be used to track transaction status.
   * If resolved, this promise returns the eventually resolved ISubmittableResult.
   */
  public async submitTxWithReSign(
    tx: SubmittableExtrinsic,
    identity?: IIdentity,
    opts?: Partial<SubscriptionPromise.Options>
  ): Promise<ISubmittableResult> {
    const options = parseSubscriptionOptions(opts)
    const retry = async (reason: Error): Promise<ISubmittableResult> => {
      if (
        reason.message === SDKErrors.ERROR_TRANSACTION_RECOVERABLE().message &&
        identity
      ) {
        return submitSignedTx(await this.reSignTx(identity, tx), options)
      }
      throw reason
    }
    return submitSignedTx(tx, options).catch(retry).catch(retry)
  }

  /**
   * [ASYNC] Signs and submits the SubmittableExtrinsic with optional resolution and rejection criteria.
   *
   * @param identity The [[Identity]] used to sign and potentially re-sign the tx.
   * @param tx The generated unsigned SubmittableExtrinsic to submit.
   * @param opts Partial optional criteria for resolving/rejecting the promise.
   * @returns Promise result of executing the extrinsic, of type ISubmittableResult.
   *
   */
  public async submitTx(
    identity: IIdentity,
    tx: SubmittableExtrinsic,
    opts?: Partial<SubscriptionPromise.Options>
  ): Promise<ISubmittableResult> {
    const signedTx = await this.signTx(identity, tx)
    return this.submitTxWithReSign(signedTx, identity, opts)
  }

  /**
   * [ASYNC] Retrieves the Nonce for Transaction signing for the specified account and increments the in accountNonces mapped Index.
   *
   * @param accountAddress The address of the identity that we retrieve the nonce for.
   * @returns Representation of the Tx nonce for the identity.
   *
   */
  public async getNonce(accountAddress: string): Promise<BN> {
    let nonce = this.accountNonces.get(accountAddress)
    if (!nonce) {
      // the account nonce is unknown, we will query it from chain
      const chainNonce = await this.api.rpc.system
        .accountNextIndex(accountAddress)
        .catch((reason) => {
          log.error(
            `On-chain nonce retrieval failed for account ${accountAddress}\nwith reason: ${reason}`
          )
          throw Error(`Chain failed to retrieve nonce for : ${accountAddress}`)
        })
      // ensure that the nonce we queried is still up to date and no newer nonce was queried during the await above
      const secondQuery = this.accountNonces.get(accountAddress)
      nonce = BN.max(chainNonce, secondQuery || new BN(0))
    }
    this.accountNonces.set(accountAddress, nonce.addn(1))
    return nonce
  }

  /**
   * [ASYNC] Re-signs the given SubmittableExtrinsic with an updated Nonce.
   *
   * @param identity The [[Identity]] to re-sign the Tx with.
   * @param tx The tx with recoverable Error that failed.
   * @returns Original Tx, injected with signature payload with updated nonce.
   *
   */
  public async reSignTx(
    identity: IIdentity,
    tx: SubmittableExtrinsic
  ): Promise<SubmittableExtrinsic> {
    this.accountNonces.delete(identity.address)
    const nonce: BN = await this.getNonce(identity.address)
    const signerPayload: SignerPayloadJSON = this.api
      .createType('SignerPayload', {
        method: tx.method.toHex(),
        nonce,
        genesisHash: this.api.genesisHash,
        blockHash: this.api.genesisHash,
        runtimeVersion: this.api.runtimeVersion,
        version: this.api.extrinsicVersion,
      })
      .toPayload()
    tx.addSignature(
      identity.address,
      this.api
        .createType('ExtrinsicPayload', signerPayload, {
          version: this.api.extrinsicVersion,
        })
        .sign(identity.signKeyringPair).signature,
      signerPayload
    )
    return tx
  }
}
