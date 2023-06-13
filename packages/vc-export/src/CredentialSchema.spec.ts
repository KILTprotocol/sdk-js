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
import { credentialSchema, validateStructure } from './KiltCredentialV1'
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
      id: credentialSchema.$id,
      type: 'JsonSchema2023',
    },
  })
  expect(() => validateStructure(VC)).not.toThrow()
})

it('it verifies valid claim against schema', () => {
  expect(() => validateSubject(VC, cType)).not.toThrow()
})

it('it detects schema violations', () => {
  const credentialSubject = { ...VC.credentialSubject, name: 5 }
  expect(() => validateSubject({ ...VC, credentialSubject }, cType)).toThrow()
})

it('detects wrong/invalid ctype being passed in', () => {
  expect(() =>
    validateSubject(VC, {
      ...cType,
      $id: CType.hashToId(randomAsHex()),
    })
  ).toThrow()
})
