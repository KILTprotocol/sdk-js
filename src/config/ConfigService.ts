import { LogLevel } from 'typescript-logging'
import { ERROR_WS_ADDRESS_NOT_SET } from '../errorhandling/SDKErrors'
import { modifyLogLevel } from './ConfigLog'

const { DEFAULT_WS_ADDRESS } = process.env

const DEFAULT_DEBUG_LEVEL =
  process.env.DEBUG && process.env.DEBUG === 'true'
    ? LogLevel.Debug
    : LogLevel.Error

export const configuration = {
  address: DEFAULT_WS_ADDRESS,
  LogLevel: DEFAULT_DEBUG_LEVEL,
}

export function setConfiguration(nodeAddress?: string, level?: LogLevel): void {
  if (level) {
    modifyLogLevel(level)
    configuration.LogLevel = level
  }
  if (!nodeAddress && !DEFAULT_WS_ADDRESS) {
    throw ERROR_WS_ADDRESS_NOT_SET()
  }
  configuration.address = nodeAddress || DEFAULT_WS_ADDRESS
}

export function getNodeAddress(): string {
  if (!configuration.address) {
    throw ERROR_WS_ADDRESS_NOT_SET()
  }
  return configuration.address
}
