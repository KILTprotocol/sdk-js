/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { CType } from '@kiltprotocol/core'
import { randomAsHex } from '@polkadot/util-crypto'
import {
  credentialSchema,
  validateStructure,
  validateSubject,
} from './KiltCredentialV1.js'
import { credential, cType } from './testData.spec.js'

it('credential validates against credential schema', async () => {
  expect(credential).toMatchObject({
    credentialSchema: {
      id: credentialSchema.$id,
      type: 'JsonSchema2023',
    },
  })
  expect(() => validateStructure(credential)).not.toThrow()
})

it('it verifies valid claim against ctype schema', async () => {
  await expect(
    validateSubject(credential, { cTypes: [cType] })
  ).resolves.not.toThrow()
})

it('it detects schema violations', async () => {
  const credentialSubject = { ...credential.credentialSubject, name: 5 }
  await expect(
    validateSubject({ ...credential, credentialSubject }, { cTypes: [cType] })
  ).rejects.toThrow()
})

it('detects wrong/invalid ctype being passed in', async () => {
  await expect(
    validateSubject(credential, {
      cTypes: [
        {
          ...cType,
          $id: CType.hashToId(randomAsHex()),
        },
      ],
    })
  ).rejects.toThrow()
})
