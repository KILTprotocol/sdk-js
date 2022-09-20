/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { ApiMocks } from '@kiltprotocol/testing'
import { getKeyRelationshipForExtrinsic } from './FullDidDetails.utils.js'

/**
 * @group unit/did
 */

const mockApi = ApiMocks.createAugmentedApi()

describe('When creating an instance from the chain', () => {
  it('Should return correct KeyRelationship for single valid call', () => {
    const keyRelationship = getKeyRelationshipForExtrinsic(
      mockApi.tx.attestation.add(new Uint8Array(32), new Uint8Array(32), null)
    )
    expect(keyRelationship).toBe('assertionMethod')
  })
  it('Should return correct KeyRelationship for batched call', () => {
    const keyRelationship = getKeyRelationshipForExtrinsic(
      mockApi.tx.utility.batch([
        mockApi.tx.attestation.add(
          new Uint8Array(32),
          new Uint8Array(32),
          null
        ),
        mockApi.tx.attestation.add(
          new Uint8Array(32),
          new Uint8Array(32),
          null
        ),
      ])
    )
    expect(keyRelationship).toBe('assertionMethod')
  })
  it('Should return correct KeyRelationship for batchAll call', () => {
    const keyRelationship = getKeyRelationshipForExtrinsic(
      mockApi.tx.utility.batchAll([
        mockApi.tx.attestation.add(
          new Uint8Array(32),
          new Uint8Array(32),
          null
        ),
        mockApi.tx.attestation.add(
          new Uint8Array(32),
          new Uint8Array(32),
          null
        ),
      ])
    )
    expect(keyRelationship).toBe('assertionMethod')
  })
  it('Should return correct KeyRelationship for forcedBatch call', () => {
    const keyRelationship = getKeyRelationshipForExtrinsic(
      mockApi.tx.utility.forceBatch([
        mockApi.tx.attestation.add(
          new Uint8Array(32),
          new Uint8Array(32),
          null
        ),
        mockApi.tx.attestation.add(
          new Uint8Array(32),
          new Uint8Array(32),
          null
        ),
      ])
    )
    expect(keyRelationship).toBe('assertionMethod')
  })
  it('Should return undefined for batch with mixed KeyRelationship calls', () => {
    const keyRelationship = getKeyRelationshipForExtrinsic(
      mockApi.tx.utility.forceBatch([
        mockApi.tx.attestation.add(
          new Uint8Array(32),
          new Uint8Array(32),
          null
        ),
        mockApi.tx.web3Names.claim('awesomename'),
      ])
    )
    expect(keyRelationship).toBeUndefined()
  })
})
