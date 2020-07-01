import { LogLevel, Logger } from 'typescript-logging'
import { factory, modifyLogLevel } from './ConfigLog'

describe('Log COnfiguration', () => {
  let testLogger: Logger
  beforeEach(() => {
    testLogger = factory.getLogger('testLogger')
  })
  it('Tests the default Log Level', () => {
    if (process.env.DEBUG === 'true') {
      expect(testLogger.getLogLevel()).toEqual(LogLevel.Debug)
    } else expect(testLogger.getLogLevel()).toEqual(LogLevel.Error)
  })
  it('modifies the Log Level of all Loggers to the desired Level', () => {
    const initialLevel = testLogger.getLogLevel()
    modifyLogLevel(LogLevel.Info)
    expect(testLogger.getLogLevel()).toEqual(LogLevel.Info)
    expect(factory.getLogger('test1').getLogLevel()).toEqual(LogLevel.Info)

    modifyLogLevel(-100)
    expect(testLogger.getLogLevel()).toEqual(0)
    modifyLogLevel(initialLevel)
    expect(testLogger.getLogLevel()).toEqual(initialLevel)
  })
})
