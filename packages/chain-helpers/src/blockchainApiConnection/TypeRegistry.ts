import { types8 as KILT_TYPES } from '@kiltprotocol/type-definitions'
import { TypeRegistry } from '@polkadot/types'
import { Registry } from '@polkadot/types/types'

const TYPE_REGISTRY: Registry = new TypeRegistry()
TYPE_REGISTRY.register(KILT_TYPES)

export default TYPE_REGISTRY
export { KILT_TYPES, TYPE_REGISTRY }
