/* eslint-disable @typescript-eslint/ban-ts-comment */
import { ApiPromise, SubmittableResult } from '@polkadot/api'
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

  const modules = [
    {
      events: {
        isEmpty: false,
      },
      name: {
        toString: jest.fn(() => {
          return 'system'
        }),
      },
    },
    {
      events: {
        isEmpty: true,
      },
      name: {
        toString: jest.fn(() => {
          return 'balances'
        }),
      },
    },
    {
      events: {
        isEmpty: false,
      },
      name: {
        toString: jest.fn(() => {
          return 'Error'
        }),
      },
    },
  ]

  const apiPromise: ApiPromise = {
    runtimeMetadata: {
      asV11: {
        // @ts-ignore
        modules,
      },
    },
  }
  it('test get error module index', async () => {
    // @ts-ignore
    expect(await ErrorHandler.getErrorModuleIndex(apiPromise)).toBe(1)
  })

  it('test get extrinsic error', async () => {
    const errorHandler: ErrorHandler = new ErrorHandler(apiPromise)
    // @ts-ignore
    errorHandler.moduleIndex = 1

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
        index: [1],
        data: [errorCode],
      },
    }
    const submittableResult: SubmittableResult = {
      // @ts-ignore
      events: [errorEventRecord],
    }

    // @ts-ignore
    expect(errorHandler.getExtrinsicError(submittableResult)).toBe(
      ERROR_CTYPE_NOT_FOUND
    )
  })
})
