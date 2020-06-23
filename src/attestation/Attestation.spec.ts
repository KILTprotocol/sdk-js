import { TypeRegistry } from '@polkadot/types'
import { Option, Tuple } from '@polkadot/types/codec'
import AccountId from '@polkadot/types/generic/AccountId'
import Bool from '@polkadot/types/primitive/Bool'
import Claim from '../claim/Claim'
import CType from '../ctype/CType'
import Identity from '../identity/Identity'
import RequestForAttestation from '../requestforattestation/RequestForAttestation'
import IAttestation, { CompressedAttestation } from '../types/Attestation'
import * as SDKErrors from '../errorhandling/SDKErrors'
import AttestationUtils from './Attestation.utils'
import Attestation from './Attestation'
import ICType from '../types/CType'

jest.mock('../blockchainApiConnection/BlockchainApiConnection')

describe('Attestation', () => {
  let identityAlice: Identity
  let identityBob: Identity
  let rawCTypeSchema: ICType['schema']
  let testCType: CType
  let testcontents: any
  let testClaim: Claim
  let requestForAttestation: RequestForAttestation
  const blockchainApi = require('../blockchainApiConnection/BlockchainApiConnection')
    .__mocked_api
  const registry = new TypeRegistry()

  beforeAll(async () => {
    identityAlice = await Identity.buildFromURI('//Alice')
    identityBob = await Identity.buildFromURI('//Bob')

    rawCTypeSchema = {
      $id: 'http://example.com/ctype-1',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
      properties: {
        name: { type: 'string' },
      },
      type: 'object',
    }

    testCType = CType.fromSchema(rawCTypeSchema, identityAlice.getAddress())

    testcontents = {}
    testClaim = Claim.fromCTypeAndClaimContents(
      testCType,
      testcontents,
      identityBob.getAddress()
    )
    requestForAttestation = (
      await RequestForAttestation.fromClaimAndIdentity(testClaim, identityBob)
    ).message
  })

  it('stores attestation', async () => {
    blockchainApi.query.attestation.attestations.mockReturnValue(
      new Option(
        registry,
        Tuple.with(['H256', AccountId, Option.with('H256'), Bool]),
        [testCType.hash, identityAlice.getAddress(), null, false]
      )
    )

    const attestation: Attestation = Attestation.fromRequestAndPublicIdentity(
      requestForAttestation,
      identityAlice.getPublicIdentity()
    )
    expect(await Attestation.verify(attestation)).toBeTruthy()
  })

  it('verify attestations not on chain', async () => {
    blockchainApi.query.attestation.attestations.mockReturnValue(
      new Option(
        registry,
        Tuple.with(['H256', AccountId, Option.with('H256'), Bool])
      )
    )

    const attestation: Attestation = Attestation.fromAttestation({
      claimHash: requestForAttestation.rootHash,
      cTypeHash: testCType.hash,
      delegationId: null,
      owner: identityAlice.getAddress(),
      revoked: false,
    })
    expect(await Attestation.verify(attestation)).toBeFalsy()
  })

  it('verify attestation revoked', async () => {
    blockchainApi.query.attestation.attestations.mockReturnValue(
      new Option(
        registry,
        Tuple.with(
          // Attestations: claim-hash -> (ctype-hash, account, delegation-id?, revoked)
          ['H256', AccountId, 'Option<H256>', Bool]
        ),
        [testCType.hash, identityAlice.getAddress(), null, true]
      )
    )

    const attestation: Attestation = Attestation.fromRequestAndPublicIdentity(
      requestForAttestation,
      identityAlice.getPublicIdentity()
    )
    expect(await Attestation.verify(attestation)).toBeFalsy()
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
  it('error check should throw errors on faulty Attestations', () => {
    const { cTypeHash, claimHash } = {
      cTypeHash:
        '0xa8c5bdb22aaea3fceb5467d37169cbe49c71f226233037537e70a32a032304ff',
      claimHash:
        '0x21a3448ccf10f6568d8cd9a08af689c220d842b893a40344d010e398ab74e557',
    }

    const everything = {
      claimHash,
      cTypeHash,
      owner: identityAlice.signKeyringPair.address,
      revoked: false,
      delegationId: null,
    }

    const noClaimHash = {
      claimHash: '',
      cTypeHash,
      owner: identityAlice.signKeyringPair.address,
      revoked: false,
      delegationId: null,
    } as IAttestation

    const noCTypeHash = {
      claimHash,
      cTypeHash: '',
      owner: identityAlice.signKeyringPair.address,
      revoked: false,
      delegationId: null,
    } as IAttestation

    const malformedOwner = {
      claimHash,
      cTypeHash,
      owner: '',
      revoked: false,
      delegationId: null,
    } as IAttestation

    const noRevocationBit = {
      claimHash,
      cTypeHash,
      owner: identityAlice.signKeyringPair.address,
      revoked: false,
      delegationId: null,
    } as IAttestation
    delete noRevocationBit.revoked
    const malformedClaimHash = {
      claimHash: claimHash.slice(0, 20) + claimHash.slice(21),
      cTypeHash,
      owner: identityAlice.signKeyringPair.address,
      revoked: false,
      delegationId: null,
    } as IAttestation

    const malformedCTypeHash = {
      claimHash,
      cTypeHash: cTypeHash.slice(0, 20) + cTypeHash.slice(21),
      owner: identityAlice.signKeyringPair.address,
      revoked: false,
      delegationId: null,
    } as IAttestation

    const malformedAddress = {
      claimHash,
      cTypeHash,
      owner: identityAlice.signKeyringPair.address.replace('7', 'D'),
      revoked: false,
      delegationId: null,
    } as IAttestation

    expect(() => AttestationUtils.errorCheck(noClaimHash)).toThrow(
      SDKErrors.ERROR_CLAIM_HASH_NOT_PROVIDED()
    )

    expect(() => AttestationUtils.errorCheck(noCTypeHash)).toThrowError(
      SDKErrors.ERROR_CTYPE_HASH_NOT_PROVIDED()
    )

    expect(() => AttestationUtils.errorCheck(malformedOwner)).toThrowError(
      SDKErrors.ERROR_OWNER_NOT_PROVIDED()
    )

    expect(() => AttestationUtils.errorCheck(noRevocationBit)).toThrowError(
      SDKErrors.ERROR_REVOCATION_BIT_MISSING()
    )

    expect(() => AttestationUtils.errorCheck(everything)).not.toThrow()

    expect(() => AttestationUtils.errorCheck(malformedClaimHash)).toThrowError(
      SDKErrors.ERROR_HASH_MALFORMED(malformedClaimHash.claimHash, 'Claim')
    )

    expect(() => AttestationUtils.errorCheck(malformedCTypeHash)).toThrowError(
      SDKErrors.ERROR_HASH_MALFORMED(malformedCTypeHash.cTypeHash, 'CType')
    )

    expect(() => AttestationUtils.errorCheck(malformedAddress)).toThrowError(
      SDKErrors.ERROR_ADDRESS_INVALID(malformedAddress.owner, 'owner')
    )
  })
})
