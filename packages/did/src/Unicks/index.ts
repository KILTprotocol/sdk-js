import { SubmittableExtrinsic, IDidDetails, } from '@kiltprotocol/types';
import { BlockchainApiConnection } from '@kiltprotocol/chain-helpers';
import { DecoderUtils } from '@kiltprotocol/utils'
import { DidUtils } from '@kiltprotocol/did'

import type { Option, Bytes } from '@polkadot/types'
import type { AccountId } from '@polkadot/types/interfaces'

type Unick = string;

export interface IUnicks {
    /**
     * Returns a extrinsic to claim a new unick.
     * 
     * @param nick unick that should be claimed
     */
    getClaimTx(nick: Unick): Promise<SubmittableExtrinsic>

    /**
     * Returns a extrinsic to release a unick by its owner.
     * 
     * @param nick unick that should be released
     */
    getReleaseByOwnerTx(nick: Unick): Promise<SubmittableExtrinsic>

    /**
     * Returns a extrinsic to release a unick by the account that owns the deposit.
     * 
     * @param nick unick that should be released
     */
    getReleaseByPayerTx(nick: Unick): Promise<SubmittableExtrinsic>

    /**
     * Returns a extrinsic to put a nick on the list of banned nicks.
     * 
     * @param nick unick that should be banned
     */
    getBanTx(nick: Unick): Promise<SubmittableExtrinsic>

    /**
     * Returns a extrinsic to remove a nick from the list of banned nicks.
     * 
     * @param nick unick that should be unbanned
     */
    getUnbanTx(nick: Unick): Promise<SubmittableExtrinsic>

    /**
     * Retrieve the Unick for a specific did.
     * 
     * @param didUri DID uri of the unick owner, i.e. 'did:kilt:4...'
     * @returns the registered unick for this DID if any
     */
    queryUnickForDid(didUri: string): Promise<Unick | null>

    /**
     * Retrieve the did for a specific unick.
     * 
     * @param nick unick that should be resolved to a DID
     * @returns the DID uri for this unick if any
     */
    queryDidForUnick(nick: Unick): Promise<IDidDetails['did'] | null>
}

export default class Unicks implements IUnicks {
    async getClaimTx(nick: Unick): Promise<SubmittableExtrinsic> {
        return getClaimTx(nick);
    }

    async getReleaseByOwnerTx(nick: Unick): Promise<SubmittableExtrinsic> {
        return getReleaseByOwnerTx(nick);
    }

    async getReleaseByPayerTx(nick: Unick): Promise<SubmittableExtrinsic> {
        return getReleaseByPayerTx(nick);
    }

    async getBanTx(nick: Unick): Promise<SubmittableExtrinsic> {
        return getBanTx(nick);
    }

    async getUnbanTx(nick: Unick): Promise<SubmittableExtrinsic> {
        return getUnbanTx(nick);
    }

    async queryUnickForDid(didUri: string): Promise<Unick | null> {
        return queryUnickForDid(didUri);
    }

    async queryDidForUnick(nick: Unick): Promise<IDidDetails['did'] | null> {
        return queryDidForUnick(nick);
    }
}

export async function getClaimTx(nick: Unick): Promise<SubmittableExtrinsic> {
    const blockchain = await BlockchainApiConnection.getConnectionOrConnect();
    const tx: SubmittableExtrinsic = blockchain.api.tx.unicks.claim(nick);
    return tx;
}

export async function getReleaseByOwnerTx(nick: Unick): Promise<SubmittableExtrinsic> {
    const blockchain = await BlockchainApiConnection.getConnectionOrConnect();
    const tx: SubmittableExtrinsic = blockchain.api.tx.unicks.releaseByOwner(nick);
    return tx;
}

export async function getReleaseByPayerTx(nick: Unick): Promise<SubmittableExtrinsic> {
    const blockchain = await BlockchainApiConnection.getConnectionOrConnect();
    const tx: SubmittableExtrinsic = blockchain.api.tx.unicks.releaseByPayer(nick);
    return tx;
}

export async function getBanTx(nick: Unick): Promise<SubmittableExtrinsic> {
    const blockchain = await BlockchainApiConnection.getConnectionOrConnect();
    const tx: SubmittableExtrinsic = blockchain.api.tx.unicks.ban(nick);
    return tx;
}

export async function getUnbanTx(nick: Unick): Promise<SubmittableExtrinsic> {
    const blockchain = await BlockchainApiConnection.getConnectionOrConnect();
    const tx: SubmittableExtrinsic = blockchain.api.tx.unicks.unban(nick);
    return tx;
}

export async function queryUnickForDid(didUri: string): Promise<Unick | null> {
    const blockchain = await BlockchainApiConnection.getConnectionOrConnect();
    const encoded = await blockchain.api.query.unicks.unicks<Option<Bytes>>(didUri);
    DecoderUtils.assertCodecIsType(encoded, ['Option<Vec<u8>>'])
    return encoded.isSome
        ? encoded.unwrap().toUtf8()
        : null;
}

export async function queryDidForUnick(nick: Unick): Promise<IDidDetails['did'] | null> {
    const blockchain = await BlockchainApiConnection.getConnectionOrConnect();
    const encoded = await blockchain.api.query.unicks.owner<Option<AccountId>>(nick);
    DecoderUtils.assertCodecIsType(encoded, ['Option<AccountId32>'])
    return encoded.isSome
        ? DidUtils.getKiltDidFromIdentifier(encoded.unwrap().toString(), 'full')
        : null;
}

