/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group unit/attestation
 */

/* eslint-disable @typescript-eslint/ban-ts-comment */

import { encodeAddress } from '@polkadot/util-crypto'

import type {
  IClaim,
  CompressedCredential,
  ICType,
  IDidDetails,
  IDidResolver,
  DidResolvedDetails,
  DidKey,
  IRequestForAttestation,
  IAttestation,
  ICredential,
} from '@kiltprotocol/types'
import {
  DemoKeystore,
  DemoKeystoreUtils,
  LightDidDetails,
  SigningAlgorithms,
  DidDetails,
  LightDidSupportedSigningKeyTypes,
  FullDidDetails,
  DidUtils,
} from '@kiltprotocol/did'
import { UUID, SDKErrors } from '@kiltprotocol/utils'
import { Attestation } from '../attestation'
import * as Claim from '../claim'
import * as CType from '../ctype'
import * as RequestForAttestation from '../requestforattestation/index'
import * as Credential from './Credential'
import * as CredentialUtils from './Credential.utils'
import { query } from '../attestation/Attestation.chain'

jest.mock('../attestation/Attestation.chain')

async function buildCredential(
  claimer: DidDetails,
  attesterDid: IDidDetails['did'],
  contents: IClaim['contents'],
  legitimations: ICredential[],
  signer: DemoKeystore
): Promise<ICredential> {
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
    claimer.did
  )
  // build request for attestation with legitimations
  const requestForAttestation = RequestForAttestation.fromClaim(claim, {
    legitimations,
  })
  await RequestForAttestation.signWithDidKey(
    requestForAttestation,
    signer,
    claimer,
    claimer.authenticationKey.id
  )
  // build attestation
  const testAttestation = Attestation.fromRequestAndDid(
    requestForAttestation,
    attesterDid
  )
  // combine to credential
  const credential = Credential.fromRequestAndAttestation(
    requestForAttestation,
    testAttestation
  )
  return credential
}

// Returns a full DID that has the same identifier of the first light DID, but the same key authentication key as the second one, if provided, or as the first one otherwise.
function createMinimalFullDidFromLightDid(
  lightDidForId: LightDidDetails,
  newAuthenticationKey?: DidKey
): FullDidDetails {
  const did = DidUtils.getKiltDidFromIdentifier(
    lightDidForId.identifier,
    'full'
  )
  const authKey = newAuthenticationKey || lightDidForId.authenticationKey

  return new FullDidDetails({
    identifier: lightDidForId.identifier,
    did,
    keyRelationships: {
      authentication: new Set([authKey.id]),
    },
    keys: { [authKey.id]: authKey },
  })
}

