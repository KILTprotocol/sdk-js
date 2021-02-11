/**
 * @group unit/utils
 */

import { TypeRegistry } from '@polkadot/types'
import { assertCodecIsType, codecIsType } from './Decode'

const registry = new TypeRegistry()

const cases = ['Option<Text>', 'Option<AccountId>', 'Vec<Option<Text>>']

describe('positive tests', () => {
  it('checks codec types', () => {
    cases.forEach((T: any) => {
      expect(codecIsType(registry.createType(T), [T])).toBe(true)
    })
  })

  it('asserts codec types', () => {
    cases.forEach((T: any) => {
      expect(() => assertCodecIsType(registry.createType(T), [T])).not.toThrow()
    })
  })
})

describe('negative tests', () => {
  it('checks codec types', () => {
    cases.forEach((T: any, index) => {
      expect(
        codecIsType(
          registry.createType(T),
          cases.filter((_, i) => i !== index)
        )
      ).toBe(false)
    })
  })

  it('asserts codec types', () => {
    cases.forEach((T: any, index) => {
      expect(() =>
        assertCodecIsType(
          registry.createType(T),
          cases.filter((_, i) => i !== index)
        )
      ).toThrow()
    })
  })
})
