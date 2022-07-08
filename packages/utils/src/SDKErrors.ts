/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
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

export class SDKError extends Error {
  constructor(message?: string) {
    super(message)
    // this line is the only reason for using SDKError
    this.name = this.constructor.name
  }
}

export class UnauthorizedError extends SDKError {}

export class CTypeHashMissingError extends SDKError {}

export class CTypeIdMismatchError extends SDKError {
  constructor(fromSchema: string, provided: string) {
    super(
      `Provided $id "${provided}" does not match schema $id "${fromSchema}"`
    )
  }
}

export class CTypeUnknownPropertiesError extends SDKError {}

export class UnsupportedKeyError extends SDKError {
  constructor(keyType: string) {
    super(`The provided key type "${keyType}" is currently not supported`)
  }
}

export class EncryptionError extends SDKError {}

export class DidError extends SDKError {}

export class DidExporterError extends SDKError {}

export class DidBuilderError extends SDKError {}

export class Web3NameError extends SDKError {}

export class ClaimHashMissingError extends SDKError {}

export class RevokedTypeError extends SDKError {}

export class OwnerMissingError extends SDKError {}

export class AttestationMissingError extends SDKError {}

export class RequestForAttestationMissingError extends SDKError {}

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

export class DelegationIdTypeError extends SDKError {}

export class DelegationIdMissingError extends SDKError {}

export class DelegationSignatureMissingError extends SDKError {
  constructor() {
    // TODO: better name
    super("Delegatee's signature missing")
  }
}

export class InvalidRootNodeError extends SDKError {}

export class InvalidDelegationNodeError extends SDKError {}

export class ClaimContentsMalformedError extends SDKError {}

export class ObjectUnverifiableError extends SDKError {}

export class CTypeOwnerTypeError extends SDKError {}

export class QuoteUnverifiableError extends SDKError {}

export class ClaimNonceMapMalformedError extends SDKError {
  constructor(statement?: string) {
    if (statement) {
      super(`Nonce map malformed or incomplete for statement "${statement}"`)
    } else {
      super(`Nonce map malformed or incomplete`)
    }
  }
}

export class UnknownMessageBodyTypeError extends SDKError {}

export class SignatureMalformedError extends SDKError {}

export class DidIdentifierMismatchError extends SDKError {
  constructor(identifier: string, id: string) {
    super(
      `The identifier "${identifier}" doesn't match the DID Document's identifier "${id}"`
    )
  }
}

export class HierarchyQueryError extends SDKError {
  constructor(rootId: string) {
    super(`Could not find root node with id "${rootId}"`)
  }
}

export class InvalidDidFormatError extends SDKError {
  constructor(identifier: string) {
    super(`Not a valid KILT DID "${identifier}"`)
  }
}

export class UnsupportedDidError extends SDKError {
  constructor(input: string) {
    super(`The DID "${input}" is not supported`)
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

export class NestedClaimUnverifiableError extends SDKError {}

export class IdentityMismatchError extends SDKError {
  constructor(context?: string, type?: string) {
    if (type && context) {
      super(`${type} is not owner of the ${context}`)
    } else if (context) {
      super(`Identity is not owner of the ${context}`)
    } else {
      super('Addresses expected to be equal mismatched')
    }
  }
}

export class WsAddressNotSetError extends SDKError {
  constructor() {
    super('Node address to connect to not configured!')
  }
}

export class RootHashUnverifiableError extends SDKError {}

export class DecompressionArrayError extends SDKError {
  constructor(type = 'object') {
    super(`Provided compressed ${type} not an Array or not of defined length`)
  }
}

export class CompressObjectError extends SDKError {
  constructor(object?: Record<string, any>, type?: string) {
    if (object) {
      const json = JSON.stringify(object, null, 2)
      if (type) {
        super(`Property Not Provided while compressing ${type}:\n${json}`)
      } else {
        super(`Property Not Provided while compressing object:\n${json}`)
      }
    } else {
      super(`Property Not Provided while compressing object`)
    }
  }
}

export class DecodingMessageError extends SDKError {}

export class ParsingMessageError extends SDKError {}

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
