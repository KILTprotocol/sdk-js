/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group unit/ctype
 */

import { SDKErrors } from '@kiltprotocol/utils'
import type { ICType, ICTypeMetadata } from '@kiltprotocol/types'
import * as CType from './base'
import * as Verification from './verification'
import { MetadataModel } from './schemas'

describe('CType', () => {
  const didAlice = 'did:kilt:4p6K4tpdZtY3rNqM2uorQmsS6d3woxtnWMHjtzGftHmDb41N'
  let rawCType: ICType['schema']
  let ctype: ICType
  let ctypeMetadata: ICTypeMetadata['metadata']
  let metadata: ICTypeMetadata

  beforeAll(async () => {
    rawCType = {
      $id: 'kilt:ctype:0x1',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
      title: 'CtypeMetaData',
      properties: {
        'first-property': { type: 'integer' },
        'second-property': { type: 'string' },
      },
      type: 'object',
    }
    ctype = CType.fromSchema(rawCType, didAlice)

    ctypeMetadata = {
      title: { default: 'Title' },
      description: { default: 'Description' },
      properties: {
        'first-property': { title: { default: 'First Property' } },
        'second-property': { title: { default: 'Second Property' } },
      },
    }

    metadata = {
      metadata: ctypeMetadata,
      ctypeHash: ctype.hash,
    }
  })

  it('verifies the metadata of a ctype', async () => {
    expect(() => Verification.verifyCTypeMetadata(metadata)).not.toThrow()
    expect(metadata.ctypeHash).not.toHaveLength(0)
    expect(
      Verification.verifyObjectAgainstSchema(metadata, MetadataModel)
    ).toBeTruthy()
    expect(
      Verification.verifyObjectAgainstSchema(ctypeMetadata, MetadataModel)
    ).toBeFalsy()
  })
  it('checks if the metadata matches corresponding ctype hash', async () => {
    expect(metadata.ctypeHash).toEqual(ctype.hash)
  })
  it('throws error when supplied malformed constructor input', () => {
    const faultyMetadata: ICTypeMetadata = {
      metadata: ctypeMetadata,
      ctypeHash: ctype.hash,
    }
    // @ts-expect-error
    delete faultyMetadata.metadata.properties
    expect(() => Verification.verifyCTypeMetadata(metadata)).toThrow(
      SDKErrors.ERROR_OBJECT_MALFORMED()
    )
  })
})
