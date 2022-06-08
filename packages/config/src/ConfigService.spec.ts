/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group unit/ConfigService
 */

/* eslint-disable dot-notation */
import { LogLevel, Logger } from 'typescript-logging'
import { SDKErrors } from '@kiltprotocol/utils'
import * as ConfigService from './ConfigService'

describe('Log Configuration', () => {
  let testLogger: Logger
  beforeEach(() => {
    testLogger = ConfigService.LoggingFactory.getLogger('testLogger')
  })

  it('Tests the default Log Level', () => {
    if (process.env.DEBUG === 'true') {
      expect(testLogger.getLogLevel()).toEqual(LogLevel.Debug)
    } else expect(testLogger.getLogLevel()).toEqual(LogLevel.Error)
  })

  it('modifies the Log Level of all Loggers to the desired Level', () => {
    const initialLevel = testLogger.getLogLevel()
    ConfigService.modifyLogLevel(LogLevel.Info)
    expect(testLogger.getLogLevel()).toEqual(LogLevel.Info)
    expect(
      ConfigService.LoggingFactory.getLogger('test1').getLogLevel()
    ).toEqual(LogLevel.Info)

    ConfigService.modifyLogLevel(-100)
    expect(testLogger.getLogLevel()).toEqual(0)
    ConfigService.modifyLogLevel(initialLevel)
    expect(testLogger.getLogLevel()).toEqual(initialLevel)
  })
})

describe('Configuration Service', () => {
  it('has configuration Object with default values', () => {
    expect(ConfigService.get('logLevel')).toEqual(LogLevel.Error)
    expect(() => ConfigService.get('address')).toThrowError(
      SDKErrors.ERROR_WS_ADDRESS_NOT_SET
    )
  })
  describe('set function for host address, logLevel and any custom configuration prop', () => {
    it('host address', () => {
      ConfigService.set({ address: 'host' })
      expect(ConfigService.get('address')).toEqual('host')
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
  describe('get function for host address, logLevel and any other injected configuration prop', () => {
    it('returns address property', () => {
      ConfigService.set({ address: 'host' })
      expect(ConfigService.get('address')).toEqual('host')
    })
    it('throws if address not set', () => {
      ConfigService.set({ address: '' })
      expect(() => ConfigService.get('address')).toThrowError(
        SDKErrors.ERROR_WS_ADDRESS_NOT_SET
      )
      ConfigService.set({ address: undefined })
      expect(() => ConfigService.get('address')).toThrowError(
        SDKErrors.ERROR_WS_ADDRESS_NOT_SET
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
