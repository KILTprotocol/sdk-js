/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { AssetDidDocument } from '@kiltprotocol/types'

import { exportToDidDocument } from './DidDocumentExporter'
import { resolve } from './Resolver'

/**
 * @group unit/assetdid
 */

const assetDid =
  'did:asset:eip155:1.erc20:0x71C7656EC7ab88b098defB751B7401B5f6d8976F:123'

describe('DidDocumentExporter.exportToDidDocument', () => {
  it('should correctly export a JSON DID document', async () => {
    const resolution = resolve(assetDid)
    expect(
      exportToDidDocument(resolution, 'application/json')
    ).toMatchObject<AssetDidDocument>({
      id: assetDid,
      chain: {
        namespace: 'eip155',
        reference: '1',
      },
      asset: {
        namespace: 'erc20',
        reference: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
        identifier: '123',
      },
    })
  })

  it('should correctly export a JSON-LD DID document', async () => {
    const resolution = resolve(assetDid)
    expect(
      exportToDidDocument(resolution, 'application/ld+json')
    ).toMatchObject<AssetDidDocument>({
      '@context': [
        'https://www.w3.org/ns/did/v1',
        'ipfs://QmUAcsTVNfjGoZ3dcuHKikFJZpRiUkXCpbWcfxb1j5qnv4',
      ],
      id: assetDid,
      chain: {
        namespace: 'eip155',
        reference: '1',
      },
      asset: {
        namespace: 'erc20',
        reference: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
        identifier: '123',
      },
    })
  })
})
