/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * SDKErrors are KILT-specific errors, with associated codes and descriptions.
 *
 * @packageDocumentation
 */

/* eslint-disable max-classes-per-file */

export class ERROR_UNAUTHORIZED extends Error {}

export class ERROR_CTYPE_HASH_NOT_PROVIDED extends Error {
  constructor() {
    super('CType hash missing')
  }
}

export class ERROR_CTYPE_ID_NOT_MATCHING extends Error {
  constructor(fromSchema: string, provided: string) {
    super(
      `Provided $id "${provided}" and schema $id "${fromSchema}" are not matching`
    )
  }
}

export class ERROR_CTYPE_PROPERTIES_NOT_MATCHING extends Error {
  constructor() {
    super('Required properties do not match CType properties')
  }
}

export class ERROR_UNSUPPORTED_KEY extends Error {
  constructor(keyType: string) {
    super(`The provided key type "${keyType}" is currently not supported.`)
  }
}
export class ERROR_DID_ERROR extends Error {}
export class ERROR_KEYSTORE_ERROR extends Error {}
export class ERROR_DID_EXPORTER_ERROR extends Error {}
export class ERROR_DID_BUILDER_ERROR extends Error {}
export class ERROR_WEB3_NAME_ERROR extends Error {}

export class ERROR_CLAIM_HASH_NOT_PROVIDED extends Error {
  constructor() {
    super('Claim hash missing')
  }
}
export class ERROR_REVOCATION_BIT_MISSING extends Error {
  constructor() {
    super('Revoked identifier missing')
  }
}
export class ERROR_OWNER_NOT_PROVIDED extends Error {
  constructor() {
    super('Owner missing')
  }
}
export class ERROR_ATTESTATION_NOT_PROVIDED extends Error {
  constructor() {
    super('Attestation missing')
  }
}

export class ERROR_RFA_NOT_PROVIDED extends Error {
  constructor() {
    super('RequestForAttestation missing')
  }
}

export class ERROR_LEGITIMATIONS_NOT_PROVIDED extends Error {
  constructor() {
    super('Legitimations missing')
  }
}
export class ERROR_CLAIM_NONCE_MAP_NOT_PROVIDED extends Error {
  constructor() {
    super('Hashtree in Claim missing')
  }
}
export class ERROR_CLAIM_NOT_PROVIDED extends Error {
  constructor() {
    super('Claim missing')
  }
}
export class ERROR_ADDRESS_TYPE extends Error {
  constructor() {
    super('Address of wrong type')
  }
}
export class ERROR_HASH_TYPE extends Error {
  constructor() {
    super('Hash of wrong type')
  }
}

export class ERROR_HASH_MALFORMED extends Error {
  constructor(hash?: string, type?: string) {
    let message = ''
    if (hash && type) {
      message = `Provided ${type} hash invalid or malformed \nHash: ${hash}`
    } else if (hash) {
      message = `Provided hash invalid or malformed \nHash: ${hash}`
    } else {
      message = 'Provided hash invalid or malformed'
    }
    super(message)
  }
}

export class ERROR_DELEGATION_ID_TYPE extends Error {
  constructor() {
    super('DelegationId of wrong type')
  }
}

export class ERROR_DELEGATION_ID_MISSING extends Error {
  constructor() {
    super('DelegationId is missing')
  }
}

export class ERROR_DELEGATION_SIGNATURE_MISSING extends Error {
  constructor() {
    super("Delegatee's signature missing")
  }
}

export class ERROR_INVALID_ROOT_NODE extends Error {
  constructor() {
    super('The given node is not a valid root node')
  }
}

export class ERROR_INVALID_DELEGATION_NODE extends Error {
  constructor() {
    super('The given node is not a valid delegation node')
  }
}

export class ERROR_CLAIM_CONTENTS_MALFORMED extends Error {
  constructor() {
    super('Claim contents malformed')
  }
}
export class ERROR_OBJECT_MALFORMED extends Error {
  constructor() {
    super('Object form is not verifiable')
  }
}
export class ERROR_CTYPE_OWNER_TYPE extends Error {
  constructor() {
    super('CType owner of wrong type')
  }
}
export class ERROR_QUOTE_MALFORMED extends Error {
  constructor() {
    super('Quote form is not verifiable')
  }
}

export class ERROR_CLAIM_NONCE_MAP_MALFORMED extends Error {
  constructor(statement?: string) {
    let message = ''
    if (statement) {
      message = `Nonce map malformed or incomplete: no nonce for statement "${statement}"`
    } else {
      message = `Nonce map malformed or incomplete`
    }
    super(message)
  }
}

