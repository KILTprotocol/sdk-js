/* eslint-disable dot-notation */
// import { ERROR_WS_ADDRESS_NOT_SET } from '../errorhandling/SDKErrors'
import { LogLevel, Logger } from 'typescript-logging'
import { ERROR_WS_ADDRESS_NOT_SET } from '../../packages/core/src/errorhandling/SDKErrors'
import * as ConfigService from './ConfigService'

describe('Log Configuration', () => {
  let testLogger: Logger
  beforeEach(() => {
    testLogger = ConfigService.factory.getLogger('testLogger')
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
    expect(ConfigService.factory.getLogger('test1').getLogLevel()).toEqual(
      LogLevel.Info
    )

    ConfigService.modifyLogLevel(-100)
    expect(testLogger.getLogLevel()).toEqual(0)
    ConfigService.modifyLogLevel(initialLevel)
    expect(testLogger.getLogLevel()).toEqual(initialLevel)
  })
})

describe('Configuration Service', () => {
  it('exports instance of ConfigService with defaulted logLevel and undefined host address', () => {
    expect(ConfigService.configuration['props'].logLevel).toEqual(
      LogLevel.Error
    )
    expect(ConfigService.configuration['props'].address).toEqual(undefined)
  })
  describe('implements set methods for host address and logLevel', () => {
    it('modifies exported instance config with passed arguments', () => {
      ConfigService.configuration.host = 'host'
      expect(ConfigService.configuration['props'].address).toEqual('host')

      ConfigService.configuration.logging = LogLevel.Warn
      expect(ConfigService.configuration['props'].logLevel).toEqual(
        LogLevel.Warn
      )
    })
  })
  describe('implements get methods for host address and logLevel', () => {
    it('returns address property', () => {
      const test = new ConfigService.ConfigService({
        address: 'testing',
        logLevel: LogLevel.Warn,
      })

      expect(test.host).toEqual('testing')
    })
    it('calling host get with no set host should throw error', () => {
      ConfigService.configuration['props'].address = ''
      expect(() => ConfigService.configuration.host).toThrowError(
        ERROR_WS_ADDRESS_NOT_SET()
      )
      ConfigService.configuration['props'].address = undefined
      expect(() => ConfigService.configuration.host).toThrowError(
        ERROR_WS_ADDRESS_NOT_SET()
      )
    })
    it('returns logLevel property', () => {
      const test = new ConfigService.ConfigService({
        address: 'testing',
        logLevel: LogLevel.Warn,
      })

      expect(test.logging).toEqual(LogLevel.Warn)
    })
  })
})
