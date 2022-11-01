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
  DidDocument,
  DidResourceUri,
  DidSignature,
  DidUri,
  DidVerificationKey,
  IAttestation,
  IClaim,
  IClaimContents,
  ICredential,
  ICredentialPresentation,
  ResolvedDidKey,
  SignCallback,
} from '@kiltprotocol/types'
import { Crypto, SDKErrors, UUID } from '@kiltprotocol/utils'
import * as Did from '@kiltprotocol/did'
import {
  createLocalDemoFullDidFromKeypair,
  KeyTool,
  makeSigningKeyTool,
} from '@kiltprotocol/testing'
import * as Attestation from '../attestation'
import * as Claim from '../claim'
import * as CType from '../ctype'
import * as Credential from './Credential'

const testCType = CType.fromProperties('raw ctype', {
  name: { type: 'string' },
})

function buildCredential(
  claimerDid: DidUri,
  contents: IClaimContents,
  legitimations: ICredential[]
): ICredential {
  // create claim

  const claim: IClaim = {
    cTypeHash: CType.idToHash(testCType.$id),
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
    expect(() => Credential.verifyDataIntegrity(credential)).not.toThrow()
    await Credential.verifyCredential(credential, {
      ctype: testCType,
    })

    // just deleting a field will result in a wrong proof
    delete credential.claimNonceMap[Object.keys(credential.claimNonceMap)[0]]
    expect(() => Credential.verifyDataIntegrity(credential)).toThrowError(
      SDKErrors.ClaimUnverifiableError
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

  it('hides claim properties', async () => {
    const credential = buildCredential(identityBob, { a: 'a', b: 'b' }, [])
    const newCredential = Credential.removeClaimProperties(credential, ['a'])

    expect((newCredential.claim.contents as any).a).toBeUndefined()
    expect(Object.keys(newCredential.claimNonceMap)).toHaveLength(
      newCredential.claimHashes.length - 1
    )
    expect((newCredential.claim.contents as any).b).toBe('b')
    expect(() => Credential.verifyDataIntegrity(newCredential)).not.toThrow()
    expect(() => Credential.verifyRootHash(newCredential)).not.toThrow()
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
    } as ICredentialPresentation
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
    ).toThrowError(SDKErrors.LegitimationsMissingError)
    expect(() =>
      Credential.verifyDataIntegrity(builtCredentialMalformedRootHash)
    ).toThrowError(SDKErrors.RootHashUnverifiableError)
    expect(() =>
      Credential.verifyDataIntegrity(builtCredentialIncompleteClaimHashTree)
    ).toThrowError(SDKErrors.ClaimUnverifiableError)
    expect(Credential.isPresentation(builtCredentialMalformedSignature)).toBe(
      false
    )
    expect(() =>
      Credential.verifyDataIntegrity(builtCredentialMalformedHashes)
    ).toThrowError(SDKErrors.ClaimUnverifiableError)
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
    const builtCredential = buildCredential(
      identityBob,
      {
        a: 'a',
        b: 'b',
        c: 'c',
      },
      []
    )
    expect(() =>
      Credential.verifyAgainstCType(builtCredential, testCType)
    ).not.toThrow()
    builtCredential.claim.contents.name = 123
    expect(() =>
      Credential.verifyAgainstCType(builtCredential, testCType)
    ).toThrow()
  })
})

