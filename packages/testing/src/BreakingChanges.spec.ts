/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group breaking
 */

import {
  Did,
  Utils,
  VerificationKeyType,
  Message,
  MessageBodyType,
  IDidResolver,
  DidResolvedDetails,
  ResolvedDidKey,
  IDidDetails,
  DidPublicKey,
  DidKey,
  MessageBody,
} from '@kiltprotocol/sdk-js'
import { makeEncryptionKeyTool } from './TestUtils'

function makeLightDidFromSeed(seed: string) {
  const keyring = new Utils.Keyring({
    type: 'sr25519',
    ss58Format: Utils.ss58Format,
  })

  const keypair = keyring.addFromUri(seed, undefined, 'sr25519')

  const { keypair: encKeypair, encrypt } = makeEncryptionKeyTool(seed)

  const did = Did.LightDidDetails.fromDetails({
    authenticationKey: {
      publicKey: keypair.publicKey,
      type: VerificationKeyType.Sr25519,
    },
    encryptionKey: encKeypair,
    serviceEndpoints: [
      {
        id: '1234',
        types: ['KiltPublishedCredentialCollectionV1'],
        urls: [
          'https://ipfs.io/ipfs/QmNUAwg7JPK9nnuZiUri5nDaqLHqUFtNoZYtfD22Q6w3c8',
        ],
      },
    ],
  })

  return { did, encrypt }
}

const mockResolver = (didMock: IDidDetails) => {
  const resolveDoc = async (): Promise<DidResolvedDetails | null> => {
    return {
      details: didMock,
      metadata: { deactivated: false },
    }
  }
  const resolveKey = async (
    keyUri: DidPublicKey['uri']
  ): Promise<ResolvedDidKey | null> => {
    const { fragment } = Did.Utils.parseDidUri(keyUri)
    const { details } = (await resolveDoc()) as DidResolvedDetails
    const key = details?.getKey(fragment!) as DidKey
    return {
      controller: details!.uri,
      uri: keyUri,
      publicKey: key.publicKey,
      type: key.type,
    }
  }
  return {
    resolveDoc,
    resolveKey,
  } as unknown as IDidResolver
}

