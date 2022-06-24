/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group unit/attestation
 */

import { encodeAddress } from '@polkadot/util-crypto'

import type {
  CompressedCredential,
  DidKey,
  DidResolvedDetails,
  DidUri,
  IAttestation,
  IClaim,
  ICType,
  IDidDetails,
  IDidResolver,
  ICredential,
  SignCallback,
} from '@kiltprotocol/types'
import { VerificationKeyType } from '@kiltprotocol/types'
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
import { UUID } from '@kiltprotocol/utils'
import * as Attestation from '../attestation'
import * as Claim from '../claim'
import * as CType from '../ctype'
import * as Credential from '../requestforattestation'

jest.mock('../attestation/Attestation.chain')

async function buildCredential(
  claimer: DidDetails,
  attesterDid: IDidDetails['uri'],
  contents: IClaim['contents'],
  legitimations: ICredential[],
  sign: SignCallback
): Promise<[ICredential, IAttestation]> {
  // create claim

  const rawCType: ICType['schema'] = {
    $id: 'kilt:ctype:0x1',
    $schema: 'http://kilt-protocol.org/draft-01/ctype#',
    title: 'Credential',
    properties: {
      name: { type: 'string' },
    },
    type: 'object',
  }

  const testCType = CType.fromSchema(rawCType)

  const claim = Claim.fromCTypeAndClaimContents(
    testCType,
    contents,
    claimer.uri
  )
  // build credential with legitimations
  const credential = Credential.fromClaim(claim, {
    legitimations,
  })
  await Credential.signWithDidKey(
    credential,
    sign,
    claimer,
    claimer.authenticationKey.id
  )
  // build attestation
  const testAttestation = Attestation.fromCredentialAndDid(
    credential,
    attesterDid
  )
  return [credential, testAttestation]
}

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

