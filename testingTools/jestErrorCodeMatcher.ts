/* eslint-disable @typescript-eslint/no-namespace */
export {}

interface CodedError {
  errorCode: number
}
declare global {
  namespace jest {
    interface Matchers<R> {
      toThrowErrorWithCode(errorOrCode: number | CodedError): R
    }
  }
}

expect.extend({
  toThrowErrorWithCode(
    received: Error | (() => any),
    errorOrCode: number | CodedError
  ) {
    const not = this.isNot
    const expectedErrorCode =
      typeof errorOrCode === 'object'
        ? (errorOrCode.errorCode as number)
        : errorOrCode
    let error: any
    if (received instanceof Function) {
      try {
        received()
        return { pass: false, message: () => 'Received function did not throw' }
      } catch (e) {
        error = e
      }
    } else if (received instanceof Error) {
      error = received
    } else {
      throw new TypeError(
        `expect.toThrowErrorWithCode expects a Function or Error, received: ${typeof received}`
      )
    }
    const receivedErrorCode: Number | undefined = error.errorCode
    const message = (): string =>
      not
        ? `Expected: error.errorCode ${this.utils.printExpected(
            `!= ${expectedErrorCode}`
          )}\n` +
          `Received: error.errorCode ${this.utils.printExpected(
            `= ${expectedErrorCode}`
          )}`
        : `Expected: error.errorCode = ${this.utils.printExpected(
            expectedErrorCode
          )}\n` +
          `Received: error.errorCode = ${this.utils.printReceived(
            receivedErrorCode
          )}`
    return { pass: expectedErrorCode === receivedErrorCode, message }
  },
})