describe('RequestForAttestation', () => {
  let keystore: DemoKeystore
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
      didUri: string
    ): Promise<DidResolvedDetails | null> => {
      // For the mock resolver, we need to match the base URI, so we delete the fragment, if present.
      const { did } = DidUtils.parseDidUri(didUri)
      switch (did) {
        case identityAlice?.did:
          return { details: identityAlice, metadata: { deactivated: false } }
        case identityBob?.did:
          return { details: identityBob, metadata: { deactivated: false } }
        case identityCharlie?.did:
          return { details: identityCharlie, metadata: { deactivated: false } }
        case identityDave?.did:
          return { details: identityDave, metadata: { deactivated: false } }
        case migratedAndDeletedLightDid?.did:
          return {
            metadata: {
              deactivated: true,
            },
          }
        case migratedAndDeletedFullDid?.did:
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
    keystore = new DemoKeystore()

    identityAlice = await DemoKeystoreUtils.createLocalDemoFullDidFromSeed(
      keystore,
      '//Alice'
    )
    identityBob = await DemoKeystoreUtils.createLocalDemoFullDidFromSeed(
      keystore,
      '//Bob'
    )
    identityCharlie = await DemoKeystoreUtils.createLocalDemoFullDidFromSeed(
      keystore,
      '//Charlie'
    )

    legitimation = await buildCredential(
      identityAlice,
      identityBob.did,
      {},
      [],
      keystore
    )
    compressedLegitimation = [
      [
        [
          legitimation.request.claim.cTypeHash,
          legitimation.request.claim.owner,
          legitimation.request.claim.contents,
        ],
        legitimation.request.claimNonceMap,
        legitimation.request.claimerSignature,
        legitimation.request.claimHashes,
        legitimation.request.rootHash,
        [],
        legitimation.request.delegationId,
      ],
      [
        legitimation.attestation.claimHash,
        legitimation.attestation.cTypeHash,
        legitimation.attestation.owner,
        legitimation.attestation.revoked,
        legitimation.attestation.delegationId,
      ],
    ]
  })

  it('verify credentials signed by a full DID', async () => {
    const credential = await buildCredential(
      identityCharlie,
      identityAlice.did,
      {
        a: 'a',
        b: 'b',
        c: 'c',
      },
      [legitimation],
      keystore
    )

    ;(query as jest.Mock).mockResolvedValue(credential.attestation)

    // check proof on complete data
    expect(Credential.verifyData(credential)).toBeTruthy()
    await expect(
      Credential.verify(credential, {
        resolver: mockResolver,
      })
    ).resolves.toBe(true)
  })
  it('verify credentials signed by a light DID', async () => {
    const daveKey = await keystore.generateKeypair({
      alg: SigningAlgorithms.Ed25519,
      seed: '//Dave',
    })
    identityDave = await LightDidDetails.fromIdentifier(
      encodeAddress(daveKey.publicKey, 38),
      LightDidSupportedSigningKeyTypes.ed25519
    )

    const credential = await buildCredential(
      identityDave,
      identityAlice.did,
      {
        a: 'a',
        b: 'b',
        c: 'c',
      },
      [legitimation],
      keystore
    )

    ;(query as jest.Mock).mockResolvedValue(credential.attestation)

    // check proof on complete data
    expect(Credential.verifyData(credential)).toBeTruthy()
    await expect(
      Credential.verify(credential, {
        resolver: mockResolver,
      })
    ).resolves.toBe(true)
  })

  it('fail to verify credentials signed by a light DID after it has been migrated and deleted', async () => {
    const migratedAndDeletedKey = await keystore.generateKeypair({
      alg: SigningAlgorithms.Ed25519,
      seed: '//MigratedLight',
    })
    migratedAndDeletedLightDid = LightDidDetails.fromIdentifier(
      encodeAddress(migratedAndDeletedKey.publicKey, 38),
      LightDidSupportedSigningKeyTypes.ed25519
    )
    migratedAndDeletedFullDid = new FullDidDetails({
      identifier: migratedAndDeletedLightDid.identifier,
      did: DidUtils.getKiltDidFromIdentifier(
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

    const credential = await buildCredential(
      migratedAndDeletedLightDid,
      identityAlice.did,
      {
        a: 'a',
        b: 'b',
        c: 'c',
      },
      [legitimation],
      keystore
    )

    ;(query as jest.Mock).mockResolvedValue(credential.attestation)

    // check proof on complete data
    expect(Credential.verifyData(credential)).toBeTruthy()
    await expect(
      Credential.verify(credential, {
        resolver: mockResolver,
      })
    ).resolves.toBeFalsy()
  })

  it('compresses and decompresses the credentials object', () => {
    expect(CredentialUtils.compress(legitimation)).toEqual(
      compressedLegitimation
    )

    expect(CredentialUtils.decompress(compressedLegitimation)).toEqual(
      legitimation
    )

    expect(Credential.compress(legitimation)).toEqual(
      CredentialUtils.compress(legitimation)
    )

    expect(Credential.decompress(compressedLegitimation)).toEqual(legitimation)
  })

  it('Negative test for compresses and decompresses the credentials object', () => {
    compressedLegitimation.pop()
    // @ts-expect-error
    delete legitimation.attestation

    expect(() => {
      CredentialUtils.compress(legitimation)
    }).toThrow()

    expect(() => {
      CredentialUtils.decompress(compressedLegitimation)
    }).toThrow()
    expect(() => {
      Credential.decompress(compressedLegitimation)
    }).toThrow()
    expect(() => {
      Credential.compress(legitimation)
    }).toThrow()
  })
  it('Typeguard should return true on complete Credentials', async () => {
    const testAttestation = await buildCredential(
      identityAlice,
      identityBob.did,
      {},
      [],
      keystore
    )
    expect(Credential.isICredential(testAttestation)).toBeTruthy()
    // @ts-expect-error
    delete testAttestation.attestation.claimHash

    expect(Credential.isICredential(testAttestation)).toBeFalsy()
  })
  it('Should throw error when attestation is from different request', async () => {
    const testAttestation = await buildCredential(
      identityAlice,
      identityBob.did,
      {},
      [],
      keystore
    )
    expect(Credential.isICredential(testAttestation)).toBeTruthy()
    const { cTypeHash } = testAttestation.attestation
    testAttestation.attestation.cTypeHash = [
      cTypeHash.slice(0, 15),
      ((parseInt(cTypeHash.charAt(15), 16) + 1) % 16).toString(16),
      cTypeHash.slice(16),
    ].join('')
    expect(Credential.isICredential(testAttestation)).toBeFalsy()
  })
  it('returns Claim Hash of the attestation', async () => {
    const testAttestation = await buildCredential(
      identityAlice,
      identityBob.did,
      {},
      [],
      keystore
    )
    expect(Credential.getHash(testAttestation)).toEqual(
      testAttestation.attestation.claimHash
    )
  })
})

describe('create presentation', () => {
  let keystore: DemoKeystore
  let migratedClaimerLightDid: DidDetails
  let migratedClaimerFullDid: DidDetails
  let unmigratedClaimerLightDid: DidDetails
  let migratedThenDeletedClaimerLightDid: DidDetails
  let migratedThenDeletedClaimerFullDid: DidDetails
  let attester: DidDetails
  let ctype: ICType
  let reqForAtt: IRequestForAttestation
  let attestation: IAttestation

  const mockResolver: IDidResolver = (() => {
    const resolve = async (
      didUri: string
    ): Promise<DidResolvedDetails | null> => {
      // For the mock resolver, we need to match the base URI, so we delete the fragment, if present.
      const { did } = DidUtils.parseDidUri(didUri)
      switch (did) {
        case migratedClaimerLightDid?.did:
          return {
            details: migratedClaimerLightDid,
            metadata: {
              canonicalId: migratedClaimerFullDid.did,
              deactivated: false,
            },
          }
        case migratedThenDeletedClaimerLightDid?.did:
          return {
            metadata: {
              deactivated: true,
            },
          }
        case migratedThenDeletedClaimerFullDid?.did:
          return {
            metadata: {
              deactivated: true,
            },
          }
        case unmigratedClaimerLightDid?.did:
          return {
            details: unmigratedClaimerLightDid,
            metadata: { deactivated: false },
          }
        case migratedClaimerFullDid?.did:
          return {
            details: migratedClaimerFullDid,
            metadata: { deactivated: false },
          }
        case attester?.did:
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
    keystore = new DemoKeystore()
    attester = await DemoKeystoreUtils.createLocalDemoFullDidFromSeed(
      keystore,
      '//Attester'
    )
    const unmigratedClaimerKey = await keystore.generateKeypair({
      alg: SigningAlgorithms.Sr25519,
      seed: '//UnmigratedClaimer',
    })
    unmigratedClaimerLightDid = LightDidDetails.fromIdentifier(
      encodeAddress(unmigratedClaimerKey.publicKey, 38),
      LightDidSupportedSigningKeyTypes.sr25519
    )
    const migratedClaimerKey = await keystore.generateKeypair({
      alg: SigningAlgorithms.Sr25519,
      seed: '//MigratedClaimer',
    })
    migratedClaimerLightDid = LightDidDetails.fromIdentifier(
      encodeAddress(migratedClaimerKey.publicKey, 38),
      LightDidSupportedSigningKeyTypes.sr25519
    )
    // Change also the authentication key of the full DID to properly verify signature verification,
    // so that it uses a completely different key and the credential is still correctly verified.
    const newKeyForMigratedClaimerDid = await keystore.generateKeypair({
      alg: SigningAlgorithms.Sr25519,
      seed: '//RandomSeed',
    })
    migratedClaimerFullDid = await createMinimalFullDidFromLightDid(
      migratedClaimerLightDid as LightDidDetails,
      {
        type: DemoKeystore.getKeypairTypeForAlg(
          newKeyForMigratedClaimerDid.alg
        ),
        publicKey: newKeyForMigratedClaimerDid.publicKey,
        id: 'new-auth',
      }
    )
    const migratedThenDeletedKey = await keystore.generateKeypair({
      alg: SigningAlgorithms.Ed25519,
      seed: '//MigratedThenDeletedClaimer',
    })
    migratedThenDeletedClaimerLightDid = LightDidDetails.fromIdentifier(
      encodeAddress(migratedThenDeletedKey.publicKey, 38),
      LightDidSupportedSigningKeyTypes.ed25519
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

    ctype = CType.fromSchema(rawCType, migratedClaimerFullDid.did)

    // cannot be used since the variable needs to be established in the outer scope
    reqForAtt = RequestForAttestation.fromClaim(
      Claim.fromCTypeAndClaimContents(
        ctype,
        {
          name: 'Peter',
          age: 12,
        },
        migratedClaimerFullDid.did
      )
    )

    attestation = Attestation.fromRequestAndDid(reqForAtt, attester.did)
  })

  it('should build from reqForAtt and Attestation', async () => {
    const cred = Credential.fromRequestAndAttestation(reqForAtt, attestation)
    expect(cred).toBeDefined()
  })

  it('should create presentation and exclude specific attributes using a full DID', async () => {
    ;(query as jest.Mock).mockResolvedValue(attestation)

    const cred = Credential.fromRequestAndAttestation(reqForAtt, attestation)

    const challenge = UUID.generate()
    const att = await Credential.createPresentation({
      credential: cred,
      selectedAttributes: ['name'],
      signer: keystore,
      claimerDid: migratedClaimerFullDid,
      challenge,
    })
    expect(Credential.getAttributes(att)).toEqual(new Set(['name']))
    await expect(
      Credential.verify(att, {
        resolver: mockResolver,
      })
    ).resolves.toBe(true)
    expect(att.request.claimerSignature?.challenge).toEqual(challenge)
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
    ctype = CType.fromSchema(rawCType, attester.did)

    // cannot be used since the variable needs to be established in the outer scope
    reqForAtt = RequestForAttestation.fromClaim(
      Claim.fromCTypeAndClaimContents(
        ctype,
        {
          name: 'Peter',
          age: 12,
        },
        unmigratedClaimerLightDid.did
      )
    )

    attestation = Attestation.fromRequestAndDid(reqForAtt, attester.did)
    ;(query as jest.Mock).mockResolvedValue(attestation)

    const cred = Credential.fromRequestAndAttestation(reqForAtt, attestation)

    const challenge = UUID.generate()
    const att = await Credential.createPresentation({
      credential: cred,
      selectedAttributes: ['name'],
      signer: keystore,
      claimerDid: unmigratedClaimerLightDid,
      challenge,
    })
    expect(Credential.getAttributes(att)).toEqual(new Set(['name']))
    await expect(
      Credential.verify(att, {
        resolver: mockResolver,
      })
    ).resolves.toBe(true)
    expect(att.request.claimerSignature?.challenge).toEqual(challenge)
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
    ctype = CType.fromSchema(rawCType, attester.did)

    // cannot be used since the variable needs to be established in the outer scope
    reqForAtt = RequestForAttestation.fromClaim(
      Claim.fromCTypeAndClaimContents(
        ctype,
        {
          name: 'Peter',
          age: 12,
        },
        // Use of light DID in the claim.
        migratedClaimerLightDid.did
      )
    )

    attestation = Attestation.fromRequestAndDid(reqForAtt, attester.did)
    ;(query as jest.Mock).mockResolvedValue(attestation)

    const cred = Credential.fromRequestAndAttestation(reqForAtt, attestation)

    const challenge = UUID.generate()
    const att = await Credential.createPresentation({
      credential: cred,
      selectedAttributes: ['name'],
      signer: keystore,
      // Use of full DID to sign the presentation.
      claimerDid: migratedClaimerFullDid,
      challenge,
    })
    expect(Credential.getAttributes(att)).toEqual(new Set(['name']))
    await expect(
      Credential.verify(att, {
        resolver: mockResolver,
      })
    ).resolves.toBe(true)
    expect(att.request.claimerSignature?.challenge).toEqual(challenge)
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
    ctype = CType.fromSchema(rawCType, attester.did)

    // cannot be used since the variable needs to be established in the outer scope
    reqForAtt = RequestForAttestation.fromClaim(
      Claim.fromCTypeAndClaimContents(
        ctype,
        {
          name: 'Peter',
          age: 12,
        },
        // Use of light DID in the claim.
        migratedClaimerLightDid.did
      )
    )

    attestation = Attestation.fromRequestAndDid(reqForAtt, attester.did)
    ;(query as jest.Mock).mockResolvedValue(attestation)

    const cred = Credential.fromRequestAndAttestation(reqForAtt, attestation)

    const challenge = UUID.generate()
    const att = await Credential.createPresentation({
      credential: cred,
      selectedAttributes: ['name'],
      signer: keystore,
      // Still using the light DID, which should fail since it has been migrated
      claimerDid: migratedClaimerLightDid,
      challenge,
    })
    expect(Credential.getAttributes(att)).toEqual(new Set(['name']))
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
    ctype = CType.fromSchema(rawCType, attester.did)

    // cannot be used since the variable needs to be established in the outer scope
    reqForAtt = RequestForAttestation.fromClaim(
      Claim.fromCTypeAndClaimContents(
        ctype,
        {
          name: 'Peter',
          age: 12,
        },
        // Use of light DID in the claim.
        migratedThenDeletedClaimerLightDid.did
      )
    )

    attestation = Attestation.fromRequestAndDid(reqForAtt, attester.did)
    ;(query as jest.Mock).mockResolvedValue(attestation)

    const cred = Credential.fromRequestAndAttestation(reqForAtt, attestation)

    const challenge = UUID.generate()
    const att = await Credential.createPresentation({
      credential: cred,
      selectedAttributes: ['name'],
      signer: keystore,
      // Still using the light DID, which should fail since it has been migrated and then deleted
      claimerDid: migratedThenDeletedClaimerLightDid,
      challenge,
    })
    expect(Credential.getAttributes(att)).toEqual(new Set(['name']))
    await expect(
      Credential.verify(att, {
        resolver: mockResolver,
      })
    ).resolves.toBeFalsy()
  })

  it('should get attribute keys', async () => {
    const cred = Credential.fromRequestAndAttestation(reqForAtt, attestation)
    expect(Credential.getAttributes(cred)).toEqual(new Set(['age', 'name']))
  })

  it('should verify the credential claims structure against the ctype', () => {
    const cred = Credential.fromRequestAndAttestation(reqForAtt, attestation)
    expect(CredentialUtils.verifyStructure(cred, ctype)).toBeTruthy()
    cred.request.claim.contents.name = 123

    expect(() =>
      CredentialUtils.verifyStructure(cred, ctype)
    ).toThrowErrorWithCode(SDKErrors.ErrorCode.ERROR_NO_PROOF_FOR_STATEMENT)
  })
})
