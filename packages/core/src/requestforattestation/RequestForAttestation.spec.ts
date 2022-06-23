/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group unit/requestforattestation
 */

/* eslint-disable dot-notation */

import type {
  IClaim,
  IClaimContents,
  ICType,
  CompressedRequestForAttestation,
  IRequestForAttestation,
  DidSignature,
  DidUri,
} from '@kiltprotocol/types'
import { Crypto, SDKErrors } from '@kiltprotocol/utils'
import * as CType from '../ctype'

import * as RequestForAttestation from '../requestforattestation/index.js'

const rawCType: ICType['schema'] = {
  $id: 'kilt:ctype:0x2',
  $schema: 'http://kilt-protocol.org/draft-01/ctype#',
  title: 'raw ctype',
  properties: {
    name: { type: 'string' },
  },
  type: 'object',
}

function buildRequestForAttestation(
  claimerDid: DidUri,
  contents: IClaimContents,
  legitimations: IRequestForAttestation[]
): IRequestForAttestation {
  // create claim

  const testCType: ICType = CType.fromSchema(rawCType)

  const claim: IClaim = {
    cTypeHash: testCType.hash,
    contents,
    owner: claimerDid,
  }
  // build request for attestation with legitimations
  const request = RequestForAttestation.fromClaim(claim, {
    legitimations,
  })
  return request
}

