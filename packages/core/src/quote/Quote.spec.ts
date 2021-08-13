/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group unit/quote
 */

/* eslint-disable @typescript-eslint/ban-ts-comment */

import type {
  IClaim,
  ICType,
  CompressedQuote,
  CompressedQuoteAgreed,
  CompressedQuoteAttesterSigned,
  ICostBreakdown,
  IQuote,
  IQuoteAgreement,
  IQuoteAttesterSigned,
  IDidDetails,
} from '@kiltprotocol/types'
import { Crypto } from '@kiltprotocol/utils'
import {
  DemoKeystore,
  DidUtils,
  createLocalDemoDidFromSeed,
} from '@kiltprotocol/did'
import CType from '../ctype/CType'
import RequestForAttestation from '../requestforattestation/RequestForAttestation'
import * as Quote from './Quote'
import QuoteUtils from './Quote.utils'
import QuoteSchema from './QuoteSchema'

describe('Claim', () => {
  let claimerIdentity: IDidDetails
  let attesterIdentity: IDidDetails
  let keystore: DemoKeystore
  let invalidCost: ICostBreakdown
  let date: Date
  let cTypeSchema: ICType['schema']
  let testCType: ICType
  let claim: IClaim
  let request: RequestForAttestation
  let invalidCostQuoteData: IQuote
  let invalidPropertiesQuoteData: IQuote
  let validQuoteData: IQuote
  let validAttesterSignedQuote: IQuoteAttesterSigned
  let quoteBothAgreed: IQuoteAgreement
  let invalidPropertiesQuote: IQuote
  let invalidCostQuote: IQuote
  let compressedQuote: CompressedQuote
  let compressedResultAttesterSignedQuote: CompressedQuoteAttesterSigned
  let compressedResultQuoteAgreement: CompressedQuoteAgreed

  beforeAll(async () => {
    keystore = new DemoKeystore()

    claimerIdentity = await createLocalDemoDidFromSeed(
      keystore,
      '//Alice',
      'ed25519'
    )
    attesterIdentity = await createLocalDemoDidFromSeed(
      keystore,
      '//Bob',
      'ed25519'
    )

    invalidCost = ({
      gross: 233,
      tax: { vat: 3.3 },
    } as unknown) as ICostBreakdown
    date = new Date(2019, 11, 10)

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
      owner: claimerIdentity.did,
    }

    // build request for attestation with legitimations
    request = RequestForAttestation.fromClaim(claim)

    invalidCostQuoteData = {
      cTypeHash: '0x12345678',
      cost: invalidCost,
      currency: 'Euro',
      timeframe: date,
      termsAndConditions: 'Lots of these',
    } as IQuote

    invalidPropertiesQuoteData = ({
      cTypeHash: '0x12345678',
      cost: {
        gross: 233,
        net: 23.3,
        tax: { vat: 3.3 },
      },
      timeframe: date,
      currency: 'Euro',
      termsAndConditions: 'Lots of these',
    } as unknown) as IQuote

    validQuoteData = {
      attesterDid: attesterIdentity.did,
      cTypeHash: '0x12345678',
      cost: {
        gross: 233,
        net: 23.3,
        tax: { vat: 3.3 },
      },
      currency: 'Euro',
      timeframe: new Date('12-04-2020'),
      termsAndConditions: 'Lots of these',
    }
    validAttesterSignedQuote = await Quote.createAttesterSignature(
      validQuoteData,
      attesterIdentity,
      keystore
    )
    quoteBothAgreed = await Quote.createQuoteAgreement(
      validAttesterSignedQuote,
      request.rootHash,
      attesterIdentity,
      claimerIdentity,
      keystore
    )
    invalidPropertiesQuote = invalidPropertiesQuoteData
    invalidCostQuote = invalidCostQuoteData

    compressedQuote = [
      validQuoteData.attesterDid,
      validQuoteData.cTypeHash,
      [
        validQuoteData.cost.gross,
        validQuoteData.cost.net,
        validQuoteData.cost.tax,
      ],
      validQuoteData.currency,
      validQuoteData.termsAndConditions,
      validQuoteData.timeframe,
    ]

    compressedResultAttesterSignedQuote = [
      validQuoteData.attesterDid,
      validQuoteData.cTypeHash,
      [
        validQuoteData.cost.gross,
        validQuoteData.cost.net,
        validQuoteData.cost.tax,
      ],
      validQuoteData.currency,
      validQuoteData.termsAndConditions,
      validQuoteData.timeframe,
      [
        validAttesterSignedQuote.attesterSignature.signature,
        validAttesterSignedQuote.attesterSignature.keyId,
      ],
    ]

    compressedResultQuoteAgreement = [
      validQuoteData.attesterDid,
      validQuoteData.cTypeHash,
      [
        validQuoteData.cost.gross,
        validQuoteData.cost.net,
        validQuoteData.cost.tax,
      ],
      validQuoteData.currency,
      validQuoteData.termsAndConditions,
      validQuoteData.timeframe,
      [
        validAttesterSignedQuote.attesterSignature.signature,
        validAttesterSignedQuote.attesterSignature.keyId,
      ],
      [
        quoteBothAgreed.claimerSignature.signature,
        quoteBothAgreed.claimerSignature.keyId,
      ],
      quoteBothAgreed.rootHash,
    ]
  })

  it('tests created quote data against given data', async () => {
    expect(validQuoteData.attesterDid).toEqual(attesterIdentity.did)
    await expect(
      DidUtils.authenticateWithDid(
        Crypto.hashObjectAsStr(validAttesterSignedQuote),
        claimerIdentity,
        keystore
      )
    ).resolves.toEqual(quoteBothAgreed.claimerSignature)

    expect(
      Crypto.verify(
        Crypto.hashObjectAsStr({
          attesterDid: validQuoteData.attesterDid,
          cTypeHash: validQuoteData.cTypeHash,
          cost: validQuoteData.cost,
          currency: validQuoteData.currency,
          timeframe: validQuoteData.timeframe,
          termsAndConditions: validQuoteData.termsAndConditions,
        }),
        validAttesterSignedQuote.attesterSignature.signature,
        attesterIdentity.getKey(
          validAttesterSignedQuote.attesterSignature.keyId
        )?.publicKeyHex || ''
      )
    ).toBeTruthy()
    expect(
      Quote.fromAttesterSignedInput(validAttesterSignedQuote, attesterIdentity)
    ).toEqual(validAttesterSignedQuote)
    expect(
      await Quote.fromQuoteDataAndIdentity(
        validQuoteData,
        attesterIdentity,
        keystore
      )
    ).toEqual(validAttesterSignedQuote)
  })
  it('validates created quotes against QuoteSchema', () => {
    expect(Quote.validateQuoteSchema(QuoteSchema, validQuoteData)).toBeTruthy()
    expect(Quote.validateQuoteSchema(QuoteSchema, invalidCostQuote)).toBeFalsy()
    expect(
      Quote.validateQuoteSchema(QuoteSchema, invalidPropertiesQuote)
    ).toBeFalsy()
  })

  it('compresses and decompresses the quote object', () => {
    expect(QuoteUtils.compressQuote(validQuoteData)).toEqual(compressedQuote)

    expect(QuoteUtils.decompressQuote(compressedQuote)).toEqual(validQuoteData)

    expect(
      QuoteUtils.compressAttesterSignedQuote(validAttesterSignedQuote)
    ).toEqual(compressedResultAttesterSignedQuote)

    expect(
      QuoteUtils.decompressAttesterSignedQuote(
        compressedResultAttesterSignedQuote
      )
    ).toEqual(validAttesterSignedQuote)

    expect(QuoteUtils.compressQuoteAgreement(quoteBothAgreed)).toEqual(
      compressedResultQuoteAgreement
    )

    expect(
      QuoteUtils.decompressQuoteAgreement(compressedResultQuoteAgreement)
    ).toEqual(quoteBothAgreed)
  })
  it('Negative test for compresses and decompresses the quote object', () => {
    // @ts-expect-error
    delete validQuoteData.cTypeHash
    compressedQuote.pop()
    // @ts-expect-error
    delete validAttesterSignedQuote.currency
    compressedResultAttesterSignedQuote.pop()
    // @ts-expect-error
    delete quoteBothAgreed.currency
    compressedResultQuoteAgreement.pop()

    expect(() => {
      QuoteUtils.compressQuote(validQuoteData)
    }).toThrow()

    expect(() => {
      QuoteUtils.decompressQuote(compressedQuote)
    }).toThrow()

    expect(() => {
      QuoteUtils.compressAttesterSignedQuote(validAttesterSignedQuote)
    }).toThrow()

    expect(() => {
      QuoteUtils.decompressAttesterSignedQuote(
        compressedResultAttesterSignedQuote
      )
    }).toThrow()

    expect(() => {
      QuoteUtils.compressQuoteAgreement(quoteBothAgreed)
    }).toThrow()

    expect(() => {
      QuoteUtils.decompressQuoteAgreement(compressedResultQuoteAgreement)
    }).toThrow()
  })
})
