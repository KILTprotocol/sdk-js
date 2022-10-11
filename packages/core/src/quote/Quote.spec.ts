/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group unit/quote
 */

import { u8aToHex } from '@polkadot/util'

import type {
  DidDocument,
  IClaim,
  ICostBreakdown,
  ICType,
  IQuote,
  IQuoteAgreement,
  IQuoteAttesterSigned,
  ICredential,
  DidResourceUri,
  ResolvedDidKey,
} from '@kiltprotocol/types'
import { Crypto } from '@kiltprotocol/utils'
import * as Did from '@kiltprotocol/did'
import {
  createLocalDemoFullDidFromKeypair,
  makeDidSignature,
  makeSigningKeyTool,
} from '@kiltprotocol/testing'
import * as CType from '../ctype'
import * as Credential from '../credential'
import * as Quote from './Quote'
import { QuoteSchema } from './QuoteSchema'

describe('Quote', () => {
  let claimerIdentity: DidDocument
  const claimer = makeSigningKeyTool('ed25519')

  let attesterIdentity: DidDocument
  const attester = makeSigningKeyTool('ed25519')

  let invalidCost: ICostBreakdown
  let date: string
  let cTypeSchema: ICType['schema']
  let testCType: ICType
  let claim: IClaim
  let credential: ICredential
  let invalidCostQuoteData: IQuote
  let invalidPropertiesQuoteData: IQuote
  let validQuoteData: IQuote
  let validAttesterSignedQuote: IQuoteAttesterSigned
  let quoteBothAgreed: IQuoteAgreement
  let invalidPropertiesQuote: IQuote
  let invalidCostQuote: IQuote

  async function mockResolveKey(
    keyUri: DidResourceUri
  ): Promise<ResolvedDidKey> {
    const { did } = Did.parse(keyUri)
    const document = [claimerIdentity, attesterIdentity].find(
      ({ uri }) => uri === did
    )
    if (!document) throw new Error('Cannot resolve mocked DID')
    return Did.keyToResolvedKey(document.authentication[0], did)
  }

  beforeAll(async () => {
    claimerIdentity = await createLocalDemoFullDidFromKeypair(claimer.keypair)

    attesterIdentity = await createLocalDemoFullDidFromKeypair(attester.keypair)

    invalidCost = {
      gross: 233,
      tax: { vat: 3.3 },
    } as unknown as ICostBreakdown
    date = new Date(2019, 11, 10).toISOString()

    cTypeSchema = {
      $id: 'kilt:ctype:0x1',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
      title: 'Quote Information',
      properties: {
        name: { type: 'string' },
      },
      type: 'object',
    }

    testCType = CType.fromSchema(cTypeSchema)

    claim = {
      cTypeHash: testCType.hash,
      contents: {},
      owner: claimerIdentity.uri,
    }

    // build credential with legitimations
    credential = Credential.fromClaim(claim)

    // @ts-ignore
    invalidCostQuoteData = {
      cTypeHash: '0x12345678',
      cost: invalidCost,
      currency: 'Euro',
      timeframe: date,
      termsAndConditions: 'Lots of these',
    } as IQuote

    invalidPropertiesQuoteData = {
      cTypeHash: '0x12345678',
      cost: {
        gross: 233,
        net: 23.3,
        tax: { vat: 3.3 },
      },
      timeframe: date,
      currency: 'Euro',
      termsAndConditions: 'Lots of these',
    } as unknown as IQuote

    validQuoteData = {
      attesterDid: attesterIdentity.uri,
      cTypeHash: '0x12345678',
      cost: {
        gross: 233,
        net: 23.3,
        tax: { vat: 3.3 },
      },
      currency: 'Euro',
      timeframe: new Date('12-04-2020').toISOString(),
      termsAndConditions: 'Lots of these',
    }
    validAttesterSignedQuote = await Quote.createAttesterSignedQuote(
      validQuoteData,
      attester.getSignCallback(attesterIdentity)
    )
    quoteBothAgreed = await Quote.createQuoteAgreement(
      validAttesterSignedQuote,
      credential.rootHash,
      claimer.getSignCallback(claimerIdentity),
      claimerIdentity.uri,
      {
        didResolveKey: mockResolveKey,
      }
    )
    invalidPropertiesQuote = invalidPropertiesQuoteData
    invalidCostQuote = invalidCostQuoteData
  })

  it('tests created quote data against given data', async () => {
    expect(validQuoteData.attesterDid).toEqual(attesterIdentity.uri)
    const signature = await makeDidSignature(
      Crypto.hashStr(Crypto.encodeObjectAsStr(validAttesterSignedQuote)),
      claimerIdentity.uri,
      claimer.getSignCallback(claimerIdentity)
    )
    expect(signature).toEqual(quoteBothAgreed.claimerSignature)

    const { fragment: attesterKeyId } = Did.parse(
      validAttesterSignedQuote.attesterSignature.keyUri
    )

    expect(() =>
      Crypto.verify(
        Crypto.hashStr(
          Crypto.encodeObjectAsStr({
            attesterDid: validQuoteData.attesterDid,
            cTypeHash: validQuoteData.cTypeHash,
            cost: validQuoteData.cost,
            currency: validQuoteData.currency,
            timeframe: validQuoteData.timeframe,
            termsAndConditions: validQuoteData.termsAndConditions,
          })
        ),
        validAttesterSignedQuote.attesterSignature.signature,
        u8aToHex(
          Did.getKey(attesterIdentity, attesterKeyId!)?.publicKey ||
            new Uint8Array()
        )
      )
    ).not.toThrow()
    await Quote.verifyAttesterSignedQuote(validAttesterSignedQuote, {
      didResolveKey: mockResolveKey,
    })
    expect(
      await Quote.createAttesterSignedQuote(
        validQuoteData,
        attester.getSignCallback(attesterIdentity)
      )
    ).toEqual(validAttesterSignedQuote)
  })
  it('validates created quotes against QuoteSchema', () => {
    expect(Quote.validateQuoteSchema(QuoteSchema, validQuoteData)).toBe(true)
    expect(Quote.validateQuoteSchema(QuoteSchema, invalidCostQuote)).toBe(false)
    expect(Quote.validateQuoteSchema(QuoteSchema, invalidPropertiesQuote)).toBe(
      false
    )
  })
})
