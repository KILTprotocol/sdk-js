/**
 * Config is used to configure logging.
 *
 * @packageDocumentation
 * @ignore
 * @preferred
 */

import {
  LFService,
  LoggerFactoryOptions,
  LogGroupRule,
  LogLevel,
  getLogControl,
  LogGroupControlSettings,
} from 'typescript-logging'
import { ERROR_WS_ADDRESS_NOT_SET } from '../errorhandling/SDKErrors'

const { DEFAULT_WS_ADDRESS } = process.env

const DEFAULT_DEBUG_LEVEL =
  process.env.DEBUG && process.env.DEBUG === 'true'
    ? LogLevel.Debug
    : LogLevel.Error

// Use exported object in order to be able to mutate it.
export const configuration = {
  address: DEFAULT_WS_ADDRESS,
  LogLevel: DEFAULT_DEBUG_LEVEL,
}

/**
 *  Changes all existing Loggers of our default Factory with id 0 to the intended Level.
 *
 * @param level The intended LogLevel. LogLevel has a range of 0 to 5.
 */
export function modifyLogLevel(level: LogLevel): void {
  let actualLevel
  if (level < 0) {
    actualLevel = 0
  } else if (level > 5) {
    actualLevel = 5
  } else actualLevel = level
  getLogControl()
    .getLoggerFactoryControl(0)
    .change({
      group: 'all',
      logLevel: LogLevel[actualLevel],
    } as LogGroupControlSettings)
}

// Create options instance and specify 1 LogGroupRule:
// * LogLevel Error on default, env DEBUG = 'true' changes Level to Debug.throws
const options = new LoggerFactoryOptions().addLogGroupRule(
  new LogGroupRule(new RegExp('.+'), configuration.LogLevel)
)
// Create a named loggerfactory and pass in the options and export the factory.
// Named is since version 0.2.+ (it's recommended for future usage)
// eslint-disable-next-line import/prefer-default-export
export const factory = LFService.createNamedLoggerFactory(
  'LoggerFactory',
  options
)

export function setConfiguration(nodeAddress?: string, level?: LogLevel): void {
  if (!nodeAddress && !DEFAULT_WS_ADDRESS) {
    throw ERROR_WS_ADDRESS_NOT_SET()
  }
  if (level) {
    modifyLogLevel(level)
    configuration.LogLevel = level
  }
  configuration.address = nodeAddress || DEFAULT_WS_ADDRESS
}

export function getNodeAddress(): string {
  if (!configuration.address) {
    throw ERROR_WS_ADDRESS_NOT_SET()
  }
  return configuration.address
}
