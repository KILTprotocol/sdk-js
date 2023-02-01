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

// extends the api augmentation of derives
declare module '@polkadot/api-derive/derive' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  export interface ExactDerive extends DeriveAllSections<typeof allDerives> {}
}
