/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group unit/messaging
 */

import { u8aToHex } from '@polkadot/util'

import type {
  DidKey,
  DidPublicKey,
  DidResolvedDetails,
  ICredential,
  IDidDetails,
  IDidResolver,
  IEncryptedMessage,
  IQuote,
  IRequestAttestation,
  ISubmitAttestation,
  ISubmitCredential,
  ResolvedDidKey,
  ResolvedDidServiceEndpoint,
} from '@kiltprotocol/types'
import { Quote, RequestForAttestation } from '@kiltprotocol/core'
import {
  DemoKeystore,
  LightDidDetails,
  DidUtils,
  EncryptionAlgorithms,
  SigningAlgorithms,
} from '@kiltprotocol/did'
import { Crypto, SDKErrors } from '@kiltprotocol/utils'

import { Message } from './Message'

// The mock resolver returns null for any full DID, marking all light DID as unmigrated, since we can test encryption with light DIDs as well.
const resolveDoc = async (
  did: IDidDetails['did']
): Promise<DidResolvedDetails | null> => {
  const { type } = DidUtils.parseDidUri(did)
  if (type === 'full') {
    return null
  }
  return {
    metadata: {
      deactivated: false,
    },
    details: LightDidDetails.fromUri(did, false),
  }
}
const resolveKey = async (
  did: DidPublicKey['id']
): Promise<ResolvedDidKey | null> => {
  const { fragment } = DidUtils.parseDidUri(did)
  const { details } = (await resolveDoc(did)) as DidResolvedDetails
  const key = details?.getKey(fragment!) as DidKey
  return {
    controller: details!.did,
    id: did,
    publicKey: key.publicKey,
    type: key.type,
  }
}

export async function generateAliceDid(
  keystore: DemoKeystore
): Promise<LightDidDetails> {
  const authKeyAlice = await keystore.generateKeypair({
    alg: SigningAlgorithms.Ed25519,
    seed: 'alice',
  })
  const encKeyAlice = await keystore.generateKeypair({
    alg: EncryptionAlgorithms.NaclBox,
    seed: u8aToHex(new Uint8Array(32).fill(150)),
  })

  return LightDidDetails.fromDetails({
    authenticationKey: {
      publicKey: authKeyAlice.publicKey,
      type: authKeyAlice.alg,
    },
    encryptionKey: {
      publicKey: encKeyAlice.publicKey,
      type: 'x25519',
    },
  })
}

export async function generateBobDid(
  keystore: DemoKeystore
): Promise<LightDidDetails> {
  const authKeyBob = await keystore.generateKeypair({
    alg: SigningAlgorithms.Ed25519,
    seed: 'alice',
  })
  const encKeyBob = await keystore.generateKeypair({
    alg: EncryptionAlgorithms.NaclBox,
    seed: u8aToHex(new Uint8Array(32).fill(250)),
  })

  return LightDidDetails.fromDetails({
    authenticationKey: {
      publicKey: authKeyBob.publicKey,
      type: authKeyBob.alg,
    },
    encryptionKey: {
      publicKey: encKeyBob.publicKey,
      type: 'x25519',
    },
  })
}

let keystore: DemoKeystore

beforeEach(async () => {
  keystore = new DemoKeystore()
})

