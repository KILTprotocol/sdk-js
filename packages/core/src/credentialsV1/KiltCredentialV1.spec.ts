/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { randomAsHex } from '@polkadot/util-crypto'

import * as CType from '../ctype/index.js'
import {
  credential as VC,
  cType,
} from '../../../../tests/testUtils/testData.js'
import {
  credentialSchema,
  validateStructure,
  validateSubject,
} from './KiltCredentialV1.js'

it('exports to VC including ctype as schema', async () => {
  expect(VC).toMatchObject({
    credentialSchema: {
      id: credentialSchema.$id,
      type: 'JsonSchema2023',
    },
  })
  expect(() => validateStructure(VC)).not.toThrow()
})

it('it verifies valid claim against schema', async () => {
  await expect(validateSubject(VC, { cTypes: [cType] })).resolves.not.toThrow()
})

it('it detects schema violations', async () => {
  const credentialSubject = { ...VC.credentialSubject, name: 5 }
  await expect(
    validateSubject({ ...VC, credentialSubject }, { cTypes: [cType] })
  ).rejects.toThrow()
})

it('detects wrong/invalid ctype being passed in', async () => {
  await expect(
    validateSubject(VC, {
      cTypes: [
        {
          ...cType,
          $id: CType.hashToId(randomAsHex()),
        },
      ],
    })
  ).rejects.toThrow()
})
