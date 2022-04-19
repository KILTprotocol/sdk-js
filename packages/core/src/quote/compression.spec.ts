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
  IDidResolver,
  IQuote,
  IQuoteAgreement,
  IQuoteAttesterSigned,
  DidResolvedDetails,
  IRequestForAttestation,
} from '@kiltprotocol/types'
import {
  DemoKeystore,
  DemoKeystoreUtils,
  DidDetails,
  SigningAlgorithms,
} from '@kiltprotocol/did'
import * as CType from '../ctype'
import * as RequestForAttestation from '../requestforattestation'
import * as Quote from './base'
import * as Compression from './compression'

describe('Quote compression', () => {
  let claimerIdentity: DidDetails
  let attesterIdentity: DidDetails
  let keystore: DemoKeystore
  let cTypeSchema: ICType['schema']
  let testCType: ICType
  let claim: IClaim
  let request: IRequestForAttestation
  let validQuoteData: IQuote
  let validAttesterSignedQuote: IQuoteAttesterSigned
  let quoteBothAgreed: IQuoteAgreement
  let compressedQuote: CompressedQuote
  let compressedResultAttesterSignedQuote: CompressedQuoteAttesterSigned
  let compressedResultQuoteAgreement: CompressedQuoteAgreed

  const mockResolver: IDidResolver = (() => {
    const resolve = async (
      didUri: string
    ): Promise<DidResolvedDetails | null> => {
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
    keystore = new DemoKeystore()

    claimerIdentity = await DemoKeystoreUtils.createLocalDemoFullDidFromSeed(
      keystore,
      '//Alice',
      { signingKeyType: SigningAlgorithms.Ed25519 }
    )
    attesterIdentity = await DemoKeystoreUtils.createLocalDemoFullDidFromSeed(
      keystore,
      '//Bob',
      { signingKeyType: SigningAlgorithms.Ed25519 }
    )

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

    // build request for attestation with legitimations
    request = RequestForAttestation.fromClaim(claim)

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
      keystore
    )
    quoteBothAgreed = await Quote.createQuoteAgreement(
      validAttesterSignedQuote,
      request.rootHash,
      attesterIdentity.uri,
      claimerIdentity,
      keystore,
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
    expect(Compression.compressQuote(validQuoteData)).toEqual(compressedQuote)

    expect(Compression.decompressQuote(compressedQuote)).toEqual(validQuoteData)

    expect(
      Compression.compressAttesterSignedQuote(validAttesterSignedQuote)
    ).toEqual(compressedResultAttesterSignedQuote)

    expect(
      Compression.decompressAttesterSignedQuote(
        compressedResultAttesterSignedQuote
      )
    ).toEqual(validAttesterSignedQuote)

    expect(Compression.compressQuoteAgreement(quoteBothAgreed)).toEqual(
      compressedResultQuoteAgreement
    )

    expect(
      Compression.decompressQuoteAgreement(compressedResultQuoteAgreement)
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
      Compression.compressQuote(validQuoteData)
    }).toThrow()

    expect(() => {
      Compression.decompressQuote(compressedQuote)
    }).toThrow()

    expect(() => {
      Compression.compressAttesterSignedQuote(validAttesterSignedQuote)
    }).toThrow()

    expect(() => {
      Compression.decompressAttesterSignedQuote(
        compressedResultAttesterSignedQuote
      )
    }).toThrow()

    expect(() => {
      Compression.compressQuoteAgreement(quoteBothAgreed)
    }).toThrow()

    expect(() => {
      Compression.decompressQuoteAgreement(compressedResultQuoteAgreement)
    }).toThrow()
  })
})
