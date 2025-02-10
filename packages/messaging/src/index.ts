/**
 * Copyright (c) 2025, KILT Foundation.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * KILT participants can communicate via a 1:1 messaging system.
 *
 * All messages are **encrypted** with the encryption keys of the involved identities.
 * Messages are encrypted using authenticated encryption: the two parties authenticate to each other, but the message authentication provides repudiation possibilities.
 *
 * The [[Message]] class exposes methods to construct and verify messages.
 *
 * @module @kiltprotocol/messaging
 */

export * from './Message.js'
