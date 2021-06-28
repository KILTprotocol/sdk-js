/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

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