describe('Credential', () => {
  let keyAlice: KeyTool
  let keyCharlie: KeyTool
  let identityAlice: DidDocument
  let identityBob: DidDocument
  let identityCharlie: DidDocument
  let legitimation: ICredentialPresentation
  let identityDave: DidDocument
  let migratedAndDeletedLightDid: DidDocument

  async function didResolveKey(
    keyUri: DidResourceUri
  ): Promise<ResolvedDidKey> {
    const { did } = Did.parse(keyUri)
    const document = [
      identityAlice,
      identityBob,
      identityCharlie,
      identityDave,
    ].find(({ uri }) => uri === did)
    if (!document) throw new Error('Cannot resolve mocked DID')
    return Did.keyToResolvedKey(document.authentication[0], did)
  }

  // TODO: Cleanup file by migrating setup functions and removing duplicate tests.
  async function buildPresentation(
    claimer: DidDocument,
    attesterDid: DidUri,
    contents: IClaim['contents'],
    legitimations: ICredential[],
    sign: SignCallback
  ): Promise<[ICredentialPresentation, IAttestation]> {
    // create claim

    const ctype = CType.fromProperties('Credential', {
      name: { type: 'string' },
    })

    const claim = Claim.fromCTypeAndClaimContents(ctype, contents, claimer.uri)
    // build credential with legitimations
    const credential = Credential.fromClaim(claim, {
      legitimations,
    })
    const presentation = await Credential.createPresentation({
      credential,
      signCallback: sign,
    })
    // build attestation
    const testAttestation = Attestation.fromCredentialAndDid(
      credential,
      attesterDid
    )
    return [presentation, testAttestation]
  }

  beforeAll(async () => {
    keyAlice = makeSigningKeyTool()
    identityAlice = await createLocalDemoFullDidFromKeypair(keyAlice.keypair)

    const keyBob = makeSigningKeyTool()
    identityBob = await createLocalDemoFullDidFromKeypair(keyBob.keypair)

    keyCharlie = makeSigningKeyTool()
    identityCharlie = await createLocalDemoFullDidFromKeypair(
      keyCharlie.keypair
    )
      ;[legitimation] = await buildPresentation(
        identityAlice,
        identityBob.uri,
        {},
        [],
        keyAlice.getSignCallback(identityAlice)
      )
  })

  it('verify credentials signed by a full DID', async () => {
    const [presentation] = await buildPresentation(
      identityCharlie,
      identityAlice.uri,
      {
        a: 'a',
        b: 'b',
        c: 'c',
      },
      [legitimation],
      keyCharlie.getSignCallback(identityCharlie)
    )

    // check proof on complete data
    expect(() => Credential.verifyDataIntegrity(presentation)).not.toThrow()
    await Credential.verifyPresentation(presentation, {
      didResolveKey,
    })
  })
  it('verify credentials signed by a light DID', async () => {
    const { getSignCallback, authentication } = makeSigningKeyTool('ed25519')
    identityDave = await Did.createLightDidDocument({
      authentication,
    })

    const [presentation] = await buildPresentation(
      identityDave,
      identityAlice.uri,
      {
        a: 'a',
        b: 'b',
        c: 'c',
      },
      [legitimation],
      getSignCallback(identityDave)
    )

    // check proof on complete data
    expect(() => Credential.verifyDataIntegrity(presentation)).not.toThrow()
    await Credential.verifyPresentation(presentation, {
      didResolveKey,
    })
  })

  it('throws if signature is missing on credential presentation', async () => {
    const credential = buildCredential(
      identityBob.uri,
      {
        a: 'a',
        b: 'b',
        c: 'c',
      },
      [legitimation]
    )
    await expect(
      Credential.verifyPresentation(credential as ICredentialPresentation, {
        ctype: testCType,
        didResolveKey,
      })
    ).rejects.toThrow()
  })

  it('throws if signature is by unrelated did', async () => {
    const { getSignCallback, authentication } = makeSigningKeyTool('ed25519')
    identityDave = Did.createLightDidDocument({
      authentication,
    })

    const credential = buildCredential(
      identityBob.uri,
      {
        a: 'a',
        b: 'b',
        c: 'c',
      },
      [legitimation]
    )

    const presentation = await Credential.createPresentation({ credential, signCallback: getSignCallback(identityDave) })

    await expect(Credential.verifySignature(presentation, {
      didResolveKey,
    })).resolves.toThrow()
  })

  it('throws if signature is by corresponding light did', async () => {
    const credential = buildCredential(
      identityAlice.uri,
      {
        a: 'a',
        b: 'b',
        c: 'c',
      },
      [legitimation]
    )

    const presentation = await Credential.createPresentation({ credential, signCallback: keyAlice.getSignCallback(identityAlice) })

    presentation.claimerSignature.keyUri = `${Did.createLightDidDocument({ authentication: keyAlice.authentication }).uri}${identityAlice.authentication[0].id}`

    await expect(Credential.verifySignature(presentation, {
      didResolveKey,
    })).resolves.toThrow()
  })

  it('fail to verify credentials signed by a light DID after it has been migrated and deleted', async () => {
    const migratedAndDeleted = makeSigningKeyTool('ed25519')
    migratedAndDeletedLightDid = Did.createLightDidDocument({
      authentication: migratedAndDeleted.authentication,
    })

    const [presentation] = await buildPresentation(
      migratedAndDeletedLightDid,
      identityAlice.uri,
      {
        a: 'a',
        b: 'b',
        c: 'c',
      },
      [legitimation],
      migratedAndDeleted.getSignCallback(migratedAndDeletedLightDid)
    )

    // check proof on complete data
    expect(() => Credential.verifyDataIntegrity(presentation)).not.toThrow()
    await expect(
      Credential.verifyPresentation(presentation, {
        didResolveKey,
      })
    ).rejects.toThrowError()
  })

  it('Typeguard should return true on complete Credentials', async () => {
    const [presentation] = await buildPresentation(
      identityAlice,
      identityBob.uri,
      {},
      [],
      keyAlice.getSignCallback(identityAlice)
    )
    expect(Credential.isICredential(presentation)).toBe(true)
    delete (presentation as Partial<ICredential>).claimHashes

    expect(Credential.isICredential(presentation)).toBe(false)
  })
  it('Should throw error when attestation is from different credential', async () => {
    const [credential, attestation] = await buildPresentation(
      identityAlice,
      identityBob.uri,
      {},
      [],
      keyAlice.getSignCallback(identityAlice)
    )
    expect(() =>
      Attestation.verifyAgainstCredential(attestation, credential)
    ).not.toThrow()
    const { cTypeHash } = attestation
    // @ts-ignore
    attestation.cTypeHash = [
      cTypeHash.slice(0, 15),
      ((parseInt(cTypeHash.charAt(15), 16) + 1) % 16).toString(16),
      cTypeHash.slice(16),
    ].join('')
    expect(() =>
      Attestation.verifyAgainstCredential(attestation, credential)
    ).toThrow()
  })
  it('returns Claim Hash of the attestation', async () => {
    const [credential, attestation] = await buildPresentation(
      identityAlice,
      identityBob.uri,
      {},
      [],
      keyAlice.getSignCallback(identityAlice)
    )
    expect(Credential.getHash(credential)).toEqual(attestation.claimHash)
  })
})