describe('Messaging', () => {
  const mockResolver = {
    resolveDoc,
    resolveKey,
    resolve: async (
      didUri: string
    ): Promise<
      DidResolvedDetails | ResolvedDidKey | ResolvedDidServiceEndpoint | null
    > => {
      return (await resolveKey(didUri)) || resolveDoc(didUri)
    },
  } as IDidResolver

  it('verify message encryption and signing', async () => {
    const aliceDid: LightDidDetails = await generateAliceDid(keystore)
    const bobDid: LightDidDetails = await generateBobDid(keystore)
    const message = new Message(
      {
        type: Message.BodyType.REQUEST_CREDENTIAL,
        content: {
          cTypes: [{ cTypeHash: `kilt:ctype:${Crypto.hashStr('0x12345678')}` }],
        },
      },
      aliceDid.did,
      bobDid.did
    )
    const encryptedMessage = await message.encrypt('encryption', aliceDid, {
      keystore,
      receiverKeyId: `${bobDid.did}#encryption`,
      resolver: mockResolver,
    })

    const decryptedMessage = await Message.decrypt(encryptedMessage, {
      keystore,
      receiverDetails: bobDid,
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
      Message.decrypt(encryptedMessageWrongContent, {
        keystore,
        receiverDetails: bobDid,
        resolver: mockResolver,
      })
    ).rejects.toThrowError(SDKErrors.ERROR_DECODING_MESSAGE())

    const encryptedWrongBody = await keystore.encrypt({
      alg: 'x25519-xsalsa20-poly1305',
      data: Crypto.coToUInt8('{ wrong JSON'),
      publicKey: aliceDid.encryptionKey!.publicKey,
      peerPublicKey: bobDid.encryptionKey!.publicKey,
    })
    const encryptedMessageWrongBody: IEncryptedMessage = {
      ciphertext: Crypto.u8aToHex(encryptedWrongBody.data),
      nonce: Crypto.u8aToHex(encryptedWrongBody.nonce),
      senderKeyId: aliceDid.assembleKeyId(aliceDid.encryptionKey!.id),
      receiverKeyId: bobDid.assembleKeyId(bobDid.encryptionKey!.id),
    }
    await expect(() =>
      Message.decrypt(encryptedMessageWrongBody, {
        keystore,
        receiverDetails: bobDid,
        resolver: mockResolver,
      })
    ).rejects.toThrowError(SDKErrors.ERROR_PARSING_MESSAGE())
  })

  it('verifies the message sender is the owner', async () => {
    const aliceDid: LightDidDetails = await generateAliceDid(keystore)
    const bobDid: LightDidDetails = await generateBobDid(keystore)

    const content = RequestForAttestation.fromClaim({
      cTypeHash: `kilt:ctype:${Crypto.hashStr('0x12345678')}`,
      owner: aliceDid.did,
      contents: {},
    })
    const date: string = new Date(2019, 11, 10).toISOString()

    const quoteData: IQuote = {
      attesterDid: aliceDid.did,
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
      aliceDid,
      {
        signer: keystore,
      }
    )
    const bothSigned = await Quote.createQuoteAgreement(
      quoteAttesterSigned,
      content.rootHash,
      aliceDid.did,
      bobDid,
      {
        signer: keystore,
        resolver: mockResolver,
      }
    )
    const requestAttestationBody: IRequestAttestation = {
      content: {
        requestForAttestation: content,
        quote: bothSigned,
      },
      type: Message.BodyType.REQUEST_ATTESTATION,
    }

    Message.ensureOwnerIsSender(
      new Message(requestAttestationBody, aliceDid.did, bobDid.did)
    )
    expect(() =>
      Message.ensureOwnerIsSender(
        new Message(requestAttestationBody, bobDid.did, aliceDid.did)
      )
    ).toThrowError(SDKErrors.ERROR_IDENTITY_MISMATCH('Claim', 'Sender'))

    const attestation = {
      delegationId: null,
      claimHash: requestAttestationBody.content.requestForAttestation.rootHash,
      cTypeHash: `kilt:ctype:${Crypto.hashStr('0x12345678')}`,
      owner: bobDid.did,
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
        new Message(submitAttestationBody, aliceDid.did, bobDid.did)
      )
    ).toThrowError(SDKErrors.ERROR_IDENTITY_MISMATCH('Attestation', 'Sender'))
    Message.ensureOwnerIsSender(
      new Message(submitAttestationBody, bobDid.did, aliceDid.did)
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
      new Message(submitClaimsForCTypeBody, aliceDid.did, bobDid.did)
    )
    expect(() =>
      Message.ensureOwnerIsSender(
        new Message(submitClaimsForCTypeBody, bobDid.did, aliceDid.did)
      )
    ).toThrowError(SDKErrors.ERROR_IDENTITY_MISMATCH('Claims', 'Sender'))
  })
})
