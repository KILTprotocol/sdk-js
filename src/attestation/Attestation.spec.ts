import Blockchain from "../blockchain/Blockchain";
import { IClaim } from '../claim/Claim';
import Crypto from '../crypto';
import Identity from '../identity/Identity';
import Attestation from './Attestation';

describe('Attestation', () => {

    it('stores ctypes', async () => {
        const resultHash = Crypto.hashStr('987654')
        // @ts-ignore
        const blockchain = {
            api: {
                tx: {
                    attestation: {
                        add: jest.fn((hash, signature) => {
                            return Promise.resolve({ hash, signature })
                        }),
                    },
                },
                query: {
                    attestation: {
                        attestations: jest.fn(hash => {
                            return true
                        }),
                    },
                },
            },
            getStats: jest.fn(),
            listenToBlocks: jest.fn(),
            listenToBalanceChanges: jest.fn(),
            makeTransfer: jest.fn(),
            submitTx: jest.fn((identity, tx, statusCb) => {
                statusCb({
                    type: 'Finalised',
                    value: {
                        encodedLength: 2,
                    },
                })
                return Promise.resolve(resultHash)
            }),
            getNonce: jest.fn(),
        } as Blockchain

        const identityAlice = Identity.buildFromSeedString('Alice')
        const onsuccess = () => {
            return true
        }

        const claim = {
            alias: 'test',
            ctype: 'testCtype',
            contents: {},
            hash: '1234',
            owner: 'alice',
            signature: '98765'
        } as IClaim

        const attestation = new Attestation(claim, identityAlice, false)
        expect(await attestation.store(blockchain, identityAlice, onsuccess)).toEqual(
            resultHash
        )
        expect(attestation.verifyStored(blockchain)).toBeTruthy()
    })
})
