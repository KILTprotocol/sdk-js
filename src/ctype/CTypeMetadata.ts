import ICTypeMetadata from '../types/CTypeMetadata'
import { WrapperMetadata } from './CTypeSchema'
import * as CTypeUtils from './CTypeUtils'

export default class CTypeMetadata implements ICTypeMetadata {
  public ctypeHash: ICTypeMetadata['ctypeHash']
  public metadata: ICTypeMetadata['metadata']

  public constructor(
    ctypeHash: ICTypeMetadata['ctypeHash'],
    ctypeMetadata: ICTypeMetadata['metadata']
  ) {
    if (!CTypeUtils.verifySchema(CTypeMetadata, WrapperMetadata)) {
      throw new Error('CTypeMetadata does not correspond to schema')
    }
    this.metadata = ctypeMetadata
    this.ctypeHash = ctypeHash
  }
}
