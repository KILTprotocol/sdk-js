/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group unit/credential
 */

/* eslint-disable dot-notation */

import type {
  IClaim,
  IClaimContents,
  ICType,
  CompressedCredential,
  ICredential,
  DidSignature,
  DidUri,
} from '@kiltprotocol/types'
import { Crypto, SDKErrors } from '@kiltprotocol/utils'
import * as CType from '../ctype'

import * as Credential from '../requestforattestation/index.js'

const rawCType: ICType['schema'] = {
  $id: 'kilt:ctype:0x2',
  $schema: 'http://kilt-protocol.org/draft-01/ctype#',
  title: 'raw ctype',
  properties: {
    name: { type: 'string' },
  },
  type: 'object',
}

function buildCredential(
  claimerDid: DidUri,
  contents: IClaimContents,
  legitimations: ICredential[]
): ICredential {
  // create claim

  const testCType: ICType = CType.fromSchema(rawCType)

  const claim: IClaim = {
    cTypeHash: testCType.hash,
    contents,
    owner: claimerDid,
  }
  // build credential with legitimations
  const credential = Credential.fromClaim(claim, {
    legitimations,
  })
  return credential
}

describe('Credential', () => {
  const identityAlice =
    'did:kilt:4nv4phaKc4EcwENdRERuMF79ZSSB5xvnAk3zNySSbVbXhSwS'
  const identityBob =
    'did:kilt:4s5d7QHWSX9xx4DLafDtnTHK87n5e9G3UoKRrCDQ2gnrzYmZ'
  let legitimation: ICredential

  beforeEach(async () => {
    legitimation = buildCredential(identityAlice, {}, [])
  })

  it.todo('signing and verification')

  it('verify credential', async () => {
    const credential = buildCredential(
      identityBob,
      {
        a: 'a',
        b: 'b',
        c: 'c',
      },
      [legitimation]
    )
    // check proof on complete data
    expect(Credential.verifyDataIntegrity(credential)).toBeTruthy()
    const testCType = CType.fromSchema(rawCType)
    expect(Credential.verify(credential, { ctype: testCType })).toBeTruthy()

    // just deleting a field will result in a wrong proof
    delete credential.claimNonceMap[Object.keys(credential.claimNonceMap)[0]]
    expect(() => Credential.verifyDataIntegrity(credential)).toThrowError(
      SDKErrors.ERROR_NO_PROOF_FOR_STATEMENT
    )
  })

  it('throws on wrong hash in claim hash tree', async () => {
    const credential = buildCredential(
      identityBob,
      {
        a: 'a',
        b: 'b',
        c: 'c',
      },
      []
    )

    credential.claimNonceMap[Object.keys(credential.claimNonceMap)[0]] = '1234'
    expect(() => {
      Credential.verifyDataIntegrity(credential)
    }).toThrow()
  })

  it('compresses and decompresses the credential object', async () => {
    const reqForAtt = buildCredential(
      identityBob,
      {
        a: 'a',
        b: 'b',
        c: 'c',
      },
      [legitimation]
    )

    const compressedLegitimation: CompressedCredential = [
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

    const compressedReqForAtt: CompressedCredential = [
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

    expect(Credential.compress(reqForAtt)).toEqual(compressedReqForAtt)

    expect(Credential.decompress(compressedReqForAtt)).toEqual(reqForAtt)

    compressedReqForAtt.pop()
    // @ts-expect-error
    delete reqForAtt.claim.owner

    expect(() => {
      Credential.compress(reqForAtt)
    }).toThrow()

    expect(() => {
      Credential.decompress(compressedReqForAtt)
    }).toThrow()
  })

  it('hides claim properties', async () => {
    const credential = buildCredential(identityBob, { a: 'a', b: 'b' }, [])
    Credential.removeClaimProperties(credential, ['a'])

    expect((credential.claim.contents as any).a).toBeUndefined()
    expect(Object.keys(credential.claimNonceMap)).toHaveLength(
      credential.claimHashes.length - 1
    )
    expect((credential.claim.contents as any).b).toBe('b')
    expect(Credential.verifyDataIntegrity(credential)).toBe(true)
    expect(Credential.verifyRootHash(credential)).toBe(true)
  })

  it('should throw error on faulty constructor input', async () => {
    const builtCredential = buildCredential(
      identityBob,
      {
        a: 'a',
        b: 'b',
        c: 'c',
      },
      []
    )
    const builtCredentialWithLegitimation = buildCredential(
      identityBob,
      {
        a: 'a',
        b: 'b',
        c: 'c',
      },
      [legitimation]
    ) as ICredential
    const builtCredentialNoLegitimations = {
      ...buildCredential(
        identityBob,
        {
          a: 'a',
          b: 'b',
          c: 'c',
        },
        []
      ),
    } as ICredential
    // @ts-expect-error
    delete builtCredentialNoLegitimations.legitimations

    const builtCredentialMalformedRootHash = {
      ...buildCredential(
        identityBob,
        {
          a: 'a',
          b: 'b',
          c: 'c',
        },
        []
      ),
    } as ICredential
    // @ts-ignore
    builtCredentialMalformedRootHash.rootHash = [
      builtCredentialMalformedRootHash.rootHash.slice(0, 15),
      (
        (parseInt(builtCredentialMalformedRootHash.rootHash.charAt(15), 16) +
          1) %
        16
      ).toString(16),
      builtCredentialMalformedRootHash.rootHash.slice(16),
    ].join('')
    const builtCredentialIncompleteClaimHashTree = {
      ...buildCredential(
        identityBob,
        {
          a: 'a',
          b: 'b',
          c: 'c',
        },
        []
      ),
    } as ICredential
    const deletedKey = Object.keys(
      builtCredentialIncompleteClaimHashTree.claimNonceMap
    )[0]
    delete builtCredentialIncompleteClaimHashTree.claimNonceMap[deletedKey]
    builtCredentialIncompleteClaimHashTree.rootHash =
      Credential.calculateRootHash(builtCredentialIncompleteClaimHashTree)
    const builtCredentialMalformedSignature = {
      ...buildCredential(
        identityBob,
        {
          a: 'a',
          b: 'b',
          c: 'c',
        },
        []
      ),
    } as ICredential
    builtCredentialMalformedSignature.claimerSignature = {
      signature: Crypto.hashStr('aaa'),
    } as DidSignature
    builtCredentialMalformedSignature.rootHash = Credential.calculateRootHash(
      builtCredentialMalformedSignature
    )
    const builtCredentialMalformedHashes = {
      ...buildCredential(
        identityBob,
        {
          a: 'a',
          b: 'b',
          c: 'c',
        },
        []
      ),
    } as ICredential
    Object.entries(builtCredentialMalformedHashes.claimNonceMap).forEach(
      ([hash, nonce]) => {
        const scrambledHash = [
          hash.slice(0, 15),
          ((parseInt(hash.charAt(15), 16) + 1) % 16).toString(16),
          hash.slice(16),
        ].join('')
        builtCredentialMalformedHashes.claimNonceMap[scrambledHash] = nonce
        delete builtCredentialMalformedHashes.claimNonceMap[hash]
      }
    )
    builtCredentialMalformedHashes.rootHash = Credential.calculateRootHash(
      builtCredentialMalformedHashes
    )
    expect(() =>
      Credential.verifyDataStructure(builtCredentialNoLegitimations)
    ).toThrowError(SDKErrors.ERROR_LEGITIMATIONS_NOT_PROVIDED)
    expect(() =>
      Credential.verifyDataIntegrity(builtCredentialMalformedRootHash)
    ).toThrowError(SDKErrors.ERROR_ROOT_HASH_UNVERIFIABLE)
    expect(() =>
      Credential.verifyDataIntegrity(builtCredentialIncompleteClaimHashTree)
    ).toThrowError(SDKErrors.ERROR_NO_PROOF_FOR_STATEMENT)
    expect(() =>
      Credential.verifyDataStructure(builtCredentialMalformedSignature)
    ).toThrowError(SDKErrors.ERROR_SIGNATURE_DATA_TYPE)
    expect(() =>
      Credential.verifyDataIntegrity(builtCredentialMalformedHashes)
    ).toThrowError(SDKErrors.ERROR_NO_PROOF_FOR_STATEMENT)
    expect(() => Credential.verifyDataStructure(builtCredential)).not.toThrow()
    expect(() => {
      Credential.verifyDataStructure(builtCredentialWithLegitimation)
    }).not.toThrow()
    expect(() => Credential.verifyDataIntegrity(builtCredential)).not.toThrow()
    expect(() => {
      Credential.verifyDataIntegrity(builtCredentialWithLegitimation)
    }).not.toThrow()
  })
  it('checks Object instantiation', async () => {
    const builtCredential = buildCredential(
      identityBob,
      {
        a: 'a',
        b: 'b',
        c: 'c',
      },
      []
    )
    expect(Credential.isICredential(builtCredential)).toEqual(true)
  })

  it('should verify the credential claims structure against the ctype', async () => {
    const testCType = CType.fromSchema(rawCType)
    const builtCredential = buildCredential(
      identityBob,
      {
        a: 'a',
        b: 'b',
        c: 'c',
      },
      []
    )
    expect(
      Credential.verifyAgainstCType(builtCredential, testCType)
    ).toBeTruthy()
    builtCredential.claim.contents.name = 123
    expect(
      Credential.verifyAgainstCType(builtCredential, testCType)
    ).toBeFalsy()
  })
})
