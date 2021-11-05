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

import type {
  IClaim,
  CompressedCredential,
  ICType,
  IDidDetails,
  IDidResolver,
} from '@kiltprotocol/types'
import { KeyRelationship } from '@kiltprotocol/types'
import {
  DemoKeystore,
  createLocalDemoDidFromSeed,
  createLightDidFromSeed,
  FullDidDetails,
  LightDidDetails,
  DidUtils,
  DidTypes,
  SigningAlgorithms,
} from '@kiltprotocol/did'
import { BN, hexToU8a, u8aToHex } from '@polkadot/util'
import { UUID } from '@kiltprotocol/utils'
import Attestation from '../attestation/Attestation'
import Claim from '../claim/Claim'
import CType from '../ctype/CType'
import RequestForAttestation from '../requestforattestation/RequestForAttestation'
import Credential from './Credential'
import CredentialUtils from './Credential.utils'
import { query } from '../attestation/Attestation.chain'

jest.mock('../attestation/Attestation.chain')

async function buildCredential(
  claimer: IDidDetails,
  attester: IDidDetails,
  contents: IClaim['contents'],
  legitimations: Credential[],
  signer: DemoKeystore
): Promise<Credential> {
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

  const testCType: CType = CType.fromSchema(rawCType)

  const claim = Claim.fromCTypeAndClaimContents(
    testCType,
    contents,
    claimer.did
  )
  // build request for attestation with legitimations
  const requestForAttestation = RequestForAttestation.fromClaim(claim, {
    legitimations,
  })
  await requestForAttestation.signWithDid(signer, claimer)
  // build attestation
  const testAttestation = Attestation.fromRequestAndDid(
    requestForAttestation,
    attester.did
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
  newAuthenticationKey?: DidTypes.INewPublicKey
): FullDidDetails {
  const { identifier } = DidUtils.parseDidUrl(lightDidForId.did)
  const did = DidUtils.getKiltDidFromIdentifier(
    identifier.substring(2),
    'full',
    FullDidDetails.FULL_DID_LATEST_VERSION
  )
  const lightDidAuthKey = lightDidForId.getKeys(
    KeyRelationship.authentication
  )[0]

  let authKey: DidTypes.INewPublicKey = {
    publicKey: hexToU8a(lightDidAuthKey.publicKeyHex),
    type: lightDidAuthKey.type,
  }
  if (newAuthenticationKey) {
    authKey = newAuthenticationKey
  }

  return new FullDidDetails({
    did,
    keys: [
      {
        ...authKey,
        id: DidUtils.assembleDidFragment(did, 'authentication'),
        controller: did,
        publicKeyHex: u8aToHex(authKey.publicKey),
      },
    ],
    keyRelationships: {
      authentication: [`${did}#authentication`],
    },
    lastTxIndex: new BN(0),
  })
}

describe('RequestForAttestation', () => {
  let keystore: DemoKeystore
  let identityAlice: IDidDetails
  let identityBob: IDidDetails
  let identityCharlie: IDidDetails
  let legitimation: Credential
  let compressedLegitimation: CompressedCredential
  let identityDave: IDidDetails
  let migratedAndDeletedLightDid: IDidDetails
  let migratedAndDeletedFullDid: IDidDetails

  const mockResolver: IDidResolver = (() => {
    const resolve = async (didUri: string) => {
      // For the mock resolver, we need to match the base URI, so we delete the fragment, if present.
      const didWithoutFragment = didUri.split('#')[0]
      switch (didWithoutFragment) {
        case identityAlice.did:
          return { details: identityAlice }
        case identityBob.did:
          return { details: identityBob }
        case identityCharlie.did:
          return { details: identityCharlie }
        case identityDave.did:
          return { details: identityDave }
        case migratedAndDeletedLightDid.did:
          return {
            details: migratedAndDeletedLightDid,
            metadata: {
              canonicalId: migratedAndDeletedFullDid.did,
              deleted: true,
            },
          }
        case migratedAndDeletedFullDid.did:
          return null
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

    identityAlice = await createLocalDemoDidFromSeed(keystore, '//Alice')
    identityBob = await createLocalDemoDidFromSeed(keystore, '//Bob')
    identityCharlie = await createLocalDemoDidFromSeed(keystore, '//Charlie')

    legitimation = await buildCredential(
      identityAlice,
      identityBob,
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
      identityAlice,
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
    identityDave = await createLightDidFromSeed(keystore, '//Dave')

    const credential = await buildCredential(
      identityDave,
      identityAlice,
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
    migratedAndDeletedLightDid = await createLightDidFromSeed(
      keystore,
      '//MigratedLight'
    )
    migratedAndDeletedFullDid = await createLocalDemoDidFromSeed(
      keystore,
      '//MigratedFull'
    )

    const credential = await buildCredential(
      migratedAndDeletedLightDid,
      identityAlice,
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

    expect(legitimation.compress()).toEqual(
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
      legitimation.compress()
    }).toThrow()
  })
  it('Typeguard should return true on complete Credentials', async () => {
    const testAttestation = await buildCredential(
      identityAlice,
      identityBob,
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
      identityBob,
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
      identityBob,
      {},
      [],
      keystore
    )
    expect(testAttestation.getHash()).toEqual(
      testAttestation.attestation.claimHash
    )
  })
})

describe('create presentation', () => {
  let keystore: DemoKeystore
  let migratedClaimerLightDid: IDidDetails
  let migratedClaimerFullDid: IDidDetails
  let unmigratedClaimerLightDid: IDidDetails
  let migratedThenDeletedClaimerLightDid: IDidDetails
  let migratedThenDeletedClaimerFullDid: IDidDetails
  let attester: IDidDetails
  let ctype: CType
  let reqForAtt: RequestForAttestation
  let attestation: Attestation

  const mockResolver: IDidResolver = (() => {
    const resolve = async (didUri: string) => {
      // For the mock resolver, we need to match the base URI, so we delete the fragment, if present.
      const didWithoutFragment = didUri.split('#')[0]
      switch (didWithoutFragment) {
        case migratedClaimerLightDid.did:
          return {
            details: migratedClaimerLightDid,
            metadata: {
              canonicalId: migratedClaimerFullDid.did,
              deleted: false,
            },
          }
        case migratedThenDeletedClaimerLightDid.did:
          return {
            details: migratedThenDeletedClaimerLightDid,
            metadata: {
              canonicalId: migratedThenDeletedClaimerFullDid.did,
              deleted: true,
            },
          }
        case migratedThenDeletedClaimerFullDid.did:
          return null
        case unmigratedClaimerLightDid.did:
          return { details: unmigratedClaimerLightDid }
        case migratedClaimerFullDid.did:
          return { details: migratedClaimerFullDid }
        case attester.did:
          return { details: attester }
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
    attester = await createLocalDemoDidFromSeed(keystore, '//Attester')
    unmigratedClaimerLightDid = await createLightDidFromSeed(
      keystore,
      '//UnmigratedClaimer'
    )
    migratedClaimerLightDid = await createLightDidFromSeed(
      keystore,
      '//MigratedClaimer'
    )
    // Change also the authentication key of the full DID to properly verify signature verification,
    // so that it uses a completely different key and the credential is still correctly verified.
    const newKeyForMigratedClaimerDid = await keystore.generateKeypair({
      alg: SigningAlgorithms.Sr25519,
      seed: '//RandomSeed',
    })
    migratedClaimerFullDid = createMinimalFullDidFromLightDid(
      migratedClaimerLightDid as LightDidDetails,
      {
        type: DemoKeystore.getKeypairTypeForAlg(
          newKeyForMigratedClaimerDid.alg
        ),
        publicKey: newKeyForMigratedClaimerDid.publicKey,
      }
    )
    migratedThenDeletedClaimerLightDid = await createLightDidFromSeed(
      keystore,
      '//MigratedThenDeletedClaimer'
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
    const att = await cred.createPresentation({
      selectedAttributes: ['name'],
      signer: keystore,
      claimerDid: migratedClaimerFullDid,
      challenge,
    })
    expect(att.getAttributes()).toEqual(new Set(['name']))
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
    const att = await cred.createPresentation({
      selectedAttributes: ['name'],
      signer: keystore,
      claimerDid: unmigratedClaimerLightDid,
      challenge,
    })
    expect(att.getAttributes()).toEqual(new Set(['name']))
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
    const att = await cred.createPresentation({
      selectedAttributes: ['name'],
      signer: keystore,
      // Use of full DID to sign the presentation.
      claimerDid: migratedClaimerFullDid,
      challenge,
    })
    expect(att.getAttributes()).toEqual(new Set(['name']))
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
    const att = await cred.createPresentation({
      selectedAttributes: ['name'],
      signer: keystore,
      // Still using the light DID, which should fail since it has been migrated
      claimerDid: migratedClaimerLightDid,
      challenge,
    })
    expect(att.getAttributes()).toEqual(new Set(['name']))
    await expect(
      Credential.verify(att, {
        resolver: mockResolver,
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      '"Addresses expected to be equal mismatched"'
    )
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
    const att = await cred.createPresentation({
      selectedAttributes: ['name'],
      signer: keystore,
      // Still using the light DID, which should fail since it has been migrated and then deleted
      claimerDid: migratedThenDeletedClaimerLightDid,
      challenge,
    })
    expect(att.getAttributes()).toEqual(new Set(['name']))
    await expect(
      Credential.verify(att, {
        resolver: mockResolver,
      })
    ).resolves.toBeFalsy()
  })

  it('should get attribute keys', async () => {
    const cred = Credential.fromRequestAndAttestation(reqForAtt, attestation)
    expect(cred.getAttributes()).toEqual(new Set(['age', 'name']))
  })
})
