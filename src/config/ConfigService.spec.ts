// import { ERROR_WS_ADDRESS_NOT_SET } from '../errorhandling/SDKErrors'
import { LogLevel, Logger } from 'typescript-logging'
import { ERROR_WS_ADDRESS_NOT_SET } from '../errorhandling/SDKErrors'
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
  it('exports mutable object with defaulted ws address and logLevel', () => {
    expect(ConfigService.configuration).toEqual({
      address: undefined,
      LogLevel: LogLevel.Error,
    })
    ConfigService.configuration.address = 'test'
    expect(ConfigService.configuration).toEqual({
      address: 'test',
      LogLevel: LogLevel.Error,
    })
  })
  describe('setConfiguration', () => {
    it('modifies exported configuration with passed arguments', () => {
      ConfigService.configuration.address = 'test'
      ConfigService.configuration.LogLevel = LogLevel.Error

      ConfigService.setConfiguration('modified', LogLevel.Info)
      expect(ConfigService.configuration).toEqual({
        address: 'modified',
        LogLevel: LogLevel.Info,
      })
    })
    it('throws error if no default address set and passed and does not change configuration', () => {
      ConfigService.configuration.address = undefined
      ConfigService.configuration.LogLevel = LogLevel.Error
      expect(() => ConfigService.setConfiguration('', LogLevel.Info)).toThrow(
        ERROR_WS_ADDRESS_NOT_SET()
      )
      expect(ConfigService.configuration).toEqual({
        address: undefined,
        LogLevel: LogLevel.Error,
      })
    })
  })
  describe('getNodeAddress', () => {
    it('returns exported configurations address property', () => {
      ConfigService.configuration.address = 'test'
      expect(ConfigService.getNodeAddress()).toEqual('test')
    })
    it('throws error if exported configurations address property is undefined or empty string', () => {
      ConfigService.configuration.address = ''
      expect(() => ConfigService.getNodeAddress()).toThrowError(
        ERROR_WS_ADDRESS_NOT_SET()
      )
      ConfigService.configuration.address = undefined
      expect(() => ConfigService.getNodeAddress()).toThrowError(
        ERROR_WS_ADDRESS_NOT_SET()
      )
    })
  })
})
