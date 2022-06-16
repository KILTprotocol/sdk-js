import type * as KiltNamespace from '@kiltprotocol/sdk-js'

declare global {
  interface Window {
    kilt: typeof KiltNamespace
    runAll: () => Promise<void>
  }
}
