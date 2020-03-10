import { Text } from '@polkadot/types'
import Bool from '@polkadot/types/primitive/Bool'
import { Tuple } from '@polkadot/types/codec'
import Identity from '../identity/Identity'
import Attestation, {
  compressAttestation,
  decompressAttestation,
} from './Attestation'
import CType from '../ctype/CType'
import ICType from '../types/CType'
import RequestForAttestation from '../requestforattestation/RequestForAttestation'
import Claim from '../claim/Claim'
import { CompressedAttestation } from '../types/Attestation'

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
    null
  )

  it('stores attestation', async () => {
    Blockchain.api.query.attestation.attestations = jest.fn(() => {
      const tuple = new Tuple(
        [Text, Text, Text, Bool],
        [testCType.hash, identityAlice.address, undefined, false]
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
      return Promise.resolve(new Tuple([], []))
    })

    const attestation: Attestation = Attestation.fromAttestation({
      claimHash: requestForAttestation.rootHash,
      cTypeHash: testCType.hash,
      delegationId: null,
      owner: identityAlice.address,
      revoked: false,
    })
    expect(await attestation.verify()).toBeFalsy()
  })

  it('compresses and decompresses the attestation object', () => {
    const attestation = Attestation.fromRequestAndPublicIdentity(
      requestForAttestation,
      identityAlice
    )

    const compressedAttestation: CompressedAttestation = [
      attestation.claimHash,
      attestation.cTypeHash,
      attestation.owner,
      attestation.revoked,
      attestation.delegationId,
    ]

    expect(compressAttestation(attestation)).toEqual(compressedAttestation)

    expect(decompressAttestation(compressedAttestation)).toEqual(attestation)

    expect(Attestation.decompress(compressedAttestation)).toEqual(attestation)

    expect(attestation.compress()).toEqual(compressedAttestation)

    // @ts-ignore
    compressedAttestation[2] = 2

    expect(decompressAttestation(compressedAttestation)).not.toEqual(
      attestation
    )

    expect(Attestation.decompress(compressedAttestation)).not.toEqual(
      attestation
    )
    expect(attestation.compress()).not.toEqual(compressedAttestation)
  })

  it('verify attestation revoked', async () => {
    Blockchain.api.query.attestation.attestations = jest.fn(() => {
      return Promise.resolve(
        new Tuple(
          // Attestations: claim-hash -> (ctype-hash, account, delegation-id?, revoked)
          [Text, Text, Text, Bool],
          [testCType.hash, identityAlice, undefined, true]
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
