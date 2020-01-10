import ICTypeMetadata from '../types/CTypeMetadata'
import { MetadataModel } from './CTypeSchema'
import CTypeUtils from './CTypeUtils'

export default class CTypeMetadata implements ICTypeMetadata {
  public ctypeHash: ICTypeMetadata['ctypeHash']
  public metadata: ICTypeMetadata['metadata']

  public constructor(metdata: ICTypeMetadata) {
    if (!CTypeUtils.verifySchema(metdata, MetadataModel)) {
      throw new Error('CTypeMetadata does not correspond to schema')
    }
    this.metadata = metdata.metadata
    this.ctypeHash = metdata.ctypeHash
  }
}
