import { ICtypeMetadata } from '../types/CType'
import CType from './CType'
import { CTypeWrapperModel } from './CTypeSchema'
import * as CTypeUtils from './CTypeUtils'

export default class CTypeMetadata implements ICtypeMetadata {
  public ctypeHash: ICtypeMetadata['ctypeHash']
  public metadata: ICtypeMetadata['metadata']

  public constructor(ctype: CType, ctypeMetadata: CTypeMetadata) {
    if (!CTypeUtils.verifySchema(ctype, CTypeWrapperModel)) {
      console.log(ctypeMetadata, CTypeWrapperModel)
      throw new Error('CTypeMetadata does not correspond to schema')
    }
    this.metadata = ctypeMetadata.metadata
    this.ctypeHash = ctype.hash
  }
}
