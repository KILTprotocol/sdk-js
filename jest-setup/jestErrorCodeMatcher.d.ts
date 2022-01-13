/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */
export {};
interface CodedError {
    errorCode: number;
}
declare global {
    namespace jest {
        interface Matchers<R> {
            toThrowErrorWithCode(errorOrCode: number | CodedError): R;
        }
    }
}
