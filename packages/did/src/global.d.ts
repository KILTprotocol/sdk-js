import type { URL as NodeURL } from 'url'

declare global {
  class URL extends NodeURL {}
}

export {}