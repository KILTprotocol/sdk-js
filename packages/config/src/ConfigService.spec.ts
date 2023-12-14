/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/* eslint-disable dot-notation */
import { ApiPromise, WsProvider } from '@polkadot/api'
import { LogLevel, Logger } from 'typescript-logging'

import * as ConfigService from './ConfigService'

describe('Log Configuration', () => {
  let testLogger: Logger
  beforeEach(() => {
    testLogger = ConfigService.LoggingFactory.getLogger('testLogger')
  })

  it('Tests the default Log Level', () => {
    if (process.env.DEBUG === 'true') {
      expect(testLogger.getLogLevel()).toEqual(LogLevel.Debug)
    } else expect(testLogger.getLogLevel()).toEqual(LogLevel.Warn)
  })

  it('modifies the Log Level of all Loggers to the desired Level', () => {
    const initialLevel = testLogger.getLogLevel()
    ConfigService.modifyLogLevel(LogLevel.Info)
    expect(testLogger.getLogLevel()).toEqual(LogLevel.Info)
    expect(
      ConfigService.LoggingFactory.getLogger('test1').getLogLevel()
    ).toEqual(LogLevel.Info)

    // @ts-ignore Only values 0-6 are valid. https://github.com/vauxite-org/typescript-logging/blob/cf0d3e7d52b1da0650b16308cc3f1a56bcb95b5b/core/src/typescript/main/core/api/LogLevel.ts#L5C1-L12C10
    ConfigService.modifyLogLevel(-100)
    expect(testLogger.getLogLevel()).toEqual(0)
    ConfigService.modifyLogLevel(initialLevel)
    expect(testLogger.getLogLevel()).toEqual(initialLevel)
  })
})

describe('Configuration Service', () => {
  it('has configuration Object with default values', () => {
    expect(ConfigService.get('logLevel')).toEqual(LogLevel.Warn)
    expect(() => ConfigService.get('api')).toThrowErrorMatchingInlineSnapshot(
      `"The blockchain API is not set. Did you forget to call \`Kilt.connect(…)\` or \`Kilt.init(…)\`?"`
    )
  })
  describe('set function for api instance, logLevel and any custom configuration prop', () => {
    it('api instance', () => {
      const provider = new WsProvider(undefined, false)
      const api = new ApiPromise({ provider })
      ConfigService.set({ api })
      expect(ConfigService.get('api')).toEqual(api)
    })
    it('logLevel setting', () => {
      ConfigService.set({ logLevel: LogLevel.Warn })
      expect(ConfigService.get('logLevel')).toEqual(LogLevel.Warn)
    })
    it('custom config prop', () => {
      ConfigService.set({ testProp: 'test' })
      expect(ConfigService.get('testProp')).toEqual('test')
    })
  })
  describe('get function for api instance, logLevel and any other injected configuration prop', () => {
    it('throws if api not set', () => {
      ConfigService.unset('api')
      expect(() => ConfigService.get('api')).toThrowErrorMatchingInlineSnapshot(
        `"The blockchain API is not set. Did you forget to call \`Kilt.connect(…)\` or \`Kilt.init(…)\`?"`
      )
    })
    it('returns logLevel property', () => {
      ConfigService.set({ logLevel: LogLevel.Info })
      expect(ConfigService.get('logLevel')).toEqual(LogLevel.Info)
    })
    it('gets custom configuration prop', () => {
      ConfigService.set({ testProp: 'testing' })
      expect(ConfigService.get('testProp')).toEqual('testing')
    })
    it('throws error if target prop does not exist or is undefined', () => {
      expect(() => ConfigService.get('testingError')).toThrow(
        'GENERIC NOT CONFIGURED ERROR FOR KEY: "testingError"'
      )
    })
  })
})