describe('create presentation', () => {
  let migratedClaimerLightDid: DidDocument
  let migratedClaimerFullDid: DidDocument
  let newKeyForMigratedClaimerDid: KeyTool
  let unmigratedClaimerLightDid: DidDocument
  let unmigratedClaimerKey: KeyTool
  let migratedThenDeletedClaimerLightDid: DidDocument
  let migratedThenDeletedKey: KeyTool
  let attester: DidDocument
  let credential: ICredential

  const ctype = CType.fromProperties(testCType.title, testCType.properties)

  // Returns a full DID that has the same subject of the first light DID, but the same key authentication key as the second one, if provided, or as the first one otherwise.
  function createMinimalFullDidFromLightDid(
    lightDidForId: DidDocument,
    newAuthenticationKey?: DidVerificationKey
  ): DidDocument {
    const uri = Did.getFullDidUri(lightDidForId.uri)
    const authKey = newAuthenticationKey || lightDidForId.authentication[0]

    return {
      uri,
      authentication: [authKey],
    }
  }

  async function didResolveKey(
    keyUri: DidResourceUri
  ): Promise<ResolvedDidKey> {
    const { did } = Did.parse(keyUri)
    const document = [
      migratedClaimerLightDid,
      unmigratedClaimerLightDid,
      migratedClaimerFullDid,
      attester,
    ].find(({ uri }) => uri === did)
    if (!document) throw new Error('Cannot resolve mocked DID')
    return Did.keyToResolvedKey(document.authentication[0], did)
  }

  beforeAll(async () => {
    const { keypair } = makeSigningKeyTool()
    attester = await createLocalDemoFullDidFromKeypair(keypair)

    unmigratedClaimerKey = makeSigningKeyTool()
    unmigratedClaimerLightDid = Did.createLightDidDocument({
      authentication: unmigratedClaimerKey.authentication,
    })
    const migratedClaimerKey = makeSigningKeyTool()
    migratedClaimerLightDid = Did.createLightDidDocument({
      authentication: migratedClaimerKey.authentication,
    })
    // Change also the authentication key of the full DID to properly verify signature verification,
    // so that it uses a completely different key and the credential is still correctly verified.
    newKeyForMigratedClaimerDid = makeSigningKeyTool()
    migratedClaimerFullDid = await createMinimalFullDidFromLightDid(
      migratedClaimerLightDid,
      {
        ...newKeyForMigratedClaimerDid.authentication[0],
        id: '#new-auth',
      }
    )
    migratedThenDeletedKey = makeSigningKeyTool('ed25519')
    migratedThenDeletedClaimerLightDid = Did.createLightDidDocument({
      authentication: migratedThenDeletedKey.authentication,
    })

    // cannot be used since the variable needs to be established in the outer scope
    credential = Credential.fromClaim(
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
      credential,
      selectedAttributes: ['name'],
      signCallback: newKeyForMigratedClaimerDid.getSignCallback(
        migratedClaimerFullDid
      ),
      challenge,
    })
    await Credential.verifyPresentation(presentation, {
      didResolveKey,
    })
    expect(presentation.claimerSignature?.challenge).toEqual(challenge)
  })
  it('should create presentation and exclude specific attributes using a light DID', async () => {
    // cannot be used since the variable needs to be established in the outer scope
    credential = Credential.fromClaim(
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
      credential,
      selectedAttributes: ['name'],
      signCallback: unmigratedClaimerKey.getSignCallback(
        unmigratedClaimerLightDid
      ),
      challenge,
    })
    await Credential.verifyPresentation(presentation, {
      didResolveKey,
    })
    expect(presentation.claimerSignature?.challenge).toEqual(challenge)
  })
  it('should create presentation and exclude specific attributes using a migrated DID', async () => {
    // cannot be used since the variable needs to be established in the outer scope
    credential = Credential.fromClaim(
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
      credential,
      selectedAttributes: ['name'],
      // Use of full DID to sign the presentation.
      signCallback: newKeyForMigratedClaimerDid.getSignCallback(
        migratedClaimerFullDid
      ),
      challenge,
    })
    await Credential.verifyPresentation(presentation, {
      didResolveKey,
    })
    expect(presentation.claimerSignature?.challenge).toEqual(challenge)
  })

  it('should fail to create a valid presentation and exclude specific attributes using a light DID after it has been migrated', async () => {
    // cannot be used since the variable needs to be established in the outer scope
    credential = Credential.fromClaim(
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
      credential,
      selectedAttributes: ['name'],
      // Still using the light DID, which should fail since it has been migrated
      signCallback: newKeyForMigratedClaimerDid.getSignCallback(
        migratedClaimerLightDid
      ),
      challenge,
    })
    await expect(
      Credential.verifyPresentation(att, {
        didResolveKey,
      })
    ).rejects.toThrow()
  })

  it('should fail to create a valid presentation using a light DID after it has been migrated and deleted', async () => {
    // cannot be used since the variable needs to be established in the outer scope
    credential = Credential.fromClaim(
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
      credential,
      selectedAttributes: ['name'],
      // Still using the light DID, which should fail since it has been migrated and then deleted
      signCallback: migratedThenDeletedKey.getSignCallback(
        migratedThenDeletedClaimerLightDid
      ),
      challenge,
    })
    await expect(
      Credential.verifyPresentation(presentation, {
        didResolveKey,
      })
    ).rejects.toThrow()
  })

  it('should verify the credential claims structure against the ctype', () => {
    expect(() => Credential.verifyAgainstCType(credential, ctype)).not.toThrow()
    credential.claim.contents.name = 123

    expect(() => Credential.verifyAgainstCType(credential, ctype)).toThrow()
  })
})
