/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group breaking
 */

import {
  Attestation,
  Claim,
  Credential,
  CType,
  Did,
  DidDocument,
  DidKey,
  DidResourceUri,
  ICType,
  Message,
  MessageBody,
  ResolvedDidKey,
  Utils,
} from '@kiltprotocol/sdk-js'
import nacl from 'tweetnacl'
import { v4 } from 'uuid'
import { makeEncryptionKeyTool } from './TestUtils'

jest.mock('uuid')
jest.mocked(v4).mockReturnValue('1ee1307c-9e65-475d-9061-0b5bfd86d2f7')

// Mock nacl randombytes, so that the nonce and ciphertext stay the same between runs
jest.spyOn(nacl, 'randomBytes').mockReturnValue(new Uint8Array(24).fill(42))

function makeLightDidFromSeed(seed: string) {
  const keypair = Utils.Crypto.makeKeypairFromUri(seed, 'sr25519')
  const { keyAgreement, encrypt } = makeEncryptionKeyTool(seed)

  const did = Did.createLightDidDocument({
    authentication: [keypair],
    keyAgreement,
    service: [
      {
        id: '#1234',
        type: ['KiltPublishedCredentialCollectionV1'],
        serviceEndpoint: [
          'https://ipfs.io/ipfs/QmNUAwg7JPK9nnuZiUri5nDaqLHqUFtNoZYtfD22Q6w3c8',
        ],
      },
    ],
  })

  return { did, encrypt }
}

function makeResolveKey(document: DidDocument) {
  return async function resolveKey(
    keyUri: DidResourceUri
  ): Promise<ResolvedDidKey> {
    const { fragment } = Did.parse(keyUri)
    const key = Did.getKey(document, fragment!) as DidKey
    return {
      controller: document!.uri,
      id: keyUri!,
      publicKey: key.publicKey,
      type: key.type,
    }
  }
}

describe('Breaking Changes', () => {
  describe('Light DID', () => {
    it('does not break the light did uri generation', () => {
      const { did } = makeLightDidFromSeed(
        '0x127f2375faf3472c2f94ffcdd5424590b27294631f2cb8041407e501bc97c44c'
      )

      expect(did.uri).toMatchInlineSnapshot(
        `"did:kilt:light:004quk8nu1MLvzdoT4fE6SJsLS4fFpyvuGz7sQpMF7ZAWTDoF5:z1msTRicERqs59nwMvp3yzMRBhUYGmkum7ehY7rtKQc8HzfEx4b4eyRhrc37ZShT3oG7E89x89vaG9W4hRxPS23EAFnCSeVbVRrKGJmFQvYhjgKSMmrGC7gSxgHe1a3g41uamhD49AEi13YVMkgeHpyEQJBy7N7gGyW7jTWFcwzAnws4wSazBVG1qHmVJrhmusoJoTfKTPKXkExKyur8Z341EkcRkHteY8dV3VjLXHnfhRW2yU9oM2cRm5ozgaufxrXsQBx33ygTW2wvrfzzXsYw4Bs6Vf2tC3ipBTDcKyCk6G88LYnzBosRM15W3KmDRciJ2iPjqiQkhYm77EQyaw"`
      )
    })
  })
  describe('Messages', () => {
    it('does not break Message & EncryptedMessage structure', async () => {
      const { did: aliceDid, encrypt } = makeLightDidFromSeed(
        '0xdc6f4d21a91848eeeac1811c73a2323060ef2d8d4a07ece2f216d5b8f977520b'
      )
      const { did: bobDid } = makeLightDidFromSeed(
        '0xa748f38e896ddc52b6e5cc5baa754f7f841381ef32bf1d86d51026857c6c05dc'
      )

      // Mock Date object for message.createdAt property
      jest.useFakeTimers().setSystemTime(1657727664899)

      const message = Message.fromBody(
        {
          type: 'request-terms',
          content: {
            cTypeHash: '0x1234',
          },
        },
        aliceDid.uri,
        bobDid.uri
      )

      expect(message).toMatchSnapshot()

      const encrypted = await Message.encrypt(
        message,
        encrypt(aliceDid),
        `${bobDid.uri}#encryption`,
        {
          resolveKey: makeResolveKey(bobDid),
        }
      )

      expect(encrypted).toMatchSnapshot()
    })

    it('does not break for attestation flow', async () => {
      // attestation flow

      const attester = makeLightDidFromSeed(
        '0xdc6f4d21a91848eeeac1811c73a2323060ef2d8d4a07ece2f216d5b8f977520b'
      )
      const user = makeLightDidFromSeed(
        '0xa748f38e896ddc52b6e5cc5baa754f7f841381ef32bf1d86d51026857c6c05dc'
      )

      const cType: ICType = {
        $id: 'kilt:ctype:0xd5301762c62114f6455e0b373cccce20631c2a717004a98f8953e738e17c5d3c',
        $schema: 'http://kilt-protocol.org/draft-01/ctype#',
        title: 'CtypeModel 2',
        properties: {
          name: { type: 'string' },
        },
        type: 'object',
      }

      const requestTerms: MessageBody = {
        type: 'request-terms',
        content: {
          cTypeHash: CType.idToHash(cType.$id),
        },
      }
      expect(requestTerms).toMatchSnapshot('request-terms')

      const claim = Claim.fromCTypeAndClaimContents(
        cType,
        { name: 'Bob' },
        attester.did.uri
      )
      const submitTerms: MessageBody = {
        type: 'submit-terms',
        content: {
          claim,
          legitimations: [],
        },
      }
      expect(submitTerms).toMatchSnapshot('submit-terms')

      claim.owner = user.did.uri
      const credential = Credential.fromClaim(claim, { legitimations: [] })
      const requestAttestation: MessageBody = {
        type: 'request-attestation',
        content: { credential },
      }
      expect(requestAttestation).toMatchSnapshot('request-attestation')

      const attestation = Attestation.fromCredentialAndDid(
        credential,
        attester.did.uri
      )
      const submitAttestation: MessageBody = {
        type: 'submit-attestation',
        content: { attestation },
      }
      expect(submitAttestation).toMatchSnapshot('submit-attestation')

      // verification flow

      const challenge = '0xCAFE'
      const requestCredential: MessageBody = {
        type: 'request-credential',
        content: {
          cTypes: [
            {
              cTypeHash: CType.idToHash(cType.$id),
              requiredProperties: ['name'],
              trustedAttesters: [attester.did.uri],
            },
          ],
          challenge,
        },
      }
      expect(requestCredential).toMatchSnapshot('request-credential')

      const presentation = await Credential.createPresentation({
        credential,
        challenge,
        signCallback: async () => ({
          signature: new Uint8Array(32).fill(0),
          keyUri: `${user.did.uri}${user.did.authentication[0].id}`,
          keyType: user.did.authentication[0].type,
        }),
      })
      const submitCredential: MessageBody = {
        type: 'submit-credential',
        content: [presentation],
      }
      expect(submitCredential).toMatchSnapshot('submit-credential')
    })
  })
})
