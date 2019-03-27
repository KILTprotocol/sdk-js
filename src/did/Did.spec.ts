import { Text, Tuple, Option } from '@polkadot/types'
import { Blockchain, Did } from '../'
import { IDid } from './Did'

describe('DID', () => {
  // @ts-ignore
  const blockchain = {
    api: {
      tx: {
        delegation: {
          createRoot: jest.fn((rootId, _ctypeHash) => {
            return Promise.resolve()
          }),
        },
      },
      query: {
        dID: {
          dIDs: jest.fn(address => {
            if (address === 'withDocumentStore') {
              const tuple = new Tuple(
                // (publicBoxKey, publicSigningKey, documentStore?)
                [Text, Text, Text],
                ['0x123', '0x987', '0x687474703a2f2f6d794449442e6b696c742e696f']
              )
              return Promise.resolve(tuple)
            } else {
              const tuple = new Tuple(
                // (publicBoxKey, publicSigningKey, documentStore?)
                [Text, Text, Option],
                ['0x123', '0x987', null]
              )
              return Promise.resolve(tuple)
            }
          }),
        },
      },
    },
  } as Blockchain

  it('query by address with documentStore', async () => {
    const did = await Did.queryByAddress(blockchain, 'withDocumentStore')
    expect(did).toEqual({
      identifier: 'did:kilt:withDocumentStore',
      publicBoxKey: '0x123',
      publicSigningKey: '0x987',
      documentStore: 'http://myDID.kilt.io',
    } as IDid)
  })

  it('query by address w/o documentStore', async () => {
    const did = await Did.queryByAddress(blockchain, 'w/oDocumentStore')
    expect(did).toEqual({
      identifier: 'did:kilt:w/oDocumentStore',
      publicBoxKey: '0x123',
      publicSigningKey: '0x987',
      documentStore: undefined,
    } as IDid)
  })

  it('query by identifier w/o documentStore', async () => {
    const did = await Did.queryByIdentifier(
      blockchain,
      'did:kilt:w/oDocumentStore'
    )
    expect(did).toEqual({
      identifier: 'did:kilt:w/oDocumentStore',
      publicBoxKey: '0x123',
      publicSigningKey: '0x987',
      documentStore: undefined,
    } as IDid)
  })

  it('query by identifier invalid identifier', async () => {
    try {
      await Did.queryByIdentifier(blockchain, 'invalidIdentifier')
      fail('should have detected an invalid DID')
    } catch (err) {
      expect(true).toBe(true)
    }
  })
})
