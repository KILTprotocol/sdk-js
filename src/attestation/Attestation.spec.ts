import { Text } from '@polkadot/types'
import Bool from '@polkadot/types/Bool'
import { Tuple } from '@polkadot/types/codec'
import Blockchain from '../blockchain/Blockchain'
import { IClaim } from '../claim/Claim'
import Crypto from '../crypto'
import Identity from '../identity/Identity'
import Attestation from './Attestation'
import { Constructor, Codec } from '@polkadot/types/types'

describe('Attestation', () => {
  const identityAlice = Identity.buildFromSeedString('Alice')
  const claim = {
    alias: 'test',
    ctype: 'testCtype',
    contents: {},
    hash: '1234',
    owner: 'alice',
    signature: '98765',
  } as IClaim

  it('stores attestation', async () => {
    const resultHash = Crypto.hashStr('987654')
    const claimHash = Crypto.hashStr(JSON.stringify(claim))
    const signatureAlice = Crypto.signStr(
      claimHash,
      identityAlice.signKeyPair.secretKey
    )
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
              const tuple = new Tuple(
                [Tuple.with([Text, Text, Text, Bool])],
                [[claimHash, identityAlice.address, signatureAlice, false]]
              )
              return Promise.resolve(tuple)
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

    const onsuccess = () => {
      return true
    }

    const attestation = new Attestation(claim, identityAlice)
    expect(
      await attestation.store(blockchain, identityAlice, onsuccess)
    ).toEqual(resultHash)
    expect(await attestation.verifyStored(blockchain)).toBeTruthy()
    expect(await attestation.verify(blockchain)).toBeTruthy()
  })

  it('verify attestations not on chain', async () => {
    // @ts-ignore
    const blockchain = {
      api: {
        query: {
          attestation: {
            attestations: jest.fn(hash => {
              return Promise.resolve(new Tuple([], []))
            }),
          },
        },
      },
    } as Blockchain

    const attestation = new Attestation(claim, identityAlice, false)
    expect(await attestation.verifyStored(blockchain)).toBeFalsy()
    expect(await attestation.verify(blockchain)).toBeFalsy()
  })

  it('verify attestation revoked', async () => {
    const claimHash = Crypto.hashStr(JSON.stringify(claim))
    const signatureAlice = Crypto.signStr(
      claimHash,
      identityAlice.signKeyPair.secretKey
    )
    // @ts-ignore
    const blockchain = {
      api: {
        query: {
          attestation: {
            attestations: jest.fn(hash => {
              return Promise.resolve(
                new Tuple(
                  [Tuple.with([Text, Text, Text, Bool])],
                  [[claimHash, identityAlice, signatureAlice, true]]
                )
              )
            }),
          },
        },
      },
    } as Blockchain

    const attestation = new Attestation(claim, identityAlice, false)
    expect(await attestation.verifyStored(blockchain)).toBeTruthy()
    expect(await attestation.verify(blockchain)).toBeFalsy()
  })

  it('verify attestation', async () => {
    const invalidClaim = {
      alias: 'test',
      ctype: 'testCtype',
      contents: {},
      hash: '1234',
      owner: 'bob',
      signature: 'fraudSignature',
    } as IClaim

    const identityBob = Identity.buildFromSeedString('Bob')
    const identitySteve = Identity.buildFromSeedString('Steve')
    const identityFerdie = Identity.buildFromSeedString('Ferdie')
    const claimHash = Crypto.hashStr(JSON.stringify(claim))
    const invalidClaimHash = Crypto.hashStr(JSON.stringify(invalidClaim))
    const signatureAlice = Crypto.signStr(
      claimHash,
      identityAlice.signKeyPair.secretKey
    )
    const signatureBob = Crypto.signStr(
      claimHash,
      identityBob.signKeyPair.secretKey
    )
    const signatureSteve = Crypto.signStr(
      claimHash,
      identitySteve.signKeyPair.secretKey
    )
    const invalidSignatureFerdie = Crypto.signStr(
      invalidClaimHash,
      identityFerdie.signKeyPair.secretKey
    )
    // @ts-ignore
    const blockchain = {
      api: {
        query: {
          attestation: {
            attestations: jest.fn(hash => {
              const innerTupleType: Constructor<Codec> = Tuple.with([
                Text,
                Text,
                Text,
                Bool,
              ])
              return Promise.resolve(
                new Tuple(
                  [
                    innerTupleType,
                    innerTupleType,
                    innerTupleType,
                    innerTupleType,
                  ],
                  [
                    [claimHash, identityAlice.address, signatureAlice, false],
                    [claimHash, identityBob.address, signatureBob, true],
                    [claimHash, identitySteve.address, signatureSteve, false],
                    [
                      claimHash,
                      identityFerdie.address,
                      invalidSignatureFerdie,
                      false,
                    ],
                  ]
                )
              )
            }),
          },
        },
      },
    } as Blockchain

    expect(
      await Attestation.verify(blockchain, claim, identityAlice)
    ).toBeTruthy()
    expect(await Attestation.verify(blockchain, claim, identityBob)).toBeFalsy()
    expect(
      await Attestation.verify(blockchain, claim, identitySteve)
    ).toBeTruthy()
    expect(
      await Attestation.verify(blockchain, claim, identityFerdie)
    ).toBeFalsy()
  })
})
