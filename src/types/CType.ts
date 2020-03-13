/**
 * @packageDocumentation
 * @module ICType
 */
import IPublicIdentity from './PublicIdentity'
import CType from '../ctype/CType'

export interface ICTypeSchema {
  $id: any
  $schema: any
  properties: any
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
