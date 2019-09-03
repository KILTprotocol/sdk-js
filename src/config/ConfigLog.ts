/**
 * Config is used to configure logging.
 * @module Config
 * @preferred
 */

/**
 * Dummy comment needed for correct doc display, do not remove
 */
import {
  LoggerFactoryOptions,
  LFService,
  LogGroupRule,
  LogLevel,
} from 'typescript-logging'

// Create options instance and specify 2 LogGroupRules:
// * One for any logger with a name starting with model, to log on debug
// * The second one for anything else to log on info
const options = new LoggerFactoryOptions().addLogGroupRule(
  new LogGroupRule(new RegExp('.+'), LogLevel.Debug)
)

// Create a named loggerfactory and pass in the options and export the factory.
// Named is since version 0.2.+ (it's recommended for future usage)
// eslint-disable-next-line import/prefer-default-export
export const factory = LFService.createNamedLoggerFactory(
  'LoggerFactory',
  options
)
