/**
 * @packageDocumentation
 * @module ICType
 */
import IPublicIdentity from './PublicIdentity'
import CType from '../ctype/CType'

export interface ICTypeSchema {
  $id: string
  $schema: string
  title: string
  properties: {
    [key: string]: { $ref?: string; type?: string; format?: string }
  }
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
  ICTypeSchema['title'],
  ICTypeSchema['properties'],
  ICTypeSchema['type']
]

export type CompressedCType = [
  CType['hash'],
  CType['owner'],
  CompressedCTypeSchema
]
