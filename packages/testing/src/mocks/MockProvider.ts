/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

// Copied from polkadot-js/api
// Copyright 2017-2022 @polkadot/rpc-provider authors & contributors
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable camelcase */

import type { Extrinsic } from '@polkadot/types/interfaces'
import type { Codec, Registry } from '@polkadot/types/types'
import type {
  ProviderInterface,
  ProviderInterfaceEmitCb,
  ProviderInterfaceEmitted,
} from '@polkadot/rpc-provider/types'

import EventEmitter from 'eventemitter3'

import { Metadata, unwrapStorageType } from '@polkadot/types'
import rpc from '@polkadot/types/interfaces/jsonrpc'
import rpcHeader from '@polkadot/types-support/json/Header.004.json'
import rpcSignedBlock from '@polkadot/types-support/json/SignedBlock.004.immortal.json'
import { assert, u8aToHex, u8aToU8a } from '@polkadot/util'
import type { QueryableStorageEntry } from '@polkadot/api/types'
import { spiritnetMetadata } from './metadata'

export type MockStateDb = Record<string, Uint8Array>
export type MockStateSubscriptionCallback = (
  error: Error | null,
  value: any
) => void
export type MockStateSubscriptions = Record<
  string,
  {
    callbacks: Record<number, MockStateSubscriptionCallback>
    lastValue: any
  }
>

const l = console

const SUBSCRIPTIONS: string[] = Array.prototype.concat.apply(
  [],
  Object.values(rpc).map((section): string[] =>
    Object.values(section)
      .filter(({ isSubscription }) => isSubscription)
      .map(({ jsonrpc }) => jsonrpc)
      .concat('chain_subscribeNewHead')
  )
) as string[]

// const keyring = createTestKeyring({ type: 'ed25519' })

type CodecLike = { toU8a: () => Uint8Array }
function isCodecLike(a: unknown): a is CodecLike {
  return (
    typeof a === 'object' &&
    typeof (a as Record<string, unknown>).toU8a === 'function'
  )
}

/**
 * A mock provider mainly used for testing.
 *
 * @returns {ProviderInterface} The mock provider.
 * @internal
 */
export class MockProvider implements ProviderInterface {
  private db: MockStateDb = {}

  private emitter = new EventEmitter()

  private intervalId?: NodeJS.Timeout | null

  public isUpdating = true

  public registry: Registry

  public metadata: Metadata
  // private prevNumber = new BN(-1)

  private requests: Record<
    string,
    (db: MockStateDb, params: any[]) => unknown
  > = {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars,@typescript-eslint/no-unsafe-member-access
    chain_getBlock: () =>
      this.registry.createType('SignedBlock', rpcSignedBlock.result).toJSON(),
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    chain_getBlockHash: () =>
      '0x1234000000000000000000000000000000000000000000000000000000000000',
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    chain_getFinalizedHead: () =>
      this.registry.createType('Header', rpcHeader.result).hash,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    chain_getHeader: () =>
      this.registry.createType('Header', rpcHeader.result).toJSON(),
    rpc_methods: () => this.registry.createType('RpcMethods').toJSON(),
    state_getKeys: () => [],
    state_getKeysPaged: () => [],
    state_getMetadata: () => this.metadata.toHex(),
    state_getRuntimeVersion: () =>
      this.registry.createType('RuntimeVersion').toHex(),
    state_getStorage: (storage, [key]: string[]) => {
      const entry = storage[key]
      l.debug(`requested storage ${key}: result ${entry}`)
      return entry ? u8aToHex(entry) : null
    },
    system_chain: () => 'mockChain',
    system_health: () => ({}),
    system_name: () => 'mockClient',
    system_properties: () => ({ ss58Format: 38 }),
    system_upgradedToTripleRefCount: () =>
      this.registry.createType('bool', true),
    system_version: () => '9.8.7',
    author_submitExtrinsic: (_storage, [submittedExtrinsic]: string[]) => {
      const extrinsic = this.registry.createType(
        'Extrinsic',
        submittedExtrinsic
      )
      if (this.onSubmitExtrinsic) {
        this.onSubmitExtrinsic(this, extrinsic)
      }
      return extrinsic.hash.toHex()
    },
  }

