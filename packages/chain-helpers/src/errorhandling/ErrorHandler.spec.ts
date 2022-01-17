/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group unit/errorhandling
 */

/* eslint-disable @typescript-eslint/ban-ts-comment */
import type { ISubmittableResult } from '@kiltprotocol/types'
import { DispatchError, EventRecord } from '@polkadot/types/interfaces'
import { ErrorHandler, PalletIndex } from './index'
import { ExtrinsicError, ExtrinsicErrors } from './ExtrinsicError'
import { TypeRegistry } from '../blockchainApiConnection'

describe('ErrorHandler', () => {
  it('test extrinsic failed', () => {
    const evtRecord = {
      phase: {
        isApplyExtrinsic: true,
      },
      event: {
        index: {
          toHex: jest.fn(() => {
            return '0x0001'
          }),
        },
      },
    }
    const submittableResult = {
      events: [evtRecord] as unknown as EventRecord[],
    } as ISubmittableResult

    expect(ErrorHandler.extrinsicFailed(submittableResult)).toBeTruthy()
  })

  it('test extrinsic succeeded', () => {
    const evtRecord = {
      phase: {
        isApplyExtrinsic: true,
      },
      event: {
        index: {
          toHex: jest.fn(() => {
            return '0x0000'
          }),
        },
      },
    }
    const submittableResult = {
      events: [evtRecord] as unknown as EventRecord[],
    } as ISubmittableResult

    expect(ErrorHandler.extrinsicFailed(submittableResult)).toBeFalsy()
  })

  it('test get extrinsic error', async () => {
    const dispatchError: DispatchError = TypeRegistry.createType(
      'DispatchError',
      { Module: { index: PalletIndex.CType, error: 0 } }
    )

    const errorEventRecord = {
      phase: {
        isApplyExtrinsic: true,
      },
      event: {
        section: 'system',
        data: [dispatchError],
      },
    }
    const submittableResult = {
      events: [errorEventRecord] as unknown as EventRecord[],
      dispatchError,
    } as ISubmittableResult

    const { code, message } = ExtrinsicErrors.CType.ERROR_CTYPE_NOT_FOUND

    // @ts-ignore
    expect(ErrorHandler.getExtrinsicError(submittableResult)).toStrictEqual(
      new ExtrinsicError(code, message)
    )
  })
})
