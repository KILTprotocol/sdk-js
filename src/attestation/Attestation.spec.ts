import { Text } from '@polkadot/types'
import Bool from '@polkadot/types/primitive/Bool'
import { Tuple } from '@polkadot/types/codec'
import Crypto from '../crypto'
import Identity from '../identity/Identity'
import Attestation from './Attestation'
import RequestForAttestation from '../requestforattestation/RequestForAttestation'
import IClaim from '../types/Claim'

jest.mock('../blockchainApiConnection/BlockchainApiConnection')

describe('Attestation', () => {
  const identityAlice = Identity.buildFromURI('//Alice')
  const identityBob = Identity.buildFromURI('//Bob')

  const Blockchain = require('../blockchain/Blockchain').default

  const cTypeHash = Crypto.hashStr('testCtype')
  const claim = {
    cType: cTypeHash,
    contents: {},
    owner: identityBob.address,
  } as IClaim
  const requestForAttestation: RequestForAttestation = new RequestForAttestation(
    claim,
    [],
    identityBob
  )

  it('stores attestation', async () => {
    Blockchain.api.query.attestation.attestations = jest.fn(() => {
      const tuple = new Tuple(
        [Text, Text, Text, Bool],
        [cTypeHash, identityAlice.address, undefined, false]
      )
      return Promise.resolve(tuple)
    })

    const attestation = new Attestation(requestForAttestation, identityAlice)
    expect(await attestation.verify()).toBeTruthy()
  })

  it('verify attestations not on chain', async () => {
    Blockchain.api.query.attestation.attestations = jest.fn(() => {
      return Promise.resolve(new Tuple([], []))
    })

    const attestation = new Attestation(
      requestForAttestation,
      identityAlice,
      false
    )
    expect(await attestation.verify()).toBeFalsy()
  })

  it('verify attestation revoked', async () => {
    Blockchain.api.query.attestation.attestations = jest.fn(() => {
      return Promise.resolve(
        new Tuple(
          // Attestations: claim-hash -> (ctype-hash, account, delegation-id?, revoked)
          [Text, Text, Text, Bool],
          [cTypeHash, identityAlice, undefined, true]
        )
      )
    })

    const attestation = new Attestation(
      requestForAttestation,
      identityAlice,
      true
    )
    expect(await attestation.verify()).toBeFalsy()
  })
})
