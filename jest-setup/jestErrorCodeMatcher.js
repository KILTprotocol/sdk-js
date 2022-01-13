/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */
expect.extend({
    toThrowErrorWithCode(received, errorOrCode) {
        const not = this.isNot;
        const expectedErrorCode = typeof errorOrCode === 'object'
            ? errorOrCode.errorCode
            : errorOrCode;
        let error;
        if (received instanceof Function) {
            try {
                received();
                return { pass: false, message: () => 'Received function did not throw' };
            }
            catch (e) {
                error = e;
            }
        }
        else if (received instanceof Error) {
            error = received;
        }
        else {
            throw new TypeError(`expect.toThrowErrorWithCode expects a Function or Error, received: ${typeof received}`);
        }
        const receivedErrorCode = error.errorCode;
        const message = () => not
            ? `Expected: error.errorCode ${this.utils.printExpected(`!= ${expectedErrorCode}`)}\n` +
                `Received: error.errorCode ${this.utils.printExpected(`= ${expectedErrorCode}`)}`
            : `Expected: error.errorCode = ${this.utils.printExpected(expectedErrorCode)}\n` +
                `Received: error.errorCode = ${this.utils.printReceived(receivedErrorCode)}`;
        return { pass: expectedErrorCode === receivedErrorCode, message };
    },
});
export {};
