/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { AnyFunction, DeriveCustom } from '@polkadot/types/types'
import * as credentials from '../credential/derives.js'

const allDerives = {
  credentials,
}

export const derives: DeriveCustom = allDerives

type DeriveSection<Section> = {
  [M in keyof Section]: Section[M] extends AnyFunction
    ? ReturnType<Section[M]>
    : never
}
type DeriveAllSections<AllSections> = {
  [S in keyof AllSections]: DeriveSection<AllSections[S]>
}

declare module '@polkadot/api-derive/derive' {
  // extend, add our custom section
  export interface ExactDerive extends DeriveAllSections<typeof allDerives> {}
}
