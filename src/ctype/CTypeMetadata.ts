import ICTypeMetadata, { IMetadata } from '../types/CTypeMetadata'
import CType from './CType'
import { WrapperMetadata } from './CTypeSchema'
import * as CTypeUtils from './CTypeUtils'

export default class CTypeMetadata implements ICTypeMetadata {
  public ctypeHash: ICTypeMetadata['ctypeHash']
  public metadata: ICTypeMetadata['metadata']

  public constructor(ctype: CType['hash'], ctypeMetadata: IMetadata) {
    if (!CTypeUtils.verifySchema(CTypeMetadata, WrapperMetadata)) {
      throw new Error('CTypeMetadata does not correspond to schema')
    }
    this.metadata = ctypeMetadata
    this.ctypeHash = ctype
  }
}
