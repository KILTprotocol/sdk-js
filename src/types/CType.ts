/**
 * @packageDocumentation
 * @module ICType
 */
import CType from '../ctype/CType'
import IPublicIdentity from './PublicIdentity'

export interface ICTypeSchema {
  $id: string
  $schema: string
  properties: { [key: string]: { type: string; format?: string } }
  type: 'object'
}

export default interface ICType {
  hash: string
  owner: IPublicIdentity['address'] | null
  schema: ICTypeSchema
}

export type CompressedCTypeSchema = [
  ICTypeSchema['$id'],
  ICTypeSchema['$schema'],
  ICTypeSchema['properties'],
  ICTypeSchema['type']
]

export type CompressedCType = [
  CType['hash'],
  CType['owner'],
  CompressedCTypeSchema
]
