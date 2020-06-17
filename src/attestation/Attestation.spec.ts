import { H256 } from '@polkadot/types'
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
import IAttestation, { CompressedAttestation } from '../types/Attestation'

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
    requestForAttestation = (await RequestForAttestation.fromClaimAndIdentity(
      testClaim,
      identityBob
    )).message
  })

  it('stores attestation', async () => {
    blockchainApi.query.attestation.attestations.mockReturnValue(
      new Option(Tuple.with([H256, AccountId, Option.with(H256), Bool]), [
        testCType.hash,
        identityAlice.getAddress(),
        null,
        false,
      ])
    )

    const attestation: Attestation = Attestation.fromRequestAndPublicIdentity(
      requestForAttestation,
      identityAlice.getPublicIdentity()
    )
    expect(await Attestation.verify(attestation)).toBeTruthy()
  })

  it('verify attestations not on chain', async () => {
    blockchainApi.query.attestation.attestations.mockReturnValue(
      new Option(Tuple.with([H256, AccountId, Option.with(H256), Bool]))
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
        Tuple.with(
          // Attestations: claim-hash -> (ctype-hash, account, delegation-id?, revoked)
          [H256, AccountId, 'Option<H256>', Bool]
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

    expect(() =>
      AttestationUtils.errorCheck(noClaimHash)
    ).toThrowErrorMatchingInlineSnapshot(`"Claim Hash not provided"`)

    expect(() =>
      AttestationUtils.errorCheck(noCTypeHash)
    ).toThrowErrorMatchingInlineSnapshot(`"CType Hash not provided"`)

    expect(() =>
      AttestationUtils.errorCheck(malformedOwner)
    ).toThrowErrorMatchingInlineSnapshot(`"Owner not provided"`)

    expect(() =>
      AttestationUtils.errorCheck(noRevocationBit)
    ).toThrowErrorMatchingInlineSnapshot(`"revocation bit not provided"`)

    expect(() => AttestationUtils.errorCheck(everything)).not.toThrow()

    expect(() => AttestationUtils.errorCheck(malformedClaimHash))
      .toThrowErrorMatchingInlineSnapshot(`
"Provided Claim hash invalid or malformed 

    Hash: 0x21a3448ccf10f6568dcd9a08af689c220d842b893a40344d010e398ab74e557"
`)

    expect(() => AttestationUtils.errorCheck(malformedCTypeHash))
      .toThrowErrorMatchingInlineSnapshot(`
"Provided CType hash invalid or malformed 

    Hash: 0xa8c5bdb22aaea3fceb467d37169cbe49c71f226233037537e70a32a032304ff"
`)

    expect(() => AttestationUtils.errorCheck(malformedAddress))
      .toThrowErrorMatchingInlineSnapshot(`
"Provided Owner address invalid 

    Address: 5FA9nQDVg26DDEd8m1ZypXLBnvN7SFxYwV7ndqSYGiN9TTpu"
`)
  })
})
