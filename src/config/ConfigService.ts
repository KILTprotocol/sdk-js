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

const DEFAULT_DEBUG_LEVEL =
  process.env.DEBUG && process.env.DEBUG === 'true'
    ? LogLevel.Debug
    : LogLevel.Error

export interface configOpts {
  address?: string
  logLevel: LogLevel
}

/**
 *  Changes all existing Loggers of our default Factory with id 0 to the intended Level.
 *
 * @param level The intended LogLevel. LogLevel has a range of 0 to 5.
 * @returns The new set level.
 */
export function modifyLogLevel(level: LogLevel): LogLevel {
  // eslint-disable-next-line no-nested-ternary
  const actualLevel = level > 0 ? (level > 5 ? 5 : level) : 0
  getLogControl()
    .getLoggerFactoryControl(0)
    .change({
      group: 'all',
      logLevel: LogLevel[actualLevel],
    } as LogGroupControlSettings)
  return actualLevel
}

export class ConfigService {
  private readonly props: configOpts

  public constructor(config: configOpts) {
    this.props = config
  }

  get host(): string {
    if (!this.props.address) {
      throw ERROR_WS_ADDRESS_NOT_SET()
    }
    return this.props.address
  }

  set host(address: string) {
    this.props.address = address
  }

  get logging(): LogLevel {
    return this.props.logLevel
  }

  set logging(level: LogLevel) {
    this.props.logLevel = modifyLogLevel(level)
  }
}

export const configuration = new ConfigService({
  logLevel: DEFAULT_DEBUG_LEVEL,
})

// Create options instance and specify 1 LogGroupRule:
// * LogLevel Error on default, env DEBUG = 'true' changes Level to Debug.throws
const options = new LoggerFactoryOptions().addLogGroupRule(
  new LogGroupRule(new RegExp('.+'), configuration.logging)
)
// Create a named loggerfactory and pass in the options and export the factory.
// Named is since version 0.2.+ (it's recommended for future usage)
// eslint-disable-next-line import/prefer-default-export
export const factory = LFService.createNamedLoggerFactory(
  'LoggerFactory',
  options
)
