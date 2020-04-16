import { Text, TypeRegistry } from '@polkadot/types'
import Bool from '@polkadot/types/primitive/Bool'
import AccountId from '@polkadot/types/generic/AccountId'
import { Tuple, Option } from '@polkadot/types/codec'
import Identity from '../identity/Identity'
import Attestation from './Attestation'
import AttestationUtils from './Attestation.utils'
import CType from '../ctype/CType'
import ICType from '../types/CType'
import RequestForAttestation from '../requestforattestation/RequestForAttestation'
import Claim from '../claim/Claim'
import { CompressedAttestation } from '../types/Attestation'

jest.mock('../blockchainApiConnection/BlockchainApiConnection')

describe('Attestation', () => {
  const registry = new TypeRegistry()
  let identityAlice: Identity
  let identityBob: Identity
  let Blockchain: any
  let rawCType: ICType['schema']
  let fromRawCType: ICType
  let testCType: CType
  let testcontents: any
  let testClaim: Claim
  let requestForAttestation: RequestForAttestation

  beforeAll(async () => {
    identityAlice = await Identity.buildFromURI('//Alice')
    identityBob = await Identity.buildFromURI('//Bob')

    Blockchain = require('../blockchain/Blockchain').default

    rawCType = {
      $id: 'http://example.com/ctype-1',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
      properties: {
        name: { type: 'string' },
      },
      type: 'object',
    }

    fromRawCType = {
      schema: rawCType,
      owner: identityAlice.getAddress(),
      hash: '',
    }

    testCType = CType.fromCType(fromRawCType)

    testcontents = {}
    testClaim = Claim.fromCTypeAndClaimContents(
      testCType,
      testcontents,
      identityBob.getAddress()
    )
    ;[requestForAttestation] = await RequestForAttestation.fromClaimAndIdentity(
      {
        claim: testClaim,
        identity: identityBob,
      }
    )
  })

  it('stores attestation', async () => {
    Blockchain.api.query.attestation.attestations = jest.fn(() => {
      const tuple = new Option(
        registry,
        Tuple,
        new Tuple(
          registry,
          [Text, AccountId, Text, Bool],
          [testCType.hash, identityAlice.getAddress(), undefined, false]
        )
      )
      return Promise.resolve(tuple)
    })

    const attestation: Attestation = Attestation.fromRequestAndPublicIdentity(
      requestForAttestation,
      identityAlice.getPublicIdentity()
    )
    expect(await attestation.verify()).toBeTruthy()
  })

  it('verify attestations not on chain', async () => {
    Blockchain.api.query.attestation.attestations = jest.fn(() => {
      return Promise.resolve(new Option(registry, Tuple))
    })

    const attestation: Attestation = Attestation.fromAttestation({
      claimHash: requestForAttestation.rootHash,
      cTypeHash: testCType.hash,
      delegationId: null,
      owner: identityAlice.getAddress(),
      revoked: false,
    })
    expect(await attestation.verify()).toBeFalsy()
  })

  it('verify attestation revoked', async () => {
    Blockchain.api.query.attestation.attestations = jest.fn(() => {
      return Promise.resolve(
        new Option(
          registry,
          Tuple,
          new Tuple(
            registry,
            // Attestations: claim-hash -> (ctype-hash, account, delegation-id?, revoked)
            [Text, AccountId, Text, Bool],
            [testCType.hash, identityAlice.getAddress(), undefined, true]
          )
        )
      )
    })

    const attestation: Attestation = Attestation.fromRequestAndPublicIdentity(
      requestForAttestation,
      identityAlice.getPublicIdentity()
    )
    expect(await attestation.verify()).toBeFalsy()
  })

  it('compresses and decompresses the attestation object', () => {
    const attestation = Attestation.fromRequestAndPublicIdentity(
      requestForAttestation,
      identityAlice.getPublicIdentity()
    )

    const compressedAttestation: CompressedAttestation = [
      attestation.claimHash,
      attestation.cTypeHash,
      attestation.owner,
      attestation.revoked,
      attestation.delegationId,
    ]

    expect(AttestationUtils.compress(attestation)).toEqual(
      compressedAttestation
    )

    expect(AttestationUtils.decompress(compressedAttestation)).toEqual(
      attestation
    )

    expect(Attestation.decompress(compressedAttestation)).toEqual(attestation)

    expect(attestation.compress()).toEqual(compressedAttestation)
  })

  it('Negative test for compresses and decompresses the attestation object', () => {
    const attestation = Attestation.fromRequestAndPublicIdentity(
      requestForAttestation,
      identityAlice.getPublicIdentity()
    )

    const compressedAttestation: CompressedAttestation = [
      attestation.claimHash,
      attestation.cTypeHash,
      attestation.owner,
      attestation.revoked,
      attestation.delegationId,
    ]
    compressedAttestation.pop()
    delete attestation.claimHash

    expect(() => {
      AttestationUtils.decompress(compressedAttestation)
    }).toThrow()

    expect(() => {
      Attestation.decompress(compressedAttestation)
    }).toThrow()
    expect(() => {
      attestation.compress()
    }).toThrow()
    expect(() => {
      AttestationUtils.compress(attestation)
    }).toThrow()
  })
})
