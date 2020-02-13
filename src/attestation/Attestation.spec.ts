import { Text } from '@polkadot/types'
import Bool from '@polkadot/types/primitive/Bool'
import AccountId from '@polkadot/types/primitive/Generic/AccountId'
import { Tuple, Option } from '@polkadot/types/codec'
import Identity from '../identity/Identity'
import Attestation from './Attestation'
import CType from '../ctype/CType'
import IAttestation from '../types/Attestation'
import ICType from '../types/CType'
import RequestForAttestation from '../requestforattestation/RequestForAttestation'
import Claim from '../claim/Claim'

jest.mock('../blockchainApiConnection/BlockchainApiConnection')

describe('Attestation', () => {
  const identityAlice = Identity.buildFromURI('//Alice')
  const identityBob = Identity.buildFromURI('//Bob')

  const Blockchain = require('../blockchain/Blockchain').default

  const rawCType: ICType['schema'] = {
    $id: 'http://example.com/ctype-1',
    $schema: 'http://kilt-protocol.org/draft-01/ctype#',
    properties: {
      name: { type: 'string' },
    },
    type: 'object',
  }

  const fromRawCType: ICType = {
    schema: rawCType,
    owner: identityAlice.address,
    hash: '',
  }

  const testCType: CType = CType.fromCType(fromRawCType)

  const testcontents = {}
  const testClaim = Claim.fromCTypeAndClaimContents(
    testCType,
    testcontents,
    identityBob.address
  )
  const requestForAttestation: RequestForAttestation = RequestForAttestation.fromClaimAndIdentity(
    testClaim,
    identityBob,
    [],
    null,
    true
  )

  it('stores attestation', async () => {
    Blockchain.api.query.attestation.attestations = jest.fn(() => {
      const tuple = new Option(
        Tuple,
        new Tuple(
          [Text, AccountId, Text, Bool],
          [testCType.hash, identityAlice.address, undefined, false]
        )
      )
      return Promise.resolve(tuple)
    })

    const attestation: Attestation = Attestation.fromRequestAndPublicIdentity(
      requestForAttestation,
      identityAlice
    )
    expect(await attestation.verify()).toBeTruthy()
  })

  it('verify attestations not on chain', async () => {
    Blockchain.api.query.attestation.attestations = jest.fn(() => {
      return Promise.resolve(new Option(Tuple))
    })

    const attestation: Attestation = Attestation.fromAttestation({
      claimHash: requestForAttestation.rootHash,
      cTypeHash: testCType.hash,
      owner: identityAlice.address,
      revoked: false,
    } as IAttestation)
    expect(await attestation.verify()).toBeFalsy()
  })

  it('verify attestation revoked', async () => {
    Blockchain.api.query.attestation.attestations = jest.fn(() => {
      return Promise.resolve(
        new Option(
          Tuple,
          new Tuple(
            // Attestations: claim-hash -> (ctype-hash, account, delegation-id?, revoked)
            [Text, AccountId, Text, Bool],
            [testCType.hash, identityAlice.address, undefined, true]
          )
        )
      )
    })

    const attestation: Attestation = Attestation.fromRequestAndPublicIdentity(
      requestForAttestation,
      identityAlice
    )
    expect(await attestation.verify()).toBeFalsy()
  })
})
