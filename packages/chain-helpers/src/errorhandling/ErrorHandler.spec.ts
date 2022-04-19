/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group unit/errorhandling
 */

import type { ISubmittableResult } from '@kiltprotocol/types'
import type { EventRecord } from '@polkadot/types/interfaces'
import { ErrorHandler } from './index'

describe('ErrorHandler', () => {
  it('test extrinsic failed', () => {
    const evtRecord = {
      event: {
        section: 'system',
        method: 'ExtrinsicFailed',
      },
    }
    const submittableResult = {
      events: [evtRecord] as unknown as EventRecord[],
    } as ISubmittableResult

    expect(ErrorHandler.extrinsicFailed(submittableResult)).toBeTruthy()
  })

  it('test extrinsic succeeded', () => {
    const evtRecord = {
      event: {
        section: 'system',
        method: 'ExtrinsicSuccess',
      },
    }
    const submittableResult = {
      events: [evtRecord] as unknown as EventRecord[],
    } as ISubmittableResult

    expect(ErrorHandler.extrinsicFailed(submittableResult)).toBeFalsy()
  })
})
