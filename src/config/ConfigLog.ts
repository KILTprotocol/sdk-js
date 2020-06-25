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
} from 'typescript-logging'

// Create options instance and specify 2 LogGroupRules:
// * One for any logger with a name starting with model, to log on debug
// * The second one for anything else to log on info
const options = new LoggerFactoryOptions().addLogGroupRule(
  new LogGroupRule(
    new RegExp('.+'),
    process.env.DEBUG && process.env.DEBUG === 'true'
      ? LogLevel.Debug
      : LogLevel.Error
  )
)
// Create a named loggerfactory and pass in the options and export the factory.
// Named is since version 0.2.+ (it's recommended for future usage)
// eslint-disable-next-line import/prefer-default-export
export const factory = LFService.createNamedLoggerFactory(
  'LoggerFactory',
  options
)

export function modifyLogLevel(level: number): void {
  let actualLevel
  if (level < 0) {
    actualLevel = 0
  } else if (level > 5) {
    actualLevel = 5
  } else actualLevel = level
  factory.configure(
    new LoggerFactoryOptions().addLogGroupRule(
      new LogGroupRule(new RegExp('.+'), actualLevel)
    )
  )
  // eslint-disable-next-line no-console
  console.log(`changed logging level to ${actualLevel}`)
  // eslint-disable-next-line no-console
  console.log(factory.getLogger('test').getLogLevel())
}
