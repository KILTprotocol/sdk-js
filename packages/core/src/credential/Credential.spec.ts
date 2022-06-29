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
import { ss58Format } from '@kiltprotocol/utils'
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

  const mockResolver = (() => {
    async function resolve(didUri: DidUri): Promise<DidResolvedDetails | null> {
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
    await Credential.verify(credential, {
      resolver: mockResolver,
    })
  })
  it('verify credentials signed by a light DID', async () => {
    const { keypair, sign } = makeSigningKeyTool(SigningAlgorithms.Ed25519)
    identityDave = await LightDidDetails.fromIdentifier(
      encodeAddress(keypair.publicKey, ss58Format),
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
    await Credential.verify(credential, {
      resolver: mockResolver,
    })
  })

  it('fail to verify credentials signed by a light DID after it has been migrated and deleted', async () => {
    const migratedAndDeleted = makeSigningKeyTool(SigningAlgorithms.Ed25519)
    migratedAndDeletedLightDid = LightDidDetails.fromIdentifier(
      encodeAddress(migratedAndDeleted.keypair.publicKey, ss58Format),
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
    expect(
      await Credential.verify(credential, {
        resolver: mockResolver,
      })
    ).toBeFalsy()
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
