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
          "receiver": "did:kilt:light:004rzcHqKvv6TbsA46VpG53JrvdzRr6ccyboUNeCGTvDw2AozU:z1msTRicERqs59nwMvp3yzMRBhQhYShb1vEhbpWo5ZbqVAgi2UFELJk7MbUSeEfBdAVsJhdqcEAhXxH4YrV5nwgTYjFYszWKLFnYvSUhgZ7teDiLt1FbAo484ihnagUKQkE46o3fqSv52WgM6VatrEqetD3ekokxFtz4yn2vFYPdDMPmKE3cVxdKqPMa3Ewh6k46SENeEDZFLg1L8Yi73ZVEA9AwDg2RDuBDnpjetxBC6U5qMKVfqbh1rjgxpubpSj6sppHDq8xZ4LDU2bs1a9g6qcWJjkrtS69t3PTFZv5Ey84epnvbXEm8hsVnzTKsY6LbQmCiVqwKWUPUwXpj83",
          "sender": "did:kilt:light:004rn1Xps9QSMiAb2aMoKQbAred94wh1iLjGmNBYy1FVCS81ry:z1msTRicERqs59nwMvp3yzMRBhRatQoZZaiSZfyN7TzqeEs1bHHTCH3RURC6zWk5B8HXGZThZos9PJFJrkiYchNGbAGQRKSKucBVDVoXBLDyEm4P1dsco9wyoaWa5kkFw6DZgnKrTJg8Y8iCy7k2yo8GeMXAuR8qoBFFXj7Up7DxKJrMoQudvFHTy2uk2HPNfqkzJX17Wqsny1MKHD82eC3TcjrGCkhMZy3NmzkySmLsDmmHnG2csZ5vvefFRFZ1hSKfUtcV8EnLd3zozsiZByaLrED2XVbuHqPVzqcnrCJF8fSm49NcGDgsQkwnQwbuKfMkov9WwJoxhDSYG6e7WP",
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
          "ciphertext": "0xa8a6570bc0e376376d5286c539b4f6e4a4f2d914786050424594c89f07ccbc2f643df95ba030281079a92215c66d76a74b39e6013cb8a5e1459a6853fdbfb522bff1295cbf9e5e2d6947de5974dafe6de32e6d42e2c349f07b5bb934a504d0a227d502e920cadfae44869ed041d86916cee71e0619650f15a1a04f27751f0839e8f3c629d626a54f489c4170b3ffefe118039925124acba91c097bf4d8c582f26c8a3b0f1dba93bf8da6b8f2a2a4303ac529c7028aec026f6baeb1ae95d90884f12890f4bc2d535247a170dd68a6828573e36502ef0d99fb4cdb0750b84902876009cca8662f952746cad88c9a8285b8be42ad349c67de540fb92e122d52c2ffa4c8e229076990ce60b13b64ddb6d769017262597bb33085cb8e09d5189f2077e48ece3c0100a1aa11935237a1ee3ef80200c4ccf92bb41d75c83238ac18360c6ce81df45ade968a59aff9fddf6a475fd976f581c267ddc377a1a239997ccdfd92f0e8d3a6b1b76f520e1c25ea7e3954ed555eb4ac02d68562cd1f031b724a063606c95d528c91b80ea49786303d0a6e7201e16f3e0d5571f205069da31874ed8e6c5d380cce070b2cb96961d2f594cc4a5dffc94e3782bf6a1da3bbc1af2f773e79250e09c3206b0e0c7a08a001393526220831f3735c07bf68c8ccca07260b8cb1acbb66163c73af0d783eb035a99add5d604f10916432846279524e8741b57961d52583ced5b79943c986a9f28d99be029b00e5688afcb3731152861a37ddf5e70c95dd64e2d765a4d0a662f93d16a3650c505dc2e4a048b0d585fadc8c4efa23360e81292c2ae88027068deed4ff3cd97d961b58afd95728aa4ce03340ebf13a4bc7d4b6f8b5e69a7a3ecb18c79a06946466d0b29ca0bd00c47d1256fe564b48eac37b389c246d9b556dc67921e27fb6a8aeb93953c1947834432e5ade8117bcad7173f9d8b43ebf4cce89789744d55215a8bbdfd9a7222cafccc02a3c62e5a26794ef21d1bba441f0aa9ca3e077f32e06daa22264345b66dbf34dbb9219434ad7c21b386de7587c3612fc36b63bdf650206a191fea82855a5181942c151c8a90741c8a930c570350f863ca448d908f7f1a098b0521a14c9c49bf99bd1715ebed5a93b3bc7e04fcd845efcc564448d0426e21496ca124ca8c96a1a598e90529d65fc33d64b937b16a077eaa052b10d34ef91a321a2c0476601318a7eaecc8308d618d82db10f8978c4310e1384bfb043d0a12c20325c4ceef36e144a9f2fb94d0dc546b5b4cbce162569e8e40454d219750eb85758555547c0900874bd2ca7c561aeab4e2b5e26130d91e22196fd138e8e73f6414c50c08a6f981e8a1ed244c2ee2f5c1c406678390935b6a408f35115eab4b6edacabe604473b57cc9218503f70417cec97c054d59a7743a3682345644961dfd6a17ad5a27f5d09e955c9789f0783ece8b3",
          "nonce": "0x2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a",
          "receivedAt": undefined,
          "receiverKeyUri": "did:kilt:light:004rzcHqKvv6TbsA46VpG53JrvdzRr6ccyboUNeCGTvDw2AozU:z1msTRicERqs59nwMvp3yzMRBhQhYShb1vEhbpWo5ZbqVAgi2UFELJk7MbUSeEfBdAVsJhdqcEAhXxH4YrV5nwgTYjFYszWKLFnYvSUhgZ7teDiLt1FbAo484ihnagUKQkE46o3fqSv52WgM6VatrEqetD3ekokxFtz4yn2vFYPdDMPmKE3cVxdKqPMa3Ewh6k46SENeEDZFLg1L8Yi73ZVEA9AwDg2RDuBDnpjetxBC6U5qMKVfqbh1rjgxpubpSj6sppHDq8xZ4LDU2bs1a9g6qcWJjkrtS69t3PTFZv5Ey84epnvbXEm8hsVnzTKsY6LbQmCiVqwKWUPUwXpj83#encryption",
          "senderKeyUri": "did:kilt:light:004rn1Xps9QSMiAb2aMoKQbAred94wh1iLjGmNBYy1FVCS81ry:z1msTRicERqs59nwMvp3yzMRBhRatQoZZaiSZfyN7TzqeEs1bHHTCH3RURC6zWk5B8HXGZThZos9PJFJrkiYchNGbAGQRKSKucBVDVoXBLDyEm4P1dsco9wyoaWa5kkFw6DZgnKrTJg8Y8iCy7k2yo8GeMXAuR8qoBFFXj7Up7DxKJrMoQudvFHTy2uk2HPNfqkzJX17Wqsny1MKHD82eC3TcjrGCkhMZy3NmzkySmLsDmmHnG2csZ5vvefFRFZ1hSKfUtcV8EnLd3zozsiZByaLrED2XVbuHqPVzqcnrCJF8fSm49NcGDgsQkwnQwbuKfMkov9WwJoxhDSYG6e7WP#encryption",
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