  public subscriptions: MockStateSubscriptions = SUBSCRIPTIONS.reduce(
    (subs, name): MockStateSubscriptions => {
      // eslint-disable-next-line no-param-reassign
      subs[name] = {
        callbacks: {},
        lastValue: null,
      }

      return subs
    },
    {} as MockStateSubscriptions
  )

  private subscriptionId = 0

  private subscriptionMap: Record<number, string> = {}

  public onSubmitExtrinsic?: (
    thisProvider: MockProvider,
    extrinsic: Extrinsic
  ) => void

  constructor(
    registry: Registry,
    metadata:
      | string
      | Uint8Array
      | Record<string, unknown>
      | Map<string, unknown> = spiritnetMetadata,
    onSubmitExtrinsic?: (
      thisProvider: MockProvider,
      extrinsic: Extrinsic
    ) => void
  ) {
    this.registry = registry
    this.metadata = new Metadata(registry, metadata)
    this.registry.setMetadata(this.metadata)

    this.onSubmitExtrinsic = onSubmitExtrinsic
  }

  // eslint-disable-next-line class-methods-use-this
  public get hasSubscriptions(): boolean {
    return true
  }

  // eslint-disable-next-line class-methods-use-this
  public clone(): MockProvider {
    throw new Error('Unimplemented')
  }

  // eslint-disable-next-line class-methods-use-this
  public async connect(): Promise<void> {
    // noop
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  public async disconnect(): Promise<void> {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  public readonly isConnected: boolean = true

  public on(
    type: ProviderInterfaceEmitted,
    sub: ProviderInterfaceEmitCb
  ): () => void {
    this.emitter.on(type, sub)

    return (): void => {
      this.emitter.removeListener(type, sub)
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  public async send<T = any>(method: string, params: unknown[]): Promise<T> {
    l.debug(`send request with method ${method}, ${params}`)

    assert(
      this.requests[method],
      () => `provider.send: Invalid method '${method}'`
    )

    return this.requests[method](this.db, params) as T
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  public async subscribe(
    type: string,
    method: string,
    params: unknown[],
    callback: MockStateSubscriptionCallback
  ): Promise<number> {
    l.debug(
      `subscribe request with method ${method}, type ${type}, params ${params}`
    )

    assert(
      this.subscriptions[method],
      () => `provider.subscribe: Invalid method '${method}'`
    )
    assert(callback, () => `provider.subscribe: no callback given`)
    // eslint-disable-next-line no-plusplus
    const id = ++this.subscriptionId

    this.subscriptions[method].callbacks[id] = callback
    this.subscriptionMap[id] = method

    if (this.subscriptions[method].lastValue !== null) {
      callback(null, this.subscriptions[method].lastValue)
    }

    return id
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  public async unsubscribe(
    type: string,
    method: string,
    id: number
  ): Promise<boolean> {
    const sub = this.subscriptionMap[id]

    l.debug(`unsubscribe request with method ${method}, type ${type}, id ${id}`)

    assert(sub, () => `Unable to find subscription for ${id}`)

    delete this.subscriptionMap[id]
    delete this.subscriptions[sub].callbacks[id]

    return true
  }

  public setState(value: CodecLike | Uint8Array, key: string): void {
    this.db[key] = isCodecLike(value) ? value.toU8a() : u8aToU8a(value)
    const storageChange = this.registry.createType('StorageChangeSet', {
      block: this.requests['chain_getBlockHash'](this.db, []),
      changes: [[key, this.db[key]]],
    })
    this.updateSubs('state_subscribeStorage', storageChange)
  }

  public setQueryState(
    value: unknown,
    storage: QueryableStorageEntry<any>,
    ...mapKeys: unknown[]
  ): void {
    const key = storage.key(...mapKeys)
    const storageType = unwrapStorageType(
      this.registry,
      storage.creator.meta.type
    )
    this.setState(this.registry.createType(storageType, value), key)
  }

  public unsetState(key: string): void {
    delete this.db[key]
  }

  public updateSubs(method: string, value: Codec): void {
    this.subscriptions[method].lastValue = value

    Object.values(this.subscriptions[method].callbacks).forEach((cb): void => {
      try {
        cb(null, value.toHex())
      } catch (error) {
        l.error(
          `Error on '${method}' subscription`,
          error instanceof Error ? error : undefined
        )
      }
    })
  }
}
