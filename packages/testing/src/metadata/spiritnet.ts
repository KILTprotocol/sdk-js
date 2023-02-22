/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { readFileSync } from 'fs'
import path from 'path'
import type { HexString } from '@polkadot/util/types'

const META_PATH = '../../../../augment-api/metadata/spiritnet.json'
const { result: metaHex } = JSON.parse(
  readFileSync(path.join(__dirname, META_PATH), { encoding: 'utf-8' })
)

/* eslint-disable import/no-default-export */
export default metaHex as HexString
