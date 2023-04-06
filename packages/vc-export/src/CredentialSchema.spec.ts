/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group unit/vc-export
 */

import { CType } from '@kiltprotocol/core'
import { randomAsHex, randomAsU8a } from '@polkadot/util-crypto'
import { validateSubject } from './CredentialSchema'
import {
  attestation,
  credential,
  cType,
} from './exportToVerifiableCredential.spec'
import { exportICredentialToVc } from './fromICredential'
import { validateStructure } from './KiltCredentialV1'
import type { KiltCredentialV1 } from './types'

let VC: KiltCredentialV1
const timestamp = 1234567
const blockHash = randomAsU8a(32)
const attester = attestation.owner

beforeAll(() => {
  VC = exportICredentialToVc(credential, {
    issuer: attester,
    blockHash,
    timestamp,
    cType,
  })
})

it('exports to VC including ctype as schema', () => {
  expect(VC).toMatchObject({
    credentialSchema: {
      id: cType.$id,
      name: cType.title,
      type: 'JsonSchemaValidator2018',
      schema: cType,
    },
  })
  expect(() => validateStructure(VC)).not.toThrow()
})

it('it verifies valid claim against schema', () => {
  expect(() => validateSubject(VC)).not.toThrow()
})

it('it detects schema violations', () => {
  const credentialSubject = { ...VC.credentialSubject, name: 5 }
  expect(() => validateSubject({ ...VC, credentialSubject })).toThrow()
})

it('accepts passing in CType if not part of credential', () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { schema, ...credentialSchema } = VC.credentialSchema
  const vcNoSchema = {
    ...VC,
    credentialSchema,
  }
  expect(() => validateSubject(vcNoSchema, cType)).not.toThrow()
  expect(() => validateSubject(vcNoSchema)).toThrow()
  expect(() =>
    validateSubject(vcNoSchema, {
      ...cType,
      $id: CType.hashToId(randomAsHex()),
    })
  ).toThrow()
})