describe('RequestForAttestation', () => {
  const identityAlice =
    'did:kilt:4nv4phaKc4EcwENdRERuMF79ZSSB5xvnAk3zNySSbVbXhSwS'
  const identityBob =
    'did:kilt:4s5d7QHWSX9xx4DLafDtnTHK87n5e9G3UoKRrCDQ2gnrzYmZ'
  let legitimation: IRequestForAttestation

  beforeEach(async () => {
    legitimation = buildRequestForAttestation(identityAlice, {}, [])
  })

  it.todo('signing and verification')

  it('verify request for attestation', async () => {
    const request = buildRequestForAttestation(
      identityBob,
      {
        a: 'a',
        b: 'b',
        c: 'c',
      },
      [legitimation]
    )
    // check proof on complete data
    expect(RequestForAttestation.verifyDataIntegrity(request)).toBeTruthy()
    const testCType = CType.fromSchema(rawCType)
    expect(
      RequestForAttestation.verify(request, { ctype: testCType })
    ).toBeTruthy()

    // just deleting a field will result in a wrong proof
    delete request.claimNonceMap[Object.keys(request.claimNonceMap)[0]]
    expect(() =>
      RequestForAttestation.verifyDataIntegrity(request)
    ).toThrowError(SDKErrors.ERROR_NO_PROOF_FOR_STATEMENT)
  })

  it('throws on wrong hash in claim hash tree', async () => {
    const request = buildRequestForAttestation(
      identityBob,
      {
        a: 'a',
        b: 'b',
        c: 'c',
      },
      []
    )

    request.claimNonceMap[Object.keys(request.claimNonceMap)[0]] = '1234'
    expect(() => {
      RequestForAttestation.verifyDataIntegrity(request)
    }).toThrow()
  })

  it('compresses and decompresses the request for attestation object', async () => {
    const reqForAtt = buildRequestForAttestation(
      identityBob,
      {
        a: 'a',
        b: 'b',
        c: 'c',
      },
      [legitimation]
    )

    const compressedLegitimation: CompressedRequestForAttestation = [
      [
        legitimation.claim.cTypeHash,
        legitimation.claim.owner,
        legitimation.claim.contents,
      ],
      legitimation.claimNonceMap,
      legitimation.claimerSignature,
      legitimation.claimHashes,
      legitimation.rootHash,
      [],
      legitimation.delegationId,
    ]

    const compressedReqForAtt: CompressedRequestForAttestation = [
      [
        reqForAtt.claim.cTypeHash,
        reqForAtt.claim.owner,
        reqForAtt.claim.contents,
      ],
      reqForAtt.claimNonceMap,
      reqForAtt.claimerSignature,
      reqForAtt.claimHashes,
      reqForAtt.rootHash,
      [compressedLegitimation],
      reqForAtt.delegationId,
    ]

    expect(RequestForAttestation.compress(reqForAtt)).toEqual(
      compressedReqForAtt
    )

    expect(RequestForAttestation.decompress(compressedReqForAtt)).toEqual(
      reqForAtt
    )

    compressedReqForAtt.pop()
    // @ts-expect-error
    delete reqForAtt.claim.owner

    expect(() => {
      RequestForAttestation.compress(reqForAtt)
    }).toThrow()

    expect(() => {
      RequestForAttestation.decompress(compressedReqForAtt)
    }).toThrow()
  })

  it('hides claim properties', async () => {
    const request = buildRequestForAttestation(
      identityBob,
      { a: 'a', b: 'b' },
      []
    )
    RequestForAttestation.removeClaimProperties(request, ['a'])

    expect((request.claim.contents as any).a).toBeUndefined()
    expect(Object.keys(request.claimNonceMap)).toHaveLength(
      request.claimHashes.length - 1
    )
    expect((request.claim.contents as any).b).toBe('b')
    expect(RequestForAttestation.verifyDataIntegrity(request)).toBe(true)
    expect(RequestForAttestation.verifyRootHash(request)).toBe(true)
  })

  it('should throw error on faulty constructor input', async () => {
    const builtRequest = buildRequestForAttestation(
      identityBob,
      {
        a: 'a',
        b: 'b',
        c: 'c',
      },
      []
    )
    const builtRequestWithLegitimation = buildRequestForAttestation(
      identityBob,
      {
        a: 'a',
        b: 'b',
        c: 'c',
      },
      [legitimation]
    ) as IRequestForAttestation
    const builtRequestNoLegitimations = {
      ...buildRequestForAttestation(
        identityBob,
        {
          a: 'a',
          b: 'b',
          c: 'c',
        },
        []
      ),
    } as IRequestForAttestation
    // @ts-expect-error
    delete builtRequestNoLegitimations.legitimations

    const builtRequestMalformedRootHash = {
      ...buildRequestForAttestation(
        identityBob,
        {
          a: 'a',
          b: 'b',
          c: 'c',
        },
        []
      ),
    } as IRequestForAttestation
    // @ts-ignore
    builtRequestMalformedRootHash.rootHash = [
      builtRequestMalformedRootHash.rootHash.slice(0, 15),
      (
        (parseInt(builtRequestMalformedRootHash.rootHash.charAt(15), 16) + 1) %
        16
      ).toString(16),
      builtRequestMalformedRootHash.rootHash.slice(16),
    ].join('')
    const builtRequestIncompleteClaimHashTree = {
      ...buildRequestForAttestation(
        identityBob,
        {
          a: 'a',
          b: 'b',
          c: 'c',
        },
        []
      ),
    } as IRequestForAttestation
    const deletedKey = Object.keys(
      builtRequestIncompleteClaimHashTree.claimNonceMap
    )[0]
    delete builtRequestIncompleteClaimHashTree.claimNonceMap[deletedKey]
    builtRequestIncompleteClaimHashTree.rootHash =
      RequestForAttestation.calculateRootHash(
        builtRequestIncompleteClaimHashTree
      )
    const builtRequestMalformedSignature = {
      ...buildRequestForAttestation(
        identityBob,
        {
          a: 'a',
          b: 'b',
          c: 'c',
        },
        []
      ),
    } as IRequestForAttestation
    builtRequestMalformedSignature.claimerSignature = {
      signature: Crypto.hashStr('aaa'),
    } as DidSignature
    builtRequestMalformedSignature.rootHash =
      RequestForAttestation.calculateRootHash(builtRequestMalformedSignature)
    const builtRequestMalformedHashes = {
      ...buildRequestForAttestation(
        identityBob,
        {
          a: 'a',
          b: 'b',
          c: 'c',
        },
        []
      ),
    } as IRequestForAttestation
    Object.entries(builtRequestMalformedHashes.claimNonceMap).forEach(
      ([hash, nonce]) => {
        const scrambledHash = [
          hash.slice(0, 15),
          ((parseInt(hash.charAt(15), 16) + 1) % 16).toString(16),
          hash.slice(16),
        ].join('')
        builtRequestMalformedHashes.claimNonceMap[scrambledHash] = nonce
        delete builtRequestMalformedHashes.claimNonceMap[hash]
      }
    )
    builtRequestMalformedHashes.rootHash =
      RequestForAttestation.calculateRootHash(builtRequestMalformedHashes)
    expect(() =>
      RequestForAttestation.verifyDataStructure(builtRequestNoLegitimations)
    ).toThrowError(SDKErrors.ERROR_LEGITIMATIONS_NOT_PROVIDED)
    expect(() =>
      RequestForAttestation.verifyDataIntegrity(builtRequestMalformedRootHash)
    ).toThrowError(SDKErrors.ERROR_ROOT_HASH_UNVERIFIABLE)
    expect(() =>
      RequestForAttestation.verifyDataIntegrity(
        builtRequestIncompleteClaimHashTree
      )
    ).toThrowError(SDKErrors.ERROR_NO_PROOF_FOR_STATEMENT)
    expect(() =>
      RequestForAttestation.verifyDataStructure(builtRequestMalformedSignature)
    ).toThrowError(SDKErrors.ERROR_SIGNATURE_DATA_TYPE)
    expect(() =>
      RequestForAttestation.verifyDataIntegrity(builtRequestMalformedHashes)
    ).toThrowError(SDKErrors.ERROR_NO_PROOF_FOR_STATEMENT)
    expect(() =>
      RequestForAttestation.verifyDataStructure(builtRequest)
    ).not.toThrow()
    expect(() => {
      RequestForAttestation.verifyDataStructure(builtRequestWithLegitimation)
    }).not.toThrow()
    expect(() =>
      RequestForAttestation.verifyDataIntegrity(builtRequest)
    ).not.toThrow()
    expect(() => {
      RequestForAttestation.verifyDataIntegrity(builtRequestWithLegitimation)
    }).not.toThrow()
  })
  it('checks Object instantiation', async () => {
    const builtRequest = buildRequestForAttestation(
      identityBob,
      {
        a: 'a',
        b: 'b',
        c: 'c',
      },
      []
    )
    expect(
      RequestForAttestation.isIRequestForAttestation(builtRequest)
    ).toEqual(true)
  })

  it('should verify the Request for attestation claims structure against the ctype', async () => {
    const testCType = CType.fromSchema(rawCType)
    const builtRequest = buildRequestForAttestation(
      identityBob,
      {
        a: 'a',
        b: 'b',
        c: 'c',
      },
      []
    )
    expect(
      RequestForAttestation.verifyAgainstCType(builtRequest, testCType)
    ).toBeTruthy()
    builtRequest.claim.contents.name = 123
    expect(
      RequestForAttestation.verifyAgainstCType(builtRequest, testCType)
    ).toBeFalsy()
  })
})
