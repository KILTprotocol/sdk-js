/* eslint-disable @typescript-eslint/ban-ts-comment */
import { SubmittableResult } from '@polkadot/api'
import { Tuple } from '@polkadot/types'
import { ErrorHandler } from './ErrorHandler'
import { ErrorCode, ERROR_CTYPE_NOT_FOUND } from './ExtrinsicError'

describe('ErrorHandler', () => {
  it('test extrinsic failed', () => {
    const evtRecord = {
      phase: {
        asApplyExtrinsic: {
          isEmpty: false,
        },
      },
      event: {
        index: {
          toHex: jest.fn(() => {
            return '0x0001'
          }),
        },
      },
    }
    const submittableResult: SubmittableResult = {
      // @ts-ignore
      events: [evtRecord],
    }

    expect(ErrorHandler.extrinsicFailed(submittableResult)).toBeTruthy()
  })

  it('test extrinsic succeeded', () => {
    const evtRecord = {
      phase: {
        asApplyExtrinsic: {
          isEmpty: false,
        },
      },
      event: {
        index: {
          toHex: jest.fn(() => {
            return '0x0000'
          }),
        },
      },
    }
    const submittableResult: SubmittableResult = {
      // @ts-ignore
      events: [evtRecord],
    }

    expect(ErrorHandler.extrinsicFailed(submittableResult)).toBeFalsy()
  })

  it('test get extrinsic error', async () => {
    // @ts-ignore
    const errorCode: Tuple = {
      // @ts-ignore
      toJSON: jest.fn(() => {
        return ErrorCode.ERROR_CTYPE_NOT_FOUND
      }),
    }
    const errorEventRecord = {
      phase: {
        asApplyExtrinsic: {
          isEmpty: false,
        },
      },
      event: {
        section: 'error',
        data: [errorCode],
      },
    }
    const submittableResult: SubmittableResult = {
      // @ts-ignore
      events: [errorEventRecord],
    }

    // @ts-ignore
    expect(ErrorHandler.getExtrinsicError(submittableResult)).toBe(
      ERROR_CTYPE_NOT_FOUND
    )
  })
})
