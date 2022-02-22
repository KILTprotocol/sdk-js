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

import { u8aToHex } from '@polkadot/util'

import type {
  IClaim,
  ICType,
  IDidResolver,
  ICostBreakdown,
  IQuote,
  IQuoteAgreement,
  IQuoteAttesterSigned,
  DidResolvedDetails,
  IRequestForAttestation,
} from '@kiltprotocol/types'
import { Crypto } from '@kiltprotocol/utils'
import {
  DemoKeystore,
  DemoKeystoreUtils,
  DidDetails,
  DidUtils,
  SigningAlgorithms,
} from '@kiltprotocol/did'
import * as CType from '../ctype'
import * as RequestForAttestation from '../requestforattestation'
import * as Quote from './base'
import { QuoteSchema } from './QuoteSchema'

describe('Quote', () => {
  let claimerIdentity: DidDetails
  let attesterIdentity: DidDetails
  let keystore: DemoKeystore
  let invalidCost: ICostBreakdown
  let date: string
  let cTypeSchema: ICType['schema']
  let testCType: ICType
  let claim: IClaim
  let request: IRequestForAttestation
  let invalidCostQuoteData: IQuote
  let invalidPropertiesQuoteData: IQuote
  let validQuoteData: IQuote
  let validAttesterSignedQuote: IQuoteAttesterSigned
  let quoteBothAgreed: IQuoteAgreement
  let invalidPropertiesQuote: IQuote
  let invalidCostQuote: IQuote

  const mockResolver: IDidResolver = (() => {
    const resolve = async (
      didUri: string
    ): Promise<DidResolvedDetails | null> => {
      // For the mock resolver, we need to match the base URI, so we delete the fragment, if present.
      const didWithoutFragment = didUri.split('#')[0]
      switch (didWithoutFragment) {
        case claimerIdentity?.did:
          return { details: claimerIdentity, metadata: { deactivated: false } }
        case attesterIdentity?.did:
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
      SigningAlgorithms.Ed25519
    )
    attesterIdentity = await DemoKeystoreUtils.createLocalDemoFullDidFromSeed(
      keystore,
      '//Bob',
      SigningAlgorithms.Ed25519
    )

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
      attesterDid: attesterIdentity.did,
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
      attesterIdentity.did,
      claimerIdentity,
      keystore,
      {
        resolver: mockResolver,
      }
    )
    invalidPropertiesQuote = invalidPropertiesQuoteData
    invalidCostQuote = invalidCostQuoteData
  })

  it('tests created quote data against given data', async () => {
    expect(validQuoteData.attesterDid).toEqual(attesterIdentity.did)
    await expect(
      claimerIdentity.signPayload(
        Crypto.hashObjectAsStr(validAttesterSignedQuote),
        keystore,
        claimerIdentity.authenticationKey.id
      )
    ).resolves.toEqual(quoteBothAgreed.claimerSignature)

    const { fragment: attesterKeyId } = DidUtils.parseDidUri(
      validAttesterSignedQuote.attesterSignature.keyId
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
          attesterIdentity.getKey(attesterKeyId!)?.publicKey || new Uint8Array()
        )
      )
    ).toBeTruthy()
    expect(
      await Quote.verifyAttesterSignedQuote(validAttesterSignedQuote, {
        resolver: mockResolver,
      })
    ).not.toThrow()
    expect(
      await Quote.createAttesterSignedQuote(
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
})
