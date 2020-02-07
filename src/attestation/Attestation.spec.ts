import { Text } from '@polkadot/types'
import Bool from '@polkadot/types/primitive/Bool'
import AccountId from '@polkadot/types/primitive/Generic/AccountId'
import { Tuple, Option } from '@polkadot/types/codec'
import Identity from '../identity/Identity'
import Attestation from './Attestation'
import AttestationUtils from './Attestation.utils'
import CType from '../ctype/CType'
import ICType from '../types/CType'
import RequestForAttestation from '../requestforattestation/RequestForAttestation'
import Claim from '../claim/Claim'
import { CompressedAttestation } from '../types/Attestation'
import CTypeUtils from '../ctype/CTypeUtils'

jest.mock('../blockchainApiConnection/BlockchainApiConnection')

describe('Attestation', () => {
  let identityAlice: Identity
  let identityBob: Identity
  let rawCType: ICType['schema']
  let fromRawCType: ICType
  let testCType: CType
  let testcontents: any
  let testClaim: Claim
  let requestForAttestation: RequestForAttestation
  const blockchainApi = require('../blockchainApiConnection/BlockchainApiConnection')
    .__mocked_api

  beforeAll(async () => {
    identityAlice = await Identity.buildFromURI('//Alice')
    identityBob = await Identity.buildFromURI('//Bob')

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
    requestForAttestation = (await RequestForAttestation.fromClaimAndIdentity(
      testClaim,
      identityBob
    )).message
  })

  it('stores attestation', async () => {
    blockchainApi.query.attestation.attestations.mockReturnValue(
      new Option(
        Tuple,
        new Tuple(
          [Text, AccountId, Text, Bool],
          [testCType.hash, identityAlice.getAddress(), undefined, false]
        )
      )
    )

    const attestation: Attestation = Attestation.fromRequestAndPublicIdentity(
      requestForAttestation,
      identityAlice.getPublicIdentity()
    )
    expect(await attestation.verify()).toBeTruthy()
  })

  it('verify attestations not on chain', async () => {
    blockchainApi.query.attestation.attestations.mockReturnValue(
      new Option(Tuple)
    )

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
    blockchainApi.query.attestation.attestations.mockReturnValue(
      new Option(
        Tuple,
        new Tuple(
          // Attestations: claim-hash -> (ctype-hash, account, delegation-id?, revoked)
          [Text, AccountId, Text, Bool],
          [testCType.hash, identityAlice.getAddress(), undefined, true]
        )
      )
    )

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
  it('should throw error on faulty constructor input', () => {
    const everything = {
      claimHash: '1',
      cTypeHash: '1',
      owner: '5GoNkf6WdbxCFnPdAnYYQyCjAKPJgLNxXwPjwTh6DGg6gN3E',
    } as IAttestation

    const noClaimHash = {
      claimHash: '',
      cTypeHash: '1',
      owner: '5FA9nQDVg267DEd8m1ZypXLBnvN7SFxYwV7ndqSYGiN9TTpu',
    } as IAttestation

    const noCTypeHash = {
      claimHash: '1',
      cTypeHash: '',
      owner: '5GoNkf6WdbxCFnPdAnYYQyCjAKPJgLNxXwPjwTh6DGg6gN3E',
    } as IAttestation

    const noOwner = {
      claimHash: '1',
      cTypeHash: '1',
      owner: '',
    } as IAttestation

    const nothing = {
      claimHash: '',
      cTypeHash: '',
      owner: '',
    } as IAttestation

    const everythingExcept = {
      claimHash: '',
      cTypeHash: '',
      owner: '',
      revoked: false,
      delegationId: null,
    } as IAttestation

    expect(() =>
      // eslint-disable-next-line dot-notation
      Attestation['constructorInputCheck'](noClaimHash)
    ).toThrow()

    expect(() =>
      // eslint-disable-next-line dot-notation
      Attestation['constructorInputCheck'](noCTypeHash)
    ).toThrow()

    expect(() =>
      // eslint-disable-next-line dot-notation
      Attestation['constructorInputCheck'](noOwner)
    ).toThrow()

    expect(() =>
      // eslint-disable-next-line dot-notation
      Attestation['constructorInputCheck'](nothing)
    ).toThrow()

    expect(() =>
      // eslint-disable-next-line dot-notation
      Attestation['constructorInputCheck'](everythingExcept)
    ).toThrow()

    expect(() =>
      // eslint-disable-next-line dot-notation
      Attestation['constructorInputCheck'](everything)
    ).not.toThrow()
  })
})
