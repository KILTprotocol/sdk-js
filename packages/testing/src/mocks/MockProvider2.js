/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { MockProvider as PolkaMockProvider } from '@polkadot/rpc-provider/mock'
import { Metadata, unwrapStorageType } from '@polkadot/types'
import { u8aToHex, u8aToU8a } from '@polkadot/util'
import substrateMetadata from '@polkadot/types-support/metadata/v14/polkadot-hex'
import kusamaMetadata from '@polkadot/types-support/metadata/v14/kusama-hex'
import kiltMetadata from './metadata.json'

export { kiltMetadata, substrateMetadata, kusamaMetadata }

export class MockProvider extends PolkaMockProvider {
  constructor(registry, metadata = kiltMetadata, onSubmitExtrinsic) {
    super(registry)
    this.metadata = new Metadata(registry, metadata)
    registry.setMetadata(this.metadata)
    this.onSubmitExtrinsic = onSubmitExtrinsic
    this.overrideRequests()
  }

  overrideRequests() {
    const requests = {
      system_properties: () => ({ ss58Format: 38 }),
      author_submitExtrinsic: (_storage, [submittedExtrinsic]) => {
        const extrinsic = this.registry.createType(
          'Extrinsic',
          submittedExtrinsic
        )
        if (this.onSubmitExtrinsic) {
          this.onSubmitExtrinsic(this, extrinsic)
        }
        return extrinsic.hash.toHex()
      },
      state_getMetadata: () => this.metadata.toHex(),
      state_getStorage: (storage, [key]) => {
        const entry = storage[key]
        return entry ? u8aToHex(entry) : null
      },
    }
    this.requests = Object.assign(this.requests, requests)
  }

  setState(value, key) {
    this.db[key] =
      typeof value.toU8a === 'function' ? value.toU8a() : u8aToU8a(value)
  }

  setQueryState(value, storage, ...mapKeys) {
    const key = storage.key(...mapKeys)
    const storageType = unwrapStorageType(
      this.registry,
      storage.creator.meta.type
    )
    this.setState(this.registry.createType(storageType, value), key)
  }

  unsetState(key) {
    delete this.db[key]
  }
}
