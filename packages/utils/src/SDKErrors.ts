/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * KILT-specific errors with descriptions.
 *
 * @packageDocumentation
 */

/* eslint-disable max-classes-per-file */

import type { SignerInterface } from '@kiltprotocol/types'

export class SDKError extends Error {
  constructor(message?: string, options?: ErrorOptions) {
    super(message, options)
    // this line is the only reason for using SDKError
    this.name = this.constructor.name
  }
}

export class UnauthorizedError extends SDKError {}

export class CTypeHashMissingError extends SDKError {}

export class CTypeError extends SDKError {}

export class CTypeIdMismatchError extends SDKError {
  constructor(fromSchema: string, provided: string) {
    super(
      `Provided $id "${provided}" does not match schema $id "${fromSchema}"`
    )
  }
}

export class UnsupportedKeyError extends SDKError {
  constructor(keyType: string) {
    super(`The provided key type "${keyType}" is currently not supported`)
  }
}

export class EncryptionError extends SDKError {}

export class DidError extends SDKError {}

export class DidBatchError extends SDKError {}

export class DidNotFoundError extends SDKError {}

export class DidResolveUpgradedDidError extends SDKError {}

export class DidDeactivatedError extends SDKError {}

export class ClaimHashMissingError extends SDKError {}

export class RevokedTypeError extends SDKError {}

export class OwnerMissingError extends SDKError {}

export class SubjectMissingError extends SDKError {}

export class LegitimationsMissingError extends SDKError {}

export class ClaimNonceMapMissingError extends SDKError {}

export class ClaimMissingError extends SDKError {}

export class AddressTypeError extends SDKError {}

export class HashTypeError extends SDKError {}

export class HashMalformedError extends SDKError {
  constructor(hash?: string, type?: string) {
    if (hash && type) {
      super(`Provided ${type} hash "${hash}" is invalid or malformed`)
    } else if (hash) {
      super(`Provided hash "${hash}" is invalid or malformed`)
    } else {
      super('Provided hash invalid or malformed')
    }
  }
}

export class DataStructureError extends SDKError {}

export class DelegationIdTypeError extends SDKError {}

export class DelegationIdMissingError extends SDKError {}

export class DelegateSignatureMissingError extends SDKError {}

export class InvalidRootNodeError extends SDKError {}

export class InvalidDelegationNodeError extends SDKError {}

export class ClaimContentsMalformedError extends SDKError {}

export class ObjectUnverifiableError extends SDKError {}

export class ClaimNonceMapMalformedError extends SDKError {
  constructor(statement?: string) {
    if (statement) {
      super(`Nonce map malformed or incomplete for statement "${statement}"`)
    } else {
      super(`Nonce map malformed or incomplete`)
    }
  }
}

export class SignatureMalformedError extends SDKError {}

export class NoSuitableSignerError extends SDKError {
  constructor(
    message?: string,
    options?: ErrorOptions & {
      signerRequirements?: Record<string, unknown>
      availableSigners?: readonly SignerInterface[]
    }
  ) {
    const { signerRequirements, availableSigners } = options ?? {}
    const msgs = [message ?? 'No suitable signers provided to this function.']
    if (signerRequirements) {
      msgs.push(
        `Expected signer matching conditions ${JSON.stringify(
          signerRequirements,
          null,
          2
        )}.`
      )
    }
    if (availableSigners) {
      msgs.push(
        `Signers available: ${JSON.stringify(availableSigners, null, 2)}.`
      )
    }
    super(msgs.join('\n'), options)
  }
}

export class DidSubjectMismatchError extends SDKError {
  constructor(actual: string, expected: string) {
    super(
      `The DID "${actual}" doesn't match the DID Document's id "${expected}"`
    )
  }
}

export class HierarchyQueryError extends SDKError {
  constructor(rootId: string) {
    super(`Could not find root node with id "${rootId}"`)
  }
}

export class InvalidDidFormatError extends SDKError {
  constructor(did: string, options?: ErrorOptions) {
    super(`Not a valid KILT DID "${did}"`, options)
  }
}

export class AddressInvalidError extends SDKError {
  constructor(address?: string, type?: string) {
    if (address && type) {
      super(`Provided ${type} address "${address}" is invalid`)
    } else if (address) {
      super(`Provided address "${address}" is invalid`)
    } else {
      super(`Provided address invalid`)
    }
  }
}

export class LegitimationsUnverifiableError extends SDKError {}

export class SignatureUnverifiableError extends SDKError {}

export class CredentialUnverifiableError extends SDKError {}

export class ClaimUnverifiableError extends SDKError {}

export class SubscriptionsNotSupportedError extends SDKError {
  constructor(options?: ErrorOptions) {
    super(
      'This function is not available if the blockchain API does not support state or event subscriptions, use `WsProvider` to enable the complete feature set',
      options
    )
  }
}

export class RootHashUnverifiableError extends SDKError {}

export class TimeoutError extends SDKError {}

export class InvalidProofForStatementError extends SDKError {
  constructor(statement: string) {
    super(`Proof could not be verified for statement:\n${statement}`)
  }
}

export class NoProofForStatementError extends SDKError {
  constructor(statement: string) {
    super(`No matching proof found for statement:\n${statement}`)
  }
}

export class CodecMismatchError extends SDKError {}

export class PublicCredentialError extends SDKError {}

export class CredentialMalformedError extends SDKError {}

export class PresentationMalformedError extends SDKError {}

export class ProofMalformedError extends SDKError {}