describe('Credential', () => {
  let keyAlice: KeyTool
  let keyCharlie: KeyTool
  let identityAlice: DidDetails
  let identityBob: DidDetails
  let identityCharlie: DidDetails
  let legitimation: ICredential
  let compressedLegitimation: CompressedCredential
  let identityDave: DidDetails
  let migratedAndDeletedLightDid: DidDetails
  let migratedAndDeletedFullDid: DidDetails

  const mockResolver: IDidResolver = (() => {
    const resolve = async (
      didUri: DidUri
    ): Promise<DidResolvedDetails | null> => {
      // For the mock resolver, we need to match the base URI, so we delete the fragment, if present.
      const { did } = DidUtils.parseDidUri(didUri)
      switch (did) {
        case identityAlice?.uri:
          return { details: identityAlice, metadata: { deactivated: false } }
        case identityBob?.uri:
          return { details: identityBob, metadata: { deactivated: false } }
        case identityCharlie?.uri:
          return { details: identityCharlie, metadata: { deactivated: false } }
        case identityDave?.uri:
          return { details: identityDave, metadata: { deactivated: false } }
        case migratedAndDeletedLightDid?.uri:
          return {
            metadata: {
              deactivated: true,
            },
          }
        case migratedAndDeletedFullDid?.uri:
          return {
            metadata: {
              deactivated: true,
            },
          }
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
    keyAlice = makeSigningKeyTool()
    identityAlice = await createLocalDemoFullDidFromKeypair(keyAlice.keypair)

    const keyBob = makeSigningKeyTool()
    identityBob = await createLocalDemoFullDidFromKeypair(keyBob.keypair)

    keyCharlie = makeSigningKeyTool()
    identityCharlie = await createLocalDemoFullDidFromKeypair(
      keyCharlie.keypair
    )
    ;[legitimation] = await buildCredential(
      identityAlice,
      identityBob.uri,
      {},
      [],
      keyAlice.sign
    )
    compressedLegitimation = [
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
  })

  it('verify credentials signed by a full DID', async () => {
    const [credential] = await buildCredential(
      identityCharlie,
      identityAlice.uri,
      {
        a: 'a',
        b: 'b',
        c: 'c',
      },
      [legitimation],
      keyCharlie.sign
    )

    // check proof on complete data
    expect(Credential.verifyDataIntegrity(credential)).toBeTruthy()
    await expect(
      Credential.verify(credential, {
        resolver: mockResolver,
      })
    ).resolves.not.toThrow()
  })
  it('verify credentials signed by a light DID', async () => {
    const { keypair, sign } = makeSigningKeyTool(SigningAlgorithms.Ed25519)
    identityDave = await LightDidDetails.fromIdentifier(
      encodeAddress(keypair.publicKey, 38),
      VerificationKeyType.Ed25519
    )

    const [credential] = await buildCredential(
      identityDave,
      identityAlice.uri,
      {
        a: 'a',
        b: 'b',
        c: 'c',
      },
      [legitimation],
      sign
    )

    // check proof on complete data
    expect(Credential.verifyDataIntegrity(credential)).toBeTruthy()
    await expect(
      Credential.verify(credential, {
        resolver: mockResolver,
      })
    ).resolves.not.toThrow()
  })

  it('fail to verify credentials signed by a light DID after it has been migrated and deleted', async () => {
    const migratedAndDeleted = makeSigningKeyTool(SigningAlgorithms.Ed25519)
    migratedAndDeletedLightDid = LightDidDetails.fromIdentifier(
      encodeAddress(migratedAndDeleted.keypair.publicKey, 38),
      VerificationKeyType.Ed25519
    )
    migratedAndDeletedFullDid = new FullDidDetails({
      identifier: migratedAndDeletedLightDid.identifier,
      uri: DidUtils.getKiltDidFromIdentifier(
        migratedAndDeletedLightDid.identifier,
        'full'
      ),
      keyRelationships: {
        authentication: new Set([
          migratedAndDeletedLightDid.authenticationKey.id,
        ]),
      },
      keys: {
        [migratedAndDeletedLightDid.authenticationKey.id]:
          migratedAndDeletedLightDid.authenticationKey,
      },
    })

    const [credential] = await buildCredential(
      migratedAndDeletedLightDid,
      identityAlice.uri,
      {
        a: 'a',
        b: 'b',
        c: 'c',
      },
      [legitimation],
      migratedAndDeleted.sign
    )

    // check proof on complete data
    expect(Credential.verifyDataIntegrity(credential)).toBeTruthy()
    await expect(
      Credential.verify(credential, {
        resolver: mockResolver,
      })
    ).resolves.toBeFalsy()
  })

  it('compresses and decompresses the credentials object', () => {
    expect(Credential.compress(legitimation)).toEqual(compressedLegitimation)
    expect(Credential.decompress(compressedLegitimation)).toEqual(legitimation)
  })

  it('Negative test for compresses and decompresses the credentials object', () => {
    compressedLegitimation.pop()
    // @ts-expect-error
    delete legitimation.claimHashes

    expect(() => {
      Credential.compress(legitimation)
    }).toThrow()

    expect(() => {
      Credential.decompress(compressedLegitimation)
    }).toThrow()
  })
  it('Typeguard should return true on complete Credentials', async () => {
    const [credential] = await buildCredential(
      identityAlice,
      identityBob.uri,
      {},
      [],
      keyAlice.sign
    )
    expect(Credential.isICredential(credential)).toBeTruthy()
    // @ts-expect-error
    delete credential.claimHashes

    expect(Credential.isICredential(credential)).toBeFalsy()
  })
  it('Should throw error when attestation is from different credential', async () => {
    const [credential, attestation] = await buildCredential(
      identityAlice,
      identityBob.uri,
      {},
      [],
      keyAlice.sign
    )
    expect(
      Attestation.verifyAgainstCredential(attestation, credential)
    ).toBeTruthy()
    const { cTypeHash } = attestation
    // @ts-ignore
    attestation.cTypeHash = [
      cTypeHash.slice(0, 15),
      ((parseInt(cTypeHash.charAt(15), 16) + 1) % 16).toString(16),
      cTypeHash.slice(16),
    ].join('')
    expect(
      Attestation.verifyAgainstCredential(attestation, credential)
    ).toBeFalsy()
  })
  it('returns Claim Hash of the attestation', async () => {
    const [credential, attestation] = await buildCredential(
      identityAlice,
      identityBob.uri,
      {},
      [],
      keyAlice.sign
    )
    expect(Credential.getHash(credential)).toEqual(attestation.claimHash)
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
      encodeAddress(unmigratedClaimerKey.keypair.publicKey, 38),
      VerificationKeyType.Sr25519
    )
    const migratedClaimerKey = makeSigningKeyTool()
    migratedClaimerLightDid = LightDidDetails.fromIdentifier(
      encodeAddress(migratedClaimerKey.keypair.publicKey, 38),
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
      encodeAddress(migratedThenDeletedKey.keypair.publicKey, 38),
      VerificationKeyType.Ed25519
    )
    migratedThenDeletedClaimerFullDid = createMinimalFullDidFromLightDid(
      migratedThenDeletedClaimerLightDid as LightDidDetails
    )

    const rawCType: ICType['schema'] = {
      $id: 'kilt:ctype:0x1',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
      title: 'credential',
      properties: {
        name: { type: 'string' },
      },
      type: 'object',
    }

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
    const rawCType: ICType['schema'] = {
      $id: 'kilt:ctype:0x1',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
      title: 'credential',
      properties: {
        name: { type: 'string' },
      },
      type: 'object',
    }
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
    const rawCType: ICType['schema'] = {
      $id: 'kilt:ctype:0x1',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
      title: 'credential',
      properties: {
        name: { type: 'string' },
      },
      type: 'object',
    }
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
    const rawCType: ICType['schema'] = {
      $id: 'kilt:ctype:0x1',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
      title: 'credential',
      properties: {
        name: { type: 'string' },
      },
      type: 'object',
    }
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
    const rawCType: ICType['schema'] = {
      $id: 'kilt:ctype:0x1',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
      title: 'credential',
      properties: {
        name: { type: 'string' },
      },
      type: 'object',
    }
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
