/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import * as Did from '@kiltprotocol/did'
import type {
  DidDocument,
  DidResourceUri,
  ICType,
  IClaim,
  ICostBreakdown,
  ICredential,
  IQuote,
  IQuoteAgreement,
  IQuoteAttesterSigned,
  ResolvedDidKey,
} from '@kiltprotocol/types'
import { Crypto, SDKErrors } from '@kiltprotocol/utils'

import {
  createLocalDemoFullDidFromKeypair,
  makeSigningKeyTool,
} from '../../../../tests/testUtils'
import * as Credential from '../credential'
import * as CType from '../ctype'
import * as Quote from './Quote'
import { QuoteSchema } from './QuoteSchema'

describe('Quote', () => {
  let claimerIdentity: DidDocument
  const claimer = makeSigningKeyTool('ed25519')

  let attesterIdentity: DidDocument
  const attester = makeSigningKeyTool('ed25519')

  let invalidCost: ICostBreakdown
  let date: string
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

    testCType = CType.fromProperties('Quote Information', {
      name: { type: 'string' },
    })

    claim = {
      cTypeHash: CType.idToHash(testCType.$id),
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
    const sign = claimer.getSignCallback(claimerIdentity)
    const signature = Did.signatureToJson(
      await sign({
        data: Crypto.hash(
          Crypto.encodeObjectAsStr({
            ...validAttesterSignedQuote,
            claimerDid: claimerIdentity.uri,
            rootHash: credential.rootHash,
          })
        ),
        did: claimerIdentity.uri,
        keyRelationship: 'authentication',
      })
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
        Did.getKey(attesterIdentity, attesterKeyId!)?.publicKey ||
          new Uint8Array()
      )
    ).not.toThrow()
    await expect(
      Quote.verifyAttesterSignedQuote(validAttesterSignedQuote, {
        didResolveKey: mockResolveKey,
      })
    ).resolves.not.toThrow()
    await expect(
      Quote.verifyQuoteAgreement(quoteBothAgreed, {
        didResolveKey: mockResolveKey,
      })
    ).resolves.not.toThrow()
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

  it('detects tampering', async () => {
    const messedWithCurrency: IQuoteAttesterSigned = {
      ...validAttesterSignedQuote,
      currency: 'Bananas',
    }
    await expect(
      Quote.verifyAttesterSignedQuote(messedWithCurrency, {
        didResolveKey: mockResolveKey,
      })
    ).rejects.toThrow(SDKErrors.SignatureUnverifiableError)
    const messedWithRootHash: IQuoteAgreement = {
      ...quoteBothAgreed,
      rootHash: '0x1234',
    }
    await expect(
      Quote.verifyQuoteAgreement(messedWithRootHash, {
        didResolveKey: mockResolveKey,
      })
    ).rejects.toThrow(SDKErrors.SignatureUnverifiableError)
  })

  it('complains if attesterDid does not match attester signature', async () => {
    const sign = claimer.getSignCallback(claimerIdentity)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { attesterSignature, ...attesterSignedQuote } =
      validAttesterSignedQuote
    const wrongSignerAttester: IQuoteAttesterSigned = {
      ...attesterSignedQuote,
      attesterSignature: Did.signatureToJson(
        await sign({
          data: Crypto.hash(Crypto.encodeObjectAsStr(attesterSignedQuote)),
          did: claimerIdentity.uri,
          keyRelationship: 'authentication',
        })
      ),
    }

    await expect(
      Quote.verifyAttesterSignedQuote(wrongSignerAttester, {
        didResolveKey: mockResolveKey,
      })
    ).rejects.toThrow(SDKErrors.DidSubjectMismatchError)
  })

  it('complains if claimerDid does not match claimer signature', async () => {
    const sign = attester.getSignCallback(attesterIdentity)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { claimerSignature, ...restQuote } = quoteBothAgreed
    const wrongSignerClaimer: IQuoteAgreement = {
      ...restQuote,
      claimerSignature: Did.signatureToJson(
        await sign({
          data: Crypto.hash(Crypto.encodeObjectAsStr(restQuote)),
          did: attesterIdentity.uri,
          keyRelationship: 'authentication',
        })
      ),
    }

    await expect(
      Quote.verifyQuoteAgreement(wrongSignerClaimer, {
        didResolveKey: mockResolveKey,
      })
    ).rejects.toThrow(SDKErrors.DidSubjectMismatchError)
  })
})
