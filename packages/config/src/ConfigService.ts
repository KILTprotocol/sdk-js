/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * The ConfigService is used for setting up the node address,
 * the logging level as well as storing custom configuration options.
 *
 * @packageDocumentation
 */

import {
  LFService,
  LoggerFactoryOptions,
  LogGroupRule,
  LogLevel,
  getLogControl,
  LogGroupControlSettings,
} from 'typescript-logging'
import { SDKErrors } from '@kiltprotocol/utils'

const DEFAULT_DEBUG_LEVEL =
  typeof process !== 'undefined' &&
  process.env?.DEBUG &&
  process.env.DEBUG === 'true'
    ? LogLevel.Debug
    : LogLevel.Error

export type configOpts = {
  address: string
  logLevel: LogLevel
} & { [key: string]: any }

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

let configuration: configOpts = {
  logLevel: DEFAULT_DEBUG_LEVEL,
  address: '',
}

function checkAddress(): void {
  if (!configuration.address) {
    throw new SDKErrors.ERROR_WS_ADDRESS_NOT_SET()
  }
}

/**
 * Get the value set for a configuration.
 *
 * @param configOpt Key of the configuration.
 * @returns Value for this key.
 */
export function get<K extends keyof configOpts>(configOpt: K): configOpts[K] {
  switch (configOpt) {
    case 'address':
      checkAddress()
      break
    default:
  }
  if (typeof configuration[configOpt] === 'undefined')
    throw new Error(`GENERIC NOT CONFIGURED ERROR FOR KEY: "${configOpt}"`)
  return configuration[configOpt]
}

function setLogLevel(logLevel: LogLevel | undefined): void {
  if (logLevel || logLevel === 0) {
    modifyLogLevel(logLevel)
  }
}

/**
 * Set values for one or multiple configurations.
 *
 * @param opts Object of configurations as key-value pairs.
 */
export function set<K extends Partial<configOpts>>(opts: K): void {
  configuration = { ...configuration, ...opts }
  setLogLevel(configuration.logLevel)
}

// Create options instance and specify 1 LogGroupRule:
// * LogLevel Error on default, env DEBUG = 'true' changes Level to Debug.throws
const options = new LoggerFactoryOptions().addLogGroupRule(
  new LogGroupRule(new RegExp('.+'), get('logLevel'))
)
// Create a named loggerfactory and pass in the options and export the factory.
// Named is since version 0.2.+ (it's recommended for future usage)
export const LoggingFactory = LFService.createNamedLoggerFactory(
  'LoggerFactory',
  options
)
