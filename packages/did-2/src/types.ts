/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type {
  DidKey,
  DidServiceEndpoint,
  IDidDetails,
  KeyRelationship,
} from '@kiltprotocol/types'

export type MapKeysToRelationship = Partial<
  Record<KeyRelationship, Set<DidKey['id']>> & { none: Set<DidKey['id']> }
>

export type PublicKeys = Map<DidKey['id'], Omit<DidKey, 'id'>>

export type ServiceEndpoints = Map<
  DidServiceEndpoint['id'],
  Omit<DidServiceEndpoint, 'id'>
>

export type IDidParsingResult = {
  did: IDidDetails['did']
  version: number
  type: 'light' | 'full'
  identifier: string
  fragment?: string
  encodedDetails?: string
}
