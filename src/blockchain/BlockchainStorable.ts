import SubmittableExtrinsic from '@polkadot/api/promise/SubmittableExtrinsic';
import { ExtrinsicStatus, Hash } from '@polkadot/types';
import { Codec } from '@polkadot/types/types';

import { factory } from "../config/ConfigLog";
import Crypto from '../crypto';
import Identity from '../identity/Identity';
import Blockchain from './Blockchain';


const log = factory.getLogger("BlockchainStorable");

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
}

export abstract class BlockchainStorable implements IBlockchainStorable {

    /**
     * Implementations must provide the concrete implementation for querying the entity on the blockchain.
     * 
     * @param blockchain the blockchain API object
     * @param hash the hash value serving as the key to the blockchain store
     */
    protected abstract query(blockchain: Blockchain, hash: string): Promise<Codec | null | undefined>

    /**
     * Implementations must provide the concrete implementation for submitting the entity to the blockchain network.
     * 
     * @param blockchain the blockchain API object
     * @param signature the signed entity
     */
    protected abstract submit(blockchain: Blockchain, signature: Uint8Array): Promise<SubmittableExtrinsic>

    /**
     * Implementations must provide the hash of the entity used to store and retrieve the entity on/from the blockchain.
     */
    protected abstract getHash(): string;

    public async store(
        blockchain: Blockchain,
        identity: Identity,
        onsuccess?: () => void
    ): Promise<Hash> {
        const signature = Crypto.sign(this.getHash(), identity.signKeyPair.secretKey)
        const submittedExtrinsic: SubmittableExtrinsic = await this.submit(blockchain, signature)
        return blockchain.submitTx(identity, submittedExtrinsic, (status: ExtrinsicStatus) => {
            if (
                onsuccess &&
                status.type === 'Finalised' &&
                status.value &&
                status.value.encodedLength > 0
            ) {
                log.debug(() => `Entity successfully stored on chain. Status: ${status}`);
                onsuccess()
            }
        })
    }

    public async verifyStored(blockchain: Blockchain): Promise<boolean> {
        const query: Codec | null | undefined = await this.query(blockchain, this.getHash())
        const value = query && query.encodedLength ? query.toJSON() : null
        log.debug(() => `Query chain for hash ${this.getHash()}. Result: ${value}`);
        return !!value
    }

    /**
     * Query a 1-to-many entity from the blockchain
     * (Intended to be implemented in subclasses).
     * 
     * @param blockchain the blockchain API object
     * @param hash the key to query the entities on the blockchain
     */
    public static queryAll(blockchain: Blockchain, hash: string): Promise<any[]> {
        throw new Error('not implemented')
    }

    /**
     * Query a 1-to-1 entity from the blockchain.
     * (Intended to be implemented in subclasses).
     * 
     * @param blockchain the blockchain API object
     * @param hash the key to query the entity on the blockchain
     */
    public static queryOne(blockchain: Blockchain, hash: string): Promise<any> {
        throw new Error('not implemented')
    }
}