/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group unit/ctype
 */

import { SDKErrors } from '@kiltprotocol/utils'
import type { ICType, ICTypeMetadata } from '@kiltprotocol/types'
import * as CType from './CType'
import { MetadataModel } from './CType.schemas'

describe('CType', () => {
  let ctype: ICType
  let ctypeMetadata: ICTypeMetadata['metadata']
  let metadata: ICTypeMetadata

  beforeAll(async () => {
    ctype = CType.fromProperties('CtypeMetaData', {
      'first-property': { type: 'integer' },
      'second-property': { type: 'string' },
    })

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
      cTypeId: ctype.$id,
    }
  })

  it('verifies the metadata of a ctype', async () => {
    expect(() => CType.verifyCTypeMetadata(metadata)).not.toThrow()
    expect(metadata.cTypeId).not.toHaveLength(0)
    expect(() =>
      CType.verifyObjectAgainstSchema(metadata, MetadataModel)
    ).not.toThrow()
    expect(() =>
      CType.verifyObjectAgainstSchema(ctypeMetadata, MetadataModel)
    ).toThrow()
  })
  it('checks if the metadata matches corresponding ctype hash', async () => {
    expect(metadata.cTypeId).toEqual(ctype.$id)
  })
  it('throws error when supplied malformed constructor input', () => {
    const faultyMetadata: ICTypeMetadata = {
      metadata: ctypeMetadata,
      cTypeId: ctype.$id,
    }
    // @ts-expect-error
    delete faultyMetadata.metadata.properties
    expect(() => CType.verifyCTypeMetadata(metadata)).toThrow(
      SDKErrors.ObjectUnverifiableError
    )
  })
})
