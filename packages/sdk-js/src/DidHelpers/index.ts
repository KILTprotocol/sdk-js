/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

export { createDid } from './createDid.js'
export { deactivateDid } from './deactivateDid.js'
export { selectSigner } from './selectSigner.js'
export { addService, removeService } from './service.js'
export { transact } from './transact.js'
export {
  removeVerificationMethod,
  setVerificationMethod,
} from './verificationMethod.js'
export { claimWeb3Name, releaseWeb3Name } from './w3names.js'