export class ERROR_MESSAGE_BODY_MALFORMED extends Error {
  constructor() {
    super('Message body is malformed or wrong type')
  }
}

export class ERROR_SIGNATURE_DATA_TYPE extends Error {
  constructor() {
    super('Signature malformed')
  }
}
export class ERROR_DID_IDENTIFIER_MISMATCH extends Error {
  constructor(identifier: string, id: string) {
    super(
      `This identifier (${identifier}) doesn't match the DID Document's identifier (${id})`
    )
  }
}
export class ERROR_HIERARCHY_QUERY extends Error {
  constructor(rootId: string) {
    super(`Could not find root node with id ${rootId}`)
  }
}
export class ERROR_INVALID_DID_FORMAT extends Error {
  constructor(identifier: string) {
    super(`Not a valid KILT did: ${identifier}`)
  }
}
export class ERROR_UNSUPPORTED_DID extends Error {
  constructor(input: string) {
    super(`The DID ${input} is not supported.`)
  }
}

export class ERROR_ADDRESS_INVALID extends Error {
  constructor(address?: string, type?: string) {
    let message = ''
    if (address && type) {
      message = `Provided ${type} address invalid \n\n    Address: ${address}`
    } else if (address) {
      message = `Provided address invalid \n\n    Address: ${address}`
    } else {
      message = `Provided address invalid`
    }
    super(message)
  }
}

export class ERROR_LEGITIMATIONS_UNVERIFIABLE extends Error {
  constructor() {
    super('Legitimations could not be verified')
  }
}
export class ERROR_SIGNATURE_UNVERIFIABLE extends Error {
  constructor() {
    super('Signature could not be verified')
  }
}
export class ERROR_CREDENTIAL_UNVERIFIABLE extends Error {
  constructor() {
    super('Credential could not be verified')
  }
}

export class ERROR_CLAIM_UNVERIFIABLE extends Error {
  constructor() {
    super('Claim could not be verified')
  }
}

export class ERROR_NESTED_CLAIM_UNVERIFIABLE extends Error {
  constructor() {
    super('Nested claim data does not validate against CType')
  }
}

export class ERROR_IDENTITY_MISMATCH extends Error {
  constructor(context?: string, type?: string) {
    let message = ''
    if (type && context) {
      message = `${type} is not owner of the ${context}`
    } else if (context) {
      message = `Identity is not owner of the ${context}`
    } else {
      message = 'Addresses expected to be equal mismatched'
    }
    super(message)
  }
}

export class ERROR_WS_ADDRESS_NOT_SET extends Error {
  constructor() {
    super('Node address to connect to not configured!')
  }
}

export class ERROR_ROOT_HASH_UNVERIFIABLE extends Error {
  constructor() {
    super('RootHash could not be verified')
  }
}

export class ERROR_DECOMPRESSION_ARRAY extends Error {
  constructor(type?: string) {
    let message = ''
    if (type) {
      message = `Provided compressed ${type} not an Array or not of defined length`
    } else {
      message =
        'Provided compressed object not an Array or not of defined length'
    }
    super(message)
  }
}

export class ERROR_COMPRESS_OBJECT extends Error {
  constructor(object?: Record<string, any>, type?: string) {
    let message = ''
    if (object && type) {
      message = `Property Not Provided while compressing ${type}:\n${JSON.stringify(
        object,
        null,
        2
      )}`
    } else if (object) {
      message = `Property Not Provided while compressing object:\n${JSON.stringify(
        object,
        null,
        2
      )}`
    } else {
      message = `Property Not Provided while compressing object`
    }

    super(message)
  }
}

export class ERROR_DECODING_MESSAGE extends Error {
  constructor() {
    super('Error decoding message')
  }
}
export class ERROR_PARSING_MESSAGE extends Error {
  constructor() {
    super('Error parsing message body')
  }
}

export class ERROR_TIMEOUT extends Error {
  constructor() {
    super('operation timed out')
  }
}

export class ERROR_INVALID_PROOF_FOR_STATEMENT extends Error {
  constructor(statement: string) {
    super(`Proof could not be verified for statement\n${statement}`)
  }
}

export class ERROR_NO_PROOF_FOR_STATEMENT extends Error {
  constructor(statement: string) {
    super(`No matching proof found for statement\n${statement}`)
  }
}
