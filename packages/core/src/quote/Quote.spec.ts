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
  CompressedQuote,
  CompressedQuoteAgreed,
  CompressedQuoteAttesterSigned,
  DidDetails,
  DidResolvedDetails,
  IClaim,
  ICostBreakdown,
  ICType,
  IDidResolver,
  IQuote,
  IQuoteAgreement,
  IQuoteAttesterSigned,
  ICredential,
} from '@kiltprotocol/types'
import { Crypto } from '@kiltprotocol/utils'
import * as Did from '@kiltprotocol/did'
import {
  createLocalDemoFullDidFromKeypair,
  makeSigningKeyTool,
} from '@kiltprotocol/testing'
import * as CType from '../ctype'
import * as Credential from '../credential'
import * as Quote from './Quote'
import { QuoteSchema } from './QuoteSchema'

describe('Quote', () => {
  let claimerIdentity: DidDetails
  const claimer = makeSigningKeyTool('ed25519')

  let attesterIdentity: DidDetails
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

  const mockResolver = (() => {
    async function resolve(didUri: string): Promise<DidResolvedDetails | null> {
      // For the mock resolver, we need to match the base URI, so we delete the fragment, if present.
      const didWithoutFragment = didUri.split('#')[0]
      switch (didWithoutFragment) {
        case claimerIdentity?.uri:
          return { details: claimerIdentity, metadata: { deactivated: false } }
        case attesterIdentity?.uri:
          return { details: attesterIdentity, metadata: { deactivated: false } }
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
      attesterIdentity,
      attester.sign
    )
    quoteBothAgreed = await Quote.createQuoteAgreement(
      validAttesterSignedQuote,
      credential.rootHash,
      attesterIdentity.uri,
      claimerIdentity,
      claimer.sign,
      {
        resolver: mockResolver,
      }
    )
    invalidPropertiesQuote = invalidPropertiesQuoteData
    invalidCostQuote = invalidCostQuoteData
  })

  it('tests created quote data against given data', async () => {
    expect(validQuoteData.attesterDid).toEqual(attesterIdentity.uri)
    expect(
      await Did.signPayload(
        claimerIdentity,
        Crypto.hashObjectAsStr(validAttesterSignedQuote),
        claimer.sign,
        claimerIdentity.authentication[0].id
      )
    ).toEqual(quoteBothAgreed.claimerSignature)

    const { fragment: attesterKeyId } = Did.Utils.parseDidUri(
      validAttesterSignedQuote.attesterSignature.keyUri
    )

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
        u8aToHex(
          Did.getKey(attesterIdentity, attesterKeyId!)?.publicKey ||
            new Uint8Array()
        )
      )
    ).toBe(true)
    await Quote.verifyAttesterSignedQuote(validAttesterSignedQuote, {
      resolver: mockResolver,
    })
    expect(
      await Quote.createAttesterSignedQuote(
        validQuoteData,
        attesterIdentity,
        attester.sign
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

describe('Quote compression', () => {
  let claimerIdentity: DidDetails
  let attesterIdentity: DidDetails
  let cTypeSchema: ICType['schema']
  let testCType: ICType
  let claim: IClaim
  let credential: ICredential
  let validQuoteData: IQuote
  let validAttesterSignedQuote: IQuoteAttesterSigned
  let quoteBothAgreed: IQuoteAgreement
  let compressedQuote: CompressedQuote
  let compressedResultAttesterSignedQuote: CompressedQuoteAttesterSigned
  let compressedResultQuoteAgreement: CompressedQuoteAgreed

  const mockResolver = (() => {
    async function resolve(didUri: string): Promise<DidResolvedDetails | null> {
      // For the mock resolver, we need to match the base URI, so we delete the fragment, if present.
      const didWithoutFragment = didUri.split('#')[0]
      switch (didWithoutFragment) {
        case claimerIdentity?.uri:
          return { details: claimerIdentity, metadata: { deactivated: false } }
        case attesterIdentity?.uri:
          return { details: attesterIdentity, metadata: { deactivated: false } }
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
    const claimer = makeSigningKeyTool('ed25519')
    const attester = makeSigningKeyTool('ed25519')

    claimerIdentity = await createLocalDemoFullDidFromKeypair(claimer.keypair)
    attesterIdentity = await createLocalDemoFullDidFromKeypair(attester.keypair)

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
      attesterIdentity,
      attester.sign
    )
    quoteBothAgreed = await Quote.createQuoteAgreement(
      validAttesterSignedQuote,
      credential.rootHash,
      attesterIdentity.uri,
      claimerIdentity,
      claimer.sign,
      {
        resolver: mockResolver,
      }
    )

    // TODO: use snapshot testing and test compress -> decompress -> still equal
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
        validAttesterSignedQuote.attesterSignature.keyUri,
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
        validAttesterSignedQuote.attesterSignature.keyUri,
      ],
      [
        quoteBothAgreed.claimerSignature.signature,
        quoteBothAgreed.claimerSignature.keyUri,
      ],
      quoteBothAgreed.rootHash,
    ]
  })

  it('compresses and decompresses the quote object', () => {
    expect(Quote.compressQuote(validQuoteData)).toEqual(compressedQuote)

    expect(Quote.decompressQuote(compressedQuote)).toEqual(validQuoteData)

    expect(Quote.compressAttesterSignedQuote(validAttesterSignedQuote)).toEqual(
      compressedResultAttesterSignedQuote
    )

    expect(
      Quote.decompressAttesterSignedQuote(compressedResultAttesterSignedQuote)
    ).toEqual(validAttesterSignedQuote)

    expect(Quote.compressQuoteAgreement(quoteBothAgreed)).toEqual(
      compressedResultQuoteAgreement
    )

    expect(
      Quote.decompressQuoteAgreement(compressedResultQuoteAgreement)
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
      Quote.compressQuote(validQuoteData)
    }).toThrow()

    expect(() => {
      Quote.decompressQuote(compressedQuote)
    }).toThrow()

    expect(() => {
      Quote.compressAttesterSignedQuote(validAttesterSignedQuote)
    }).toThrow()

    expect(() => {
      Quote.decompressAttesterSignedQuote(compressedResultAttesterSignedQuote)
    }).toThrow()

    expect(() => {
      Quote.compressQuoteAgreement(quoteBothAgreed)
    }).toThrow()

    expect(() => {
      Quote.decompressQuoteAgreement(compressedResultQuoteAgreement)
    }).toThrow()
  })
})
