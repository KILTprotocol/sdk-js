/**
 * @group unit/utils
 */

import UUID from './UUID'

describe('UUID', () => {
  it('generate', () => {
    const uuid: string = UUID.generate()
    expect(uuid.substr(0, 2)).toEqual('0x')
    expect(uuid.substr(2)).toHaveLength(64)
  })
})
