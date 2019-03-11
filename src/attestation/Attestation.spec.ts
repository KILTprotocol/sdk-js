import { Text } from '@polkadot/types'
import Bool from '@polkadot/types/Bool'
import { Tuple } from '@polkadot/types/codec'
import Blockchain from '../blockchain/Blockchain'
import { IClaim } from '../claim/Claim'
import Crypto from '../crypto'
import Identity from '../identity/Identity'
import Attestation from './Attestation'
import RequestForAttestation from '../requestforattestation/RequestForAttestation'

describe('Attestation', () => {
  const identityAlice = Identity.buildFromSeedString('Alice')
  const identityBob = Identity.buildFromSeedString('Bob')

  const ctypeHash = Crypto.hashStr('testCtype')
  const claim = {
    cType: ctypeHash,
    contents: {},
    owner: identityBob.address,
  } as IClaim
  const requestForAttestation: RequestForAttestation = new RequestForAttestation(
    claim,
    [],
    identityBob
  )

  it('stores attestation', async () => {
    // @ts-ignore
    const blockchain = {
      api: {
        tx: {
          attestation: {
            add: jest.fn((claimHash, _ctypeHash) => {
              return Promise.resolve()
            }),
          },
        },
        query: {
          attestation: {
            attestations: jest.fn(claimHash => {
              const tuple = new Tuple(
                // Attestations: claim-hash -> [(ctype-hash, account, delegation-id?, revoked)]
                [Tuple.with([Text, Text, Text, Bool])],
                [[ctypeHash, identityAlice.address, undefined, false]]
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
      submitTx: jest.fn((identity, tx) => {
        return Promise.resolve()
      }),
      getNonce: jest.fn(),
    } as Blockchain

    const attestation = new Attestation(requestForAttestation, identityAlice)
    expect(await attestation.verifyStored(blockchain)).toBeTruthy()
    expect(await attestation.verify(blockchain)).toBeTruthy()
  })

  it('verify attestations not on chain', async () => {
    // @ts-ignore
    const blockchain = {
      api: {
        query: {
          attestation: {
            attestations: jest.fn(claimHash => {
              return Promise.resolve(new Tuple([], []))
            }),
          },
        },
      },
    } as Blockchain

    const attestation = new Attestation(
      requestForAttestation,
      identityAlice,
      false
    )
    expect(await attestation.verifyStored(blockchain)).toBeFalsy()
    expect(await attestation.verify(blockchain)).toBeFalsy()
  })

  it('verify attestation revoked', async () => {
    // @ts-ignore
    const blockchain = {
      api: {
        query: {
          attestation: {
            attestations: jest.fn(claimHash => {
              return Promise.resolve(
                new Tuple(
                  // Attestations: claim-hash -> [(ctype-hash, account, delegation-id?, revoked)]
                  [Tuple.with([Text, Text, Text, Bool])],
                  [[ctypeHash, identityAlice, undefined, true]]
                )
              )
            }),
          },
        },
      },
    } as Blockchain

    const attestation = new Attestation(
      requestForAttestation,
      identityAlice,
      false
    )
    expect(await attestation.verifyStored(blockchain)).toBeTruthy()
    expect(await attestation.verify(blockchain)).toBeFalsy()
  })
})
