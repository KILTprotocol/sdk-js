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
  DidDocument,
  DidKey,
  DidResourceUri,
  Message,
  MessageBody,
  ResolvedDidKey,
  Utils,
} from '@kiltprotocol/sdk-js'
import nacl from 'tweetnacl'
import { makeEncryptionKeyTool } from './TestUtils'

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
  ): Promise<ResolvedDidKey | null> {
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

      // Mock Date object for message.createdAt property
      jest.useFakeTimers().setSystemTime(1657727664899)

      // Mock UUID.generate for message.id property
      jest
        .spyOn(Utils.UUID, 'generate')
        .mockReturnValue(
          '0x072678802b3e7807fbec86cc93328d52de76e0249011918d4f96835fa0923b8e'
        )

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

      expect(message).toMatchInlineSnapshot(`
        Object {
          "body": Object {
            "content": Object {
              "cTypeHash": "0x1234",
            },
            "type": "request-terms",
          },
          "createdAt": 1657727664899,
          "messageId": "0x072678802b3e7807fbec86cc93328d52de76e0249011918d4f96835fa0923b8e",
          "receiver": "did:kilt:light:004rzcHqKvv6TbsA46VpG53JrvdzRr6ccyboUNeCGTvDw2AozU:z147wqPsQV7GGKBxQGmTMeDTTVPBvZ1AdEf99W5vCASMxUTrTY233fstS4x3nkmngDgoWfHq8ej5AfRsoAQczQbFdscM7KQa8QEcqC8LnPtkgJEAXmoWf13FQNR4HQb3vjz1fkAvuRagmE6Dfgt4nVXv5ku2jkj8aR8irPg2wa33VhNi8NT5m7QJjsFeaUpKQpsUwMdk9UWjCdSS9gy6yrsRaLUVLcRvhqteuy72N4tAFWaCdF2YJsHYAwJdnML1x9gM3hMo7yzskmrY9RwkmeeuXGV9GJoEFUTsXWk12mDea2E1f7FJBYgnJp8Vp5ve1HVtZVzum",
          "sender": "did:kilt:light:004rn1Xps9QSMiAb2aMoKQbAred94wh1iLjGmNBYy1FVCS81ry:z147wqPsQV7GGKBxQGmTMeDTTVP41uiX9BXTq4uqLWGHgTe9Vx2hK81GGQvXGRee5m2EiEqd1fSMzDpgNEFEUNHEBAGsTd8bqDWPhapBetBQ8wAtG7wHj1XwCswvSNp79Sg6NMuwKs2oco4fnHK85cKvmkMnArR3kbHPjAfqeg9wdQ2VtPN3DkjzLgsMbjHH7G9BJCBMRKtJJMuSBs3BWagzY2QCGGC54k5XN3XWiF1QCMG2edoyvShyxhVNyay7PwGg2y5xCK4d6Dg4g2ucq5iidDppobcUFCU7rXqVnrHsALjwe6S4gnF6cC5ZrkkpHxLw94fXV",
        }
      `)

      const encrypted = await Message.encrypt(
        message,
        encrypt(aliceDid),
        `${bobDid.uri}#encryption`,
        {
          resolveKey: makeResolveKey(bobDid),
        }
      )

      expect(encrypted).toMatchInlineSnapshot(`
        Object {
          "ciphertext": "0x62a1b62183259d33d1fdc35293843b15a4f2d914786050424594c89f07ccbc2f643df95ba030281079a92215c66d76a74b39e6013cb8a5e1459a6853fdbfb522bff1295cbf9e5e2d6947de5974dafe6de32e6d42e2c349f07b5bb934a504d0a227d502e920cadfae44869ed041d86916cee71e0619650f15a1a04f27751f0839e8f3c629d626a54f489c4170b3ffefe118039925124acba91c097bf4d8c582f26c8a3b0f1dba93bf8da6b8f2a2a4303ac529c7028aec026f6baee8eab6fa3194e52cd6c0ce5f7f5d5b906dba5cb98b8365dd6757aa299ff92ff83657931b0eb81b0af191643e832f72faa2b092f287adac41985aa162d00478ec540f034de7f3cfc1c25d2d67a6e35c9f1478eb90d16b2172627b7d9c5baccfa91cd334a83f6dc3b6c8147c1ad48e67c0561ca4e611f62e12e4db9f0eaf6c3bad1154853b080973d148a36089cbaf4ed0d9f79366346ed150e0aef647b7817381ac2fab579cd987a095dc89aaf774490f2772d8531b7ad8005892fc20ce8333fb4d3b1b69397c333cce7961f0a9a004939cf6021f5e404859c26b3a217e099c17008b805147c3b447201a0bee2d71279a347bd7fcc9c34450cfc16510a1b95239afbaa6a2795945777f265bb43d30134d6631934d311030233c73c4475d27b15acdadc22e34339080ae8e1f3c0569fe026569901f88dfef75227b338d6d37877c784e18c51eba5809967f99efe58bb703c9c3dc988dd1f514c408e96d88a3ad384c18964963d7aafc1a82af79c0c67be6bef4218c7b5a965d3a2e18fea0824eb9c6c3fae99f70ad7f2932920e112cecf23357b5e3c1ff48c60fe578599afe16389301f24e7198e41858f8e998d8a3c3bd1957e719d0dd37c3587aa4d989fd9a2bdc7d374c9a747c74d1811f64cf0d7bb93754927e78da5794a083bd5978ebb013346c7d59dc9232a0a64874f2ea9339b367d58c7b8567e25f2a9abffac3f5281b8cc2fc063a61caa37ca8ed2f87d2d564dbbcc1a7c524863a2dcfa77c3b1c457de8f57f9d8644421886d91c304aec587c6f30a911eb078670227bb986da8b2947af44416cef6bdba5307bcfb241cd6a3b388d09a856ec70c5d7aba98c6e2e3291a289e4b0834939b1e1954327f0d747ea846c9bc53f4f925b64cc27a6f21c3f91b979694d9d8453bd4dbe00f94ca36014e168bbbf52b66a2aa7948623b8e74f29083e9b6590d4ec42f41ffb04a552847ab72b7301fcb28634e4cc384e14542a96f441035ffe5cb15f09d358b1b7da95192c698af1414cc14a651da135665c764498e8616a816998c657a6a1435f15736822f48546d7925bdc8672b65e0b0a9dc92b9f1b8a348e509baf26171f456c2a3b0369e3a15ca50410e6bdb1bafff7b404156c52cc9713513272157eb1c0c40088cf670a",
          "nonce": "0x2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a",
          "receivedAt": undefined,
          "receiverKeyUri": "did:kilt:light:004rzcHqKvv6TbsA46VpG53JrvdzRr6ccyboUNeCGTvDw2AozU:z147wqPsQV7GGKBxQGmTMeDTTVPBvZ1AdEf99W5vCASMxUTrTY233fstS4x3nkmngDgoWfHq8ej5AfRsoAQczQbFdscM7KQa8QEcqC8LnPtkgJEAXmoWf13FQNR4HQb3vjz1fkAvuRagmE6Dfgt4nVXv5ku2jkj8aR8irPg2wa33VhNi8NT5m7QJjsFeaUpKQpsUwMdk9UWjCdSS9gy6yrsRaLUVLcRvhqteuy72N4tAFWaCdF2YJsHYAwJdnML1x9gM3hMo7yzskmrY9RwkmeeuXGV9GJoEFUTsXWk12mDea2E1f7FJBYgnJp8Vp5ve1HVtZVzum#encryption",
          "senderKeyUri": "did:kilt:light:004rn1Xps9QSMiAb2aMoKQbAred94wh1iLjGmNBYy1FVCS81ry:z147wqPsQV7GGKBxQGmTMeDTTVP41uiX9BXTq4uqLWGHgTe9Vx2hK81GGQvXGRee5m2EiEqd1fSMzDpgNEFEUNHEBAGsTd8bqDWPhapBetBQ8wAtG7wHj1XwCswvSNp79Sg6NMuwKs2oco4fnHK85cKvmkMnArR3kbHPjAfqeg9wdQ2VtPN3DkjzLgsMbjHH7G9BJCBMRKtJJMuSBs3BWagzY2QCGGC54k5XN3XWiF1QCMG2edoyvShyxhVNyay7PwGg2y5xCK4d6Dg4g2ucq5iidDppobcUFCU7rXqVnrHsALjwe6S4gnF6cC5ZrkkpHxLw94fXV#encryption",
        }
      `)
    })
    it('does not break for all message types', () => {
      const message: MessageBody = {
        type: 'request-terms',
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
