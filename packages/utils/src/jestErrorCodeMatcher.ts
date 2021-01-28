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
  toThrowErrorWithCode(received, errorOrCode: number | CodedError) {
    expect(received).toBeInstanceOf(Function)
    const not = this.isNot
    const errorCode =
      typeof errorOrCode === 'object'
        ? (errorOrCode.errorCode as number)
        : errorOrCode
    try {
      received()
      return { pass: false, message: () => 'Received function did not throw' }
    } catch (error) {
      const message = (): string =>
        not
          ? `Expected: Not ${this.utils.printExpected(
              `error code ${errorCode}`
            )}\n` +
            `Received: ${this.utils.printReceived(
              `error code ${error.errorCode}`
            )}`
          : `Expected: ${this.utils.printExpected(
              `error code ${errorCode}`
            )}\n` +
            `Received: ${this.utils.printReceived(
              `error code ${error.errorCode}`
            )}`
      return { pass: errorCode === error.errorCode, message }
    }
  },
})