describe('Breaking Changes', () => {
  describe('Light DID', () => {
    it('does not break the light did uri generation', () => {
      const { did } = makeLightDidFromSeed(
        '0x127f2375faf3472c2f94ffcdd5424590b27294631f2cb8041407e501bc97c44c'
      )

      expect(did.uri).toMatchInlineSnapshot(
        `"did:kilt:light:004quk8nu1MLvzdoT4fE6SJsLS4fFpyvuGz7sQpMF7ZAWTDoF5:z147wqPsQV7GGKBxQGmTMeDTTVP9P4cmkLTwk51317eYruvmW9vrwxtS2KhQBQe39gxi9bLwmsa7wyyrKvXkDeaopxPmQxk9gQ67vGzc5v2YZ7tgUz1RAFZtYRnnz9RdnpKb1pvfghe1NkJBeVkqHcN9vsiBukpXnMBHNrC189jnYrR9fGYTigawPW6CS2Z65k3F9LdfNvetHm77CpTociiMyvFtqmTqmoBwh86PjhDEpwX69o2KbwZw1q4CmTewJ35PHAUtyc8uW5P5uxsfNyCJMpr2tuM4ayJ22zUbh1rznYQrpjzdT7Qxx1GcuFsZaJVQ7Cj6w"`
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

      const message = new Message(
        {
          type: MessageBodyType.REQUEST_TERMS,
          content: {
            cTypeHash: '0x1234',
          },
        },
        aliceDid.uri,
        bobDid.uri
      )

      // createdAt and messageId are different each time
      message.createdAt = 1657212991479
      message.messageId =
        '0x072678802b3e7807fbec86cc93328d52de76e0249011918d4f96835fa0923b8e'
      expect(message).toMatchInlineSnapshot(`
        Message {
          "body": Object {
            "content": Object {
              "cTypeHash": "0x1234",
            },
            "type": "request-terms",
          },
          "createdAt": 1657212991479,
          "messageId": "0x072678802b3e7807fbec86cc93328d52de76e0249011918d4f96835fa0923b8e",
          "receiver": "did:kilt:light:004rzcHqKvv6TbsA46VpG53JrvdzRr6ccyboUNeCGTvDw2AozU:z147wqPsQV7GGKBxQGmTMeDTTVPBvZ1AdEf99W5vCASMxUTrTY233fstS4x3nkmngDgoWfHq8ej5AfRsoAQczQbFdscM7KQa8QEcqC8LnPtkgJEAXmoWf13FQNR4HQb3vjz1fkAvuRagmE6Dfgt4nVXv5ku2jkj8aR8irPg2wa33VhNi8NT5m7QJjsFeaUpKQpsUwMdk9UWjCdSS9gy6yrsRaLUVLcRvhqteuy72N4tAFWaCdF2YJsHYAwJdnML1x9gM3hMo7yzskmrY9RwkmeeuXGV9GJoEFUTsXWk12mDea2E1f7FJBYgnJp8Vp5ve1HVtZVzum",
          "sender": "did:kilt:light:004rn1Xps9QSMiAb2aMoKQbAred94wh1iLjGmNBYy1FVCS81ry:z147wqPsQV7GGKBxQGmTMeDTTVP41uiX9BXTq4uqLWGHgTe9Vx2hK81GGQvXGRee5m2EiEqd1fSMzDpgNEFEUNHEBAGsTd8bqDWPhapBetBQ8wAtG7wHj1XwCswvSNp79Sg6NMuwKs2oco4fnHK85cKvmkMnArR3kbHPjAfqeg9wdQ2VtPN3DkjzLgsMbjHH7G9BJCBMRKtJJMuSBs3BWagzY2QCGGC54k5XN3XWiF1QCMG2edoyvShyxhVNyay7PwGg2y5xCK4d6Dg4g2ucq5iidDppobcUFCU7rXqVnrHsALjwe6S4gnF6cC5ZrkkpHxLw94fXV",
        }
      `)

      const encrypted = await message.encrypt(
        'encryption',
        aliceDid,
        encrypt,
        `${bobDid.uri}#encryption`,
        {
          resolver: mockResolver(bobDid),
        }
      )

      // ciphertext and nonce are always random
      // @ts-ignore
      encrypted.ciphertext = null
      // @ts-ignore
      encrypted.nonce = null

      expect(encrypted).toMatchInlineSnapshot(`
        Object {
          "ciphertext": null,
          "nonce": null,
          "receivedAt": undefined,
          "receiverKeyUri": "did:kilt:light:004rzcHqKvv6TbsA46VpG53JrvdzRr6ccyboUNeCGTvDw2AozU:z147wqPsQV7GGKBxQGmTMeDTTVPBvZ1AdEf99W5vCASMxUTrTY233fstS4x3nkmngDgoWfHq8ej5AfRsoAQczQbFdscM7KQa8QEcqC8LnPtkgJEAXmoWf13FQNR4HQb3vjz1fkAvuRagmE6Dfgt4nVXv5ku2jkj8aR8irPg2wa33VhNi8NT5m7QJjsFeaUpKQpsUwMdk9UWjCdSS9gy6yrsRaLUVLcRvhqteuy72N4tAFWaCdF2YJsHYAwJdnML1x9gM3hMo7yzskmrY9RwkmeeuXGV9GJoEFUTsXWk12mDea2E1f7FJBYgnJp8Vp5ve1HVtZVzum#encryption",
          "senderKeyUri": "did:kilt:light:004rn1Xps9QSMiAb2aMoKQbAred94wh1iLjGmNBYy1FVCS81ry:z147wqPsQV7GGKBxQGmTMeDTTVP41uiX9BXTq4uqLWGHgTe9Vx2hK81GGQvXGRee5m2EiEqd1fSMzDpgNEFEUNHEBAGsTd8bqDWPhapBetBQ8wAtG7wHj1XwCswvSNp79Sg6NMuwKs2oco4fnHK85cKvmkMnArR3kbHPjAfqeg9wdQ2VtPN3DkjzLgsMbjHH7G9BJCBMRKtJJMuSBs3BWagzY2QCGGC54k5XN3XWiF1QCMG2edoyvShyxhVNyay7PwGg2y5xCK4d6Dg4g2ucq5iidDppobcUFCU7rXqVnrHsALjwe6S4gnF6cC5ZrkkpHxLw94fXV#encryption",
        }
      `)
    })
    it('does not break for all message types', () => {
      const message: MessageBody = {
        type: MessageBodyType.REQUEST_TERMS,
        content: {
          cTypeHash: '0x1234',
        },
      }
      expect(message).toMatchInlineSnapshot(`
        Object {
          "content": Object {
            "cTypeHash": "0x1234",
          },
          "type": "request-terms",
        }
      `)

      // TODO: test the credenntial in general
    })
  })
})
