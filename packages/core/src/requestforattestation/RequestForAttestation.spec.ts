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

import { encodeAddress } from '@polkadot/util-crypto'
import type {
  IClaim,
  IClaimContents,
  ICType,
  CompressedCredential,
  ICredential,
  DidSignature,
  DidUri,
  IDidResolver,
  DidResolvedDetails,
  DidKey,
} from '@kiltprotocol/types'
import { VerificationKeyType } from '@kiltprotocol/types'
import { Crypto, UUID, SDKErrors, ss58Format } from '@kiltprotocol/utils'
import {
  DidDetails,
  FullDidDetails,
  LightDidDetails,
  SigningAlgorithms,
  Utils as DidUtils,
} from '@kiltprotocol/did'
import {
  createLocalDemoFullDidFromKeypair,
  KeyTool,
  makeSigningKeyTool,
} from '@kiltprotocol/testing'
import * as CType from '../ctype'
import * as Credential from '../requestforattestation/index.js'
import * as Claim from '../claim'

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

describe('create presentation', () => {
  let migratedClaimerLightDid: DidDetails
  let migratedClaimerFullDid: DidDetails
  let newKeyForMigratedClaimerDid: KeyTool
  let unmigratedClaimerLightDid: DidDetails
  let unmigratedClaimerKey: KeyTool
  let migratedThenDeletedClaimerLightDid: DidDetails
  let migratedThenDeletedKey: KeyTool
  let migratedThenDeletedClaimerFullDid: DidDetails
  let attester: DidDetails
  let ctype: ICType
  let reqForAtt: ICredential

  // Returns a full DID that has the same identifier of the first light DID, but the same key authentication key as the second one, if provided, or as the first one otherwise.
  function createMinimalFullDidFromLightDid(
    lightDidForId: LightDidDetails,
    newAuthenticationKey?: DidKey
  ): FullDidDetails {
    const uri = DidUtils.getKiltDidFromIdentifier(
      lightDidForId.identifier,
      'full'
    )
    const authKey = newAuthenticationKey || lightDidForId.authenticationKey

    return new FullDidDetails({
      identifier: lightDidForId.identifier,
      uri,
      keyRelationships: {
        authentication: new Set([authKey.id]),
      },
      keys: { [authKey.id]: authKey },
    })
  }

  const mockResolver: IDidResolver = (() => {
    const resolve = async (
      didUri: DidUri
    ): Promise<DidResolvedDetails | null> => {
      // For the mock resolver, we need to match the base URI, so we delete the fragment, if present.
      const { did } = DidUtils.parseDidUri(didUri)
      switch (did) {
        case migratedClaimerLightDid?.uri:
          return {
            details: migratedClaimerLightDid,
            metadata: {
              canonicalId: migratedClaimerFullDid.uri,
              deactivated: false,
            },
          }
        case migratedThenDeletedClaimerLightDid?.uri:
          return {
            metadata: {
              deactivated: true,
            },
          }
        case migratedThenDeletedClaimerFullDid?.uri:
          return {
            metadata: {
              deactivated: true,
            },
          }
        case unmigratedClaimerLightDid?.uri:
          return {
            details: unmigratedClaimerLightDid,
            metadata: { deactivated: false },
          }
        case migratedClaimerFullDid?.uri:
          return {
            details: migratedClaimerFullDid,
            metadata: { deactivated: false },
          }
        case attester?.uri:
          return { details: attester, metadata: { deactivated: false } }
        default:
          return null
      }
    }
    return {
      resolve,
      resolveDoc: resolve,
    } as IDidResolver
  })()

  beforeAll(async () => {
    const { keypair } = makeSigningKeyTool()
    attester = await createLocalDemoFullDidFromKeypair(keypair)

    unmigratedClaimerKey = makeSigningKeyTool()
    unmigratedClaimerLightDid = LightDidDetails.fromIdentifier(
      encodeAddress(unmigratedClaimerKey.keypair.publicKey, ss58Format),
      VerificationKeyType.Sr25519
    )
    const migratedClaimerKey = makeSigningKeyTool()
    migratedClaimerLightDid = LightDidDetails.fromIdentifier(
      encodeAddress(migratedClaimerKey.keypair.publicKey, ss58Format),
      VerificationKeyType.Sr25519
    )
    // Change also the authentication key of the full DID to properly verify signature verification,
    // so that it uses a completely different key and the credential is still correctly verified.
    newKeyForMigratedClaimerDid = makeSigningKeyTool()
    migratedClaimerFullDid = await createMinimalFullDidFromLightDid(
      migratedClaimerLightDid as LightDidDetails,
      {
        ...newKeyForMigratedClaimerDid.authenticationKey,
        id: 'new-auth',
      }
    )
    migratedThenDeletedKey = makeSigningKeyTool(SigningAlgorithms.Ed25519)
    migratedThenDeletedClaimerLightDid = LightDidDetails.fromIdentifier(
      encodeAddress(migratedThenDeletedKey.keypair.publicKey, ss58Format),
      VerificationKeyType.Ed25519
    )
    migratedThenDeletedClaimerFullDid = createMinimalFullDidFromLightDid(
      migratedThenDeletedClaimerLightDid as LightDidDetails
    )

    ctype = CType.fromSchema(rawCType, migratedClaimerFullDid.uri)

    // cannot be used since the variable needs to be established in the outer scope
    reqForAtt = Credential.fromClaim(
      Claim.fromCTypeAndClaimContents(
        ctype,
        {
          name: 'Peter',
          age: 12,
        },
        migratedClaimerFullDid.uri
      )
    )
  })

  it('should create presentation and exclude specific attributes using a full DID', async () => {
    const challenge = UUID.generate()
    const presentation = await Credential.createPresentation({
      credential: reqForAtt,
      selectedAttributes: ['name'],
      sign: newKeyForMigratedClaimerDid.sign,
      claimerDid: migratedClaimerFullDid,
      challenge,
    })
    await expect(
      Credential.verify(presentation, {
        resolver: mockResolver,
      })
    ).resolves.not.toThrow()
    expect(presentation.claimerSignature?.challenge).toEqual(challenge)
  })
  it('should create presentation and exclude specific attributes using a light DID', async () => {
    ctype = CType.fromSchema(rawCType, attester.uri)

    // cannot be used since the variable needs to be established in the outer scope
    reqForAtt = Credential.fromClaim(
      Claim.fromCTypeAndClaimContents(
        ctype,
        {
          name: 'Peter',
          age: 12,
        },
        unmigratedClaimerLightDid.uri
      )
    )

    const challenge = UUID.generate()
    const presentation = await Credential.createPresentation({
      credential: reqForAtt,
      selectedAttributes: ['name'],
      sign: unmigratedClaimerKey.sign,
      claimerDid: unmigratedClaimerLightDid,
      challenge,
    })
    await expect(
      Credential.verify(presentation, {
        resolver: mockResolver,
      })
    ).resolves.not.toThrow()
    expect(presentation.claimerSignature?.challenge).toEqual(challenge)
  })
  it('should create presentation and exclude specific attributes using a migrated DID', async () => {
    ctype = CType.fromSchema(rawCType, attester.uri)

    // cannot be used since the variable needs to be established in the outer scope
    reqForAtt = Credential.fromClaim(
      Claim.fromCTypeAndClaimContents(
        ctype,
        {
          name: 'Peter',
          age: 12,
        },
        // Use of light DID in the claim.
        migratedClaimerLightDid.uri
      )
    )

    const challenge = UUID.generate()
    const presentation = await Credential.createPresentation({
      credential: reqForAtt,
      selectedAttributes: ['name'],
      sign: newKeyForMigratedClaimerDid.sign,
      // Use of full DID to sign the presentation.
      claimerDid: migratedClaimerFullDid,
      challenge,
    })
    await expect(
      Credential.verify(presentation, {
        resolver: mockResolver,
      })
    ).resolves.not.toThrow()
    expect(presentation.claimerSignature?.challenge).toEqual(challenge)
  })

  it('should fail to create a valid presentation and exclude specific attributes using a light DID after it has been migrated', async () => {
    ctype = CType.fromSchema(rawCType, attester.uri)

    // cannot be used since the variable needs to be established in the outer scope
    reqForAtt = Credential.fromClaim(
      Claim.fromCTypeAndClaimContents(
        ctype,
        {
          name: 'Peter',
          age: 12,
        },
        // Use of light DID in the claim.
        migratedClaimerLightDid.uri
      )
    )

    const challenge = UUID.generate()
    const att = await Credential.createPresentation({
      credential: reqForAtt,
      selectedAttributes: ['name'],
      sign: newKeyForMigratedClaimerDid.sign,
      // Still using the light DID, which should fail since it has been migrated
      claimerDid: migratedClaimerLightDid,
      challenge,
    })
    await expect(
      Credential.verify(att, {
        resolver: mockResolver,
      })
    ).resolves.toBeFalsy()
  })

  it('should fail to create a valid presentation using a light DID after it has been migrated and deleted', async () => {
    ctype = CType.fromSchema(rawCType, attester.uri)

    // cannot be used since the variable needs to be established in the outer scope
    reqForAtt = Credential.fromClaim(
      Claim.fromCTypeAndClaimContents(
        ctype,
        {
          name: 'Peter',
          age: 12,
        },
        // Use of light DID in the claim.
        migratedThenDeletedClaimerLightDid.uri
      )
    )

    const challenge = UUID.generate()
    const presentation = await Credential.createPresentation({
      credential: reqForAtt,
      selectedAttributes: ['name'],
      sign: migratedThenDeletedKey.sign,
      // Still using the light DID, which should fail since it has been migrated and then deleted
      claimerDid: migratedThenDeletedClaimerLightDid,
      challenge,
    })
    await expect(
      Credential.verify(presentation, {
        resolver: mockResolver,
      })
    ).resolves.toBeFalsy()
  })

  it('should verify the credential claims structure against the ctype', () => {
    expect(Credential.verifyAgainstCType(reqForAtt, ctype)).toBeTruthy()
    reqForAtt.claim.contents.name = 123

    expect(Credential.verifyAgainstCType(reqForAtt, ctype)).toBeFalsy()
  })
})
