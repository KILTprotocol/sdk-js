/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group unit/messaging
 */

import type {
  ICredential,
  IEncryptedMessage,
  IQuote,
  IDidResolvedDetails,
  IDidKeyDetails,
  IRequestAttestation,
  ISubmitAttestation,
  ISubmitCredential,
  IDidDetails,
  IDidResolver,
} from '@kiltprotocol/types'
import { KeyRelationship } from '@kiltprotocol/types'

import { Crypto, SDKErrors } from '@kiltprotocol/utils'
import { Quote, RequestForAttestation } from '@kiltprotocol/core'
import { createLocalDemoDidFromSeed, DemoKeystore } from '@kiltprotocol/did'
import { Message } from './Message'

describe('Messaging', () => {
  let mockResolver: IDidResolver
  let keystore: DemoKeystore
  let identityAlice: IDidDetails
  let identityBob: IDidDetails
  let date: string

  beforeAll(async () => {
    date = new Date(2019, 11, 10).toISOString()
    keystore = new DemoKeystore()
    identityAlice = await createLocalDemoDidFromSeed(keystore, '//Alice')
    identityBob = await createLocalDemoDidFromSeed(keystore, '//Bob')

    const resolveDoc = async (
      did: string
    ): Promise<IDidResolvedDetails | null> => {
      if (did.startsWith(identityAlice.did)) {
        return { details: identityAlice }
      }
      if (did.startsWith(identityBob.did)) {
        return { details: identityBob }
      }
      return null
    }
    const resolveKey = async (did: string): Promise<IDidKeyDetails | null> => {
      const details = await resolveDoc(did)
      return details?.details.getKey(did) || null
    }
    mockResolver = {
      resolve: async (did) => {
        return (await resolveKey(did)) || resolveDoc(did)
      },
      resolveKey,
      resolveDoc,
    } as IDidResolver
  })

  it('verify message encryption and signing', async () => {
    const message = new Message(
      {
        type: Message.BodyType.REQUEST_CREDENTIAL,
        content: {
          cTypes: [{ cTypeHash: `kilt:ctype:${Crypto.hashStr('0x12345678')}` }],
        },
      },
      identityAlice.did,
      identityBob.did
    )
    const encryptedMessage = await message.encrypt(
      identityAlice.getKeys(KeyRelationship.keyAgreement)[0],
      identityBob.getKeys(KeyRelationship.keyAgreement)[0],
      keystore
    )

    const decryptedMessage = await Message.decrypt(encryptedMessage, keystore, {
      resolver: mockResolver,
    })
    expect(JSON.stringify(message.body)).toEqual(
      JSON.stringify(decryptedMessage.body)
    )

    const encryptedMessageWrongContent: IEncryptedMessage = JSON.parse(
      JSON.stringify(encryptedMessage)
    ) as IEncryptedMessage
    const messedUpContent = Crypto.coToUInt8(
      encryptedMessageWrongContent.ciphertext
    )
    messedUpContent.set(Crypto.hash('1234'), 10)
    encryptedMessageWrongContent.ciphertext = Crypto.u8aToHex(messedUpContent)

    await expect(() =>
      Message.decrypt(encryptedMessageWrongContent, keystore, {
        resolver: mockResolver,
      })
    ).rejects.toThrowError(SDKErrors.ERROR_DECODING_MESSAGE())

    const encryptedWrongBody = await keystore.encrypt({
      alg: 'x25519-xsalsa20-poly1305',
      data: Crypto.coToUInt8('{ wrong JSON'),
      publicKey: Crypto.coToUInt8(
        identityAlice.getKeys(KeyRelationship.keyAgreement)[0].publicKeyHex
      ),
      peerPublicKey: Crypto.coToUInt8(
        identityBob.getKeys(KeyRelationship.keyAgreement)[0].publicKeyHex
      ),
    })
    const encryptedMessageWrongBody: IEncryptedMessage = {
      ciphertext: Crypto.u8aToHex(encryptedWrongBody.data),
      nonce: Crypto.u8aToHex(encryptedWrongBody.nonce),
      senderKeyId: identityAlice.getKeys(KeyRelationship.keyAgreement)[0].id,
      receiverKeyId: identityBob.getKeys(KeyRelationship.keyAgreement)[0].id,
    }
    await expect(() =>
      Message.decrypt(encryptedMessageWrongBody, keystore, {
        resolver: mockResolver,
      })
    ).rejects.toThrowError(SDKErrors.ERROR_PARSING_MESSAGE())
  })

  it('verifies the sender is the sender key owner', async () => {
    const wrongSender = `did:kilt:${Crypto.encodeAddress(
      new Uint8Array(32),
      38
    )}`

    const message = new Message(
      {
        type: Message.BodyType.REQUEST_CREDENTIAL,
        content: {
          cTypes: [{ cTypeHash: `kilt:ctype:${Crypto.hashStr('0x12345678')}` }],
        },
      },
      wrongSender,
      identityBob.did
    )

    const forgedAliceKey = {
      ...identityAlice.getKeys(KeyRelationship.keyAgreement)[0],
    }
    forgedAliceKey.controller = wrongSender

    const encryptedMessage = await message.encrypt(
      forgedAliceKey,
      identityBob.getKeys(KeyRelationship.keyAgreement)[0],
      keystore
    )
    await expect(
      Message.decrypt(encryptedMessage, keystore, {
        resolver: mockResolver,
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"Error parsing message body"`)
  })

  it('verifies the message sender is the owner', async () => {
    const content = RequestForAttestation.fromClaim({
      cTypeHash: `kilt:ctype:${Crypto.hashStr('0x12345678')}`,
      owner: identityAlice.did,
      contents: {},
    })

    const quoteData: IQuote = {
      attesterDid: identityAlice.did,
      cTypeHash: `kilt:ctype:${Crypto.hashStr('0x12345678')}`,
      cost: {
        tax: { vat: 3.3 },
        net: 23.4,
        gross: 23.5,
      },
      currency: 'Euro',
      termsAndConditions: 'https://coolcompany.io/terms.pdf',
      timeframe: date,
    }
    const quoteAttesterSigned = await Quote.createAttesterSignature(
      quoteData,
      identityAlice,
      keystore
    )
    const bothSigned = await Quote.createQuoteAgreement(
      quoteAttesterSigned,
      content.rootHash,
      identityAlice.did,
      identityBob,
      keystore,
      mockResolver
    )
    const requestAttestationBody: IRequestAttestation = {
      content: {
        requestForAttestation: content,
        quote: bothSigned,
      },
      type: Message.BodyType.REQUEST_ATTESTATION,
    }

    Message.ensureOwnerIsSender(
      new Message(requestAttestationBody, identityAlice.did, identityBob.did)
    )
    expect(() =>
      Message.ensureOwnerIsSender(
        new Message(requestAttestationBody, identityBob.did, identityAlice.did)
      )
    ).toThrowError(SDKErrors.ERROR_IDENTITY_MISMATCH('Claim', 'Sender'))

    const attestation = {
      delegationId: null,
      claimHash: requestAttestationBody.content.requestForAttestation.rootHash,
      cTypeHash: `kilt:ctype:${Crypto.hashStr('0x12345678')}`,
      owner: identityBob.did,
      revoked: false,
    }

    const submitAttestationBody: ISubmitAttestation = {
      content: {
        attestation,
      },
      type: Message.BodyType.SUBMIT_ATTESTATION,
    }
    expect(() =>
      Message.ensureOwnerIsSender(
        new Message(submitAttestationBody, identityAlice.did, identityBob.did)
      )
    ).toThrowError(SDKErrors.ERROR_IDENTITY_MISMATCH('Attestation', 'Sender'))
    Message.ensureOwnerIsSender(
      new Message(submitAttestationBody, identityBob.did, identityAlice.did)
    )

    const credential: ICredential = {
      request: content,
      attestation: submitAttestationBody.content.attestation,
    }

    const submitClaimsForCTypeBody: ISubmitCredential = {
      content: [credential],
      type: Message.BodyType.SUBMIT_CREDENTIAL,
    }

    Message.ensureOwnerIsSender(
      new Message(submitClaimsForCTypeBody, identityAlice.did, identityBob.did)
    )
    expect(() =>
      Message.ensureOwnerIsSender(
        new Message(
          submitClaimsForCTypeBody,
          identityBob.did,
          identityAlice.did
        )
      )
    ).toThrowError(SDKErrors.ERROR_IDENTITY_MISMATCH('Claims', 'Sender'))
  })
})
